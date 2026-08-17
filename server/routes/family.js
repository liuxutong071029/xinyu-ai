// 心屿 MindIsle v5 · 家庭绑定路由
// 权限边界：家长只能看绑定孩子的心理趋势/情绪变化/AI 建议；
// 不含 AI 聊天内容（chat_records）与树洞（tree_hole）与私密记录。
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, needRole, badRequest, notFound, conflict, store, logBehavior, AI } = ctx;

  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /* ---- POST /api/family/generate 学生生成 8 位邀请码 ---- */
  route('POST', '/api/family/generate', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    let row = await store.get('family_bindings', { student_id: u.id, status: 'active' });
    if (row) { json(res, 200, { invite_code: row.invite_code, binding: row }); return; }
    // 生成唯一邀请码（最多尝试 10 次）
    let code = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      code = '';
      for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!(await store.get('family_bindings', { invite_code: code }))) break;
      code = '';
    }
    if (!code) return json(res, 500, { error: '邀请码生成失败，请重试' });
    row = await store.insert('family_bindings', { student_id: u.id, parent_id: null, invite_code: code, status: 'active' });
    json(res, 200, { invite_code: row.invite_code, binding: row });
  });

  /* ---- POST /api/family/bind 家长凭邀请码绑定孩子 ---- */
  route('POST', '/api/family/bind', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['parent'], res)) return;
    const b = await readBody(req);
    const code = typeof b.invite_code === 'string' ? b.invite_code.trim().toUpperCase() : '';
    if (!code) return badRequest(res, '邀请码必填');
    const row = await store.get('family_bindings', { invite_code: code });
    if (!row || row.status !== 'active') return notFound(res, '邀请码无效或已失效');
    if (row.parent_id && Number(row.parent_id) !== Number(u.id)) return conflict(res, '该邀请码已被其他家长绑定');
    const updated = await store.update('family_bindings', row.id, { parent_id: u.id });
    json(res, 200, { binding: updated });
  });

  /* ---- GET /api/family/status 绑定状态（学生/家长） ---- */
  route('GET', '/api/family/status', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    const mine = u.role === 'student'
      ? await store.list('family_bindings', { student_id: u.id, status: 'active' })
      : await store.list('family_bindings', { parent_id: u.id, status: 'active' });
    json(res, 200, { bindings: mine });
  });

  /* ---- GET /api/family/child 家长查看孩子：趋势/情绪/测评摘要/AI 建议（无聊天/树洞） ---- */
  route('GET', '/api/family/child', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['parent'], res)) return;
    const bind = await store.get('family_bindings', { parent_id: u.id, status: 'active' });
    if (!bind) return json(res, 200, { bound: false });
    const child = await store.get('users', { id: bind.student_id });
    if (!child) return json(res, 200, { bound: false });

    // 只取聚合：情绪趋势（近 30 条）/ 测评摘要（各类型最新）/ AI 建议；不返回聊天与树洞
    const emos = await store.query('emotion_records', { filters: { user_id: child.id }, order: 'id.desc', limit: 30 });
    const ass = await store.query('assessments', { filters: { user_id: child.id }, order: 'id.desc' });
    const latest = {};
    ass.forEach(a => { if (!latest[a.type] || a.id > latest[a.type].id) latest[a.type] = a; });
    const emoDist = {};
    emos.forEach(e => { emoDist[e.emotion] = (emoDist[e.emotion] || 0) + 1; });
    // 风险口径仅来自测评分级（不读取聊天内容，保护孩子隐私）
    const latestList = Object.values(latest).map(a => ({ type: a.type, score: a.score, level: a.level }));
    const childRisk = latestList.some(l => /中|重/.test(l.level || '')) ? 'attention' : 'normal';
    const advice = AI.portraitAdvice({ nickname: child.nickname, latest: latestList, emotions: emos, risk: childRisk });
    const school = child.school_id ? await store.get('schools', { id: child.school_id }) : null;

    json(res, 200, {
      bound: true,
      child: {
        nickname: child.nickname,
        username: child.username,
        school_name: school ? school.school_name : '',
        created_time: child.created_time
      },
      emotion_trend: emos.slice().reverse().map(e => ({ emotion: e.emotion, pressure: e.pressure, date: e.created_time })),
      emotion_distribution: emoDist,
      assessments: Object.values(latest).map(a => ({ type: a.type, score: a.score, level: a.level, date: a.created_time })),
      advice
    });
  });
};
