// 心屿 MindIsle v5 · 测评 / 情绪打卡 / 心理成长画像路由
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, needRole, badRequest, store, logBehavior, AI } = ctx;

  const ASSESS_TYPES = ['PHQ-9', 'GAD-7', '压力测试', '孤独感测试', '睡眠测试'];
  const EMOTIONS = ['开心', '平静', '焦虑', '低落', '疲惫'];
  const EMOTION_ALIAS = { '孤独': '低落' };                 // 旧前端打卡的「孤独」并入「低落」（emotion_records 域无孤独）
  const PRESSURES = { '低': '低', '中': '中', '高': '高', 'low': '低', 'medium': '中', 'high': '高' };
  const SOURCES = ['每日打卡', 'AI聊天', '心理测评'];

  /* ---- POST /api/assessments 保存测评 ---- */
  route('POST', '/api/assessments', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const b = await readBody(req);
    if (!ASSESS_TYPES.includes(b.type)) return badRequest(res, 'type 需为：PHQ-9/GAD-7/压力测试/孤独感测试/睡眠测试');
    if (!Number.isInteger(b.score) || b.score < 0 || b.score > 100) return badRequest(res, 'score 需为 0-100 的整数');
    const rec = await store.insert('assessments', {
      user_id: u.id,
      type: b.type,
      score: b.score,
      level: typeof b.level === 'string' ? b.level.slice(0, 50) : '',
      result: typeof b.result === 'string' ? b.result.slice(0, 500) : ''
    });
    // 测评事件顺带记录一条情绪（source=心理测评），供趋势聚合
    await store.insert('emotion_records', { user_id: u.id, emotion: '平静', pressure: '中', source: '心理测评' })
      .catch(e => console.warn('[心屿] emotion_records 写入失败:', e.message));
    logBehavior(u.id, '测评');
    json(res, 200, { assessment: rec });
  });

  /* ---- GET /api/assessments 本人测评记录 ---- */
  route('GET', '/api/assessments', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const rows = await store.query('assessments', { filters: { user_id: u.id }, order: 'id.desc' });
    json(res, 200, { records: rows });
  });

  /* ---- POST /api/emotions 情绪打卡 ---- */
  route('POST', '/api/emotions', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const b = await readBody(req);
    let emotion = typeof b.emotion === 'string' ? b.emotion : '';
    if (EMOTION_ALIAS[emotion]) emotion = EMOTION_ALIAS[emotion];
    if (!EMOTIONS.includes(emotion)) return badRequest(res, 'emotion 需为：开心/平静/焦虑/低落/疲惫');
    const pressureRaw = typeof b.pressure === 'string' ? b.pressure : '中';
    const pressure = PRESSURES[pressureRaw] || '中';
    let source = b.source === undefined || b.source === '' ? '每日打卡' : b.source;
    if (!SOURCES.includes(source)) return badRequest(res, 'source 需为：每日打卡/AI聊天/心理测评');
    const rec = await store.insert('emotion_records', { user_id: u.id, emotion, pressure, source });
    logBehavior(u.id, '情绪打卡');
    json(res, 200, { emotion_record: rec });
  });

  /* ---- GET /api/emotions 本人情绪记录 ---- */
  route('GET', '/api/emotions', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const rows = await store.query('emotion_records', { filters: { user_id: u.id }, order: 'id.desc' });
    json(res, 200, { records: rows });
  });

  /* ---- GET /api/portrait 心理成长画像 + AI 建议 ---- */
  route('GET', '/api/portrait', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const ass = await store.list('assessments', { user_id: u.id });
    const emos = await store.list('emotion_records', { user_id: u.id });
    const chats = await store.list('chat_records', { user_id: u.id });
    const latest = {};
    ass.forEach(a => { if (!latest[a.type] || a.id > latest[a.type].id) latest[a.type] = a; });
    const latestList = Object.values(latest).map(a => ({ type: a.type, score: a.score, level: a.level }));
    const emotionCount = {};
    emos.forEach(e => { emotionCount[e.emotion] = (emotionCount[e.emotion] || 0) + 1; });
    const chatEmotions = {};
    chats.forEach(c => { chatEmotions[c.emotion] = (chatEmotions[c.emotion] || 0) + 1; });
    let maxRisk = 'normal';
    chats.forEach(c => { if (c.risk_level === 'high') maxRisk = 'high'; else if (c.risk_level === 'attention' && maxRisk === 'normal') maxRisk = 'attention'; });
    const advice = AI.portraitAdvice({ nickname: u.nickname, latest: latestList, emotions: emos.slice(-30), risk: maxRisk, chatEmotions });
    json(res, 200, {
      portrait: {
        nickname: u.nickname,
        latest_assessments: latestList,
        emotion_records: emos.slice(-30),
        emotion_distribution: emotionCount,
        chat_emotion_distribution: chatEmotions,
        risk: maxRisk,
        assessment_count: ass.length,
        chat_count: chats.length
      },
      advice
    });
  });
};
