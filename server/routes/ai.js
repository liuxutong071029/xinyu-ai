// 心屿 MindIsle v5 · AI 模块路由（AI 人格 / 聊天 / 历史 / 教师助手）
// POST /api/chat 流程（需求逐条对应）：
//   读取用户历史聊天/最近测评/情绪数据 → 调用 GPT/API（无 key 用内置规则 mock）
//   → 情绪识别输出 emotion(压力/焦虑/开心/低落) + risk(normal/attention/high)
//   → 记忆引用（"之前你提到考试压力，最近有没有改善？"）
//   → 返回回复 → 保存聊天记录 + 顺带写 emotion_records + user_behavior
//   高风险 notice = "建议寻求专业帮助。AI 不能替代专业诊断。"（附 12356）
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, needRole, badRequest, store, logBehavior, AI, callChat, aiConfigured } = ctx;

  const PERSONALITY_TYPES = ['温柔倾听型', '鼓励成长型', '理性分析型'];
  // 聊天情绪 → emotion_records 情绪域映射（emotion_records 域：开心/平静/焦虑/低落/疲惫）
  const EMOTION_MAP = { '压力': '焦虑', '焦虑': '焦虑', '低落': '低落', '开心': '开心', '疲惫': '疲惫', '平静': '平静', '孤独': '低落' };
  const NOTICE_HIGH = '建议寻求专业帮助。AI 不能替代专业诊断。如需紧急支持，请拨打全国心理援助热线 12356。';

  /* ---- POST /api/ai/create 保存用户选择的 AI 类型（学生） ---- */
  route('POST', '/api/ai/create', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const b = await readBody(req);
    let t = typeof b.personality_type === 'string' ? b.personality_type : '';
    if (t === '温暖倾听型') t = '温柔倾听型'; // 旧前端别名兼容
    if (!PERSONALITY_TYPES.includes(t)) return badRequest(res, 'personality_type 需为：温柔倾听型/鼓励成长型/理性分析型');
    let row = await store.get('ai_personality', { user_id: u.id });
    if (row) row = await store.update('ai_personality', row.id, { personality_type: t });
    else row = await store.insert('ai_personality', { user_id: u.id, personality_type: t });
    json(res, 200, { personality: row });
  });

  /* ---- GET /api/ai/profile ---- */
  route('GET', '/api/ai/profile', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    const row = await store.get('ai_personality', { user_id: u.id });
    json(res, 200, { personality: row || { personality_type: '温柔倾听型' } });
  });

  /* ---- POST /api/chat 核心接口 ---- */
  route('POST', '/api/chat', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const b = await readBody(req);
    const text = typeof b.message === 'string' ? b.message.trim() : '';
    if (!text) return badRequest(res, '消息不能为空');
    if (text.length > 2000) return badRequest(res, '消息过长（≤2000字）');

    // 1) 读取上下文：历史聊天 / 最近测评 / 情绪数据 / AI 人格
    const chatRows = await store.list('chat_records', { user_id: u.id });
    chatRows.sort((a, b) => a.id - b.id);
    const history = chatRows.slice(-12);
    const assAll = await store.list('assessments', { user_id: u.id });
    const assessments = assAll.sort((a, b) => b.id - a.id).slice(0, 5);
    const emoAll = await store.list('emotion_records', { user_id: u.id });
    const emotions = emoAll.sort((a, b) => b.id - a.id).slice(0, 20);
    const personality = (await store.get('ai_personality', { user_id: u.id })) || { personality_type: '温柔倾听型' };

    // 2) 情绪识别 + 风险分级（永远走规则，不交给 LLM 自由发挥）
    const emo = AI.detectEmotion(text);
    const risk = AI.riskOf(text);

    // 3) 记忆回问（永远走规则：从最近 8 条用户消息提取主题）
    const ask = AI.memoryAsk(history.map(h => ({ role: 'user', content: h.message })));

    // 4) 回复生成：normal 走 LLM（已配置时）；high/attention 强制规则话术（安全兜底）
    let reply = null, source = 'rule', memoryUsed = false;
    if (risk === 'normal' && aiConfigured) {
      const histMsgs = history.flatMap(h => [{ role: 'user', content: h.message }, { role: 'assistant', content: h.response }]);
      const ctxLines = [];
      if (assessments.length) ctxLines.push('最近测评：' + assessments.map(a => a.type + ' ' + a.score + '分(' + a.level + ')').join('；'));
      if (emotions.length) ctxLines.push('最近情绪打卡：' + emotions.slice(0, 5).map(e => e.emotion + (e.pressure ? '/压力' + e.pressure : '')).join('、'));
      let sys = '你是心屿，面向青少年的 AI 心理陪伴助手，人格：' + personality.personality_type + '。原则：1.共情优先，先接住情绪再给建议；2.不诊断、不开药、不做心理治疗，只做倾听与轻量引导；3.用户出现自伤/自杀信号时立即建议联系专业帮助（12356、学校心理中心）；4.结合上下文记忆自然引用过往话题；5.回应温暖简洁（120字内）。';
      if (ctxLines.length) sys += '\n【用户上下文】' + ctxLines.join('\n');
      if (ask) sys += '\n【记忆提示】用户在过往对话中提过相关话题，请在回复开头自然引用（例如："' + ask + '"）。';
      const llmReply = await callChat({ messages: [{ role: 'system', content: sys }, ...histMsgs, { role: 'user', content: text }] });
      if (llmReply) {
        reply = llmReply;
        source = 'llm';
        memoryUsed = ask ? /之前|上次|以前|提过/.test(llmReply) : false;
      }
    }
    if (!reply) {
      if (risk === 'high') reply = AI.CRISIS_REPLY[Math.floor(Math.random() * AI.CRISIS_REPLY.length)];
      else if (risk === 'attention') reply = AI.ATTENTION_REPLY[Math.floor(Math.random() * AI.ATTENTION_REPLY.length)];
      else {
        const base = AI.replyFor(emo.emotion, text);
        if (ask) { reply = '我注意到：' + ask + '\n\n' + base; memoryUsed = true; }
        else reply = base;
      }
    }

    // 5) 保存聊天记录 + 顺带写 emotion_records（source=AI聊天）+ user_behavior（聊天）
    const rec = await store.insert('chat_records', { user_id: u.id, message: text, response: reply, emotion: emo.emotion, risk_level: risk });
    const emoStored = EMOTION_MAP[emo.emotion] || '平静';
    const pressure = risk === 'high' ? '高' : (['压力', '焦虑', '低落'].includes(emo.emotion) ? '中' : '低');
    await store.insert('emotion_records', { user_id: u.id, emotion: emoStored, pressure, source: 'AI聊天' }).catch(e => console.warn('[心屿] emotion_records 写入失败:', e.message));
    logBehavior(u.id, '聊天');

    json(res, 200, {
      reply,
      emotion: emo.emotion,
      confidence: emo.confidence,
      risk_level: risk,
      source,
      memory_used: memoryUsed,
      memory: memoryUsed,          // 旧前端兼容字段
      record_id: rec.id,
      notice: risk === 'high' ? NOTICE_HIGH : null
    });
  });

  /* ---- GET /api/chat/history 本人最近 50 条 ---- */
  route('GET', '/api/chat/history', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const rows = await store.query('chat_records', { filters: { user_id: u.id }, order: 'id.desc', limit: 50 });
    json(res, 200, { records: rows });
  });

  /* ---- POST /api/ai/teacher-assistant 教师助手（学校/社区） ---- */
  route('POST', '/api/ai/teacher-assistant', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['school', 'community'], res)) return;
    const b = await readBody(req);
    const situation = typeof b.situation === 'string' ? b.situation.trim() : '';
    if (!situation) return badRequest(res, '请描述学生情况');
    if (situation.length > 500) return badRequest(res, '描述过长（≤500字）');
    const result = AI.teacherAssistant(situation);
    if (aiConfigured) {
      const sys = '你是心屿的 AI 教师助手，面向学校老师与社区工作者。输入学生情况描述，输出结构化沟通建议：沟通方式（2-3条）+ 表达建议（1-2条示例话术）+ 注意事项（1-2条）。若涉及自伤/自杀信号，必须建议立即联系心理老师或拨打 12356。不诊断。';
      const llm = await callChat({ messages: [{ role: 'system', content: sys }, { role: 'user', content: situation }], maxTokens: 800 });
      if (llm) {
        json(res, 200, { matched: 'AI生成', crisis: result.crisis, sections: llm.split(/\n+/).filter(Boolean).slice(0, 8), source: 'llm' });
        return;
      }
    }
    json(res, 200, Object.assign({ source: 'rule' }, result));
  });
};
