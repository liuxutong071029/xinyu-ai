// 心屿 MindIsle v5 · 树洞路由（匿名展示：对外不含 user_id）
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, needRole, badRequest, store, logBehavior, AI } = ctx;

  function anon(r) {
    return { id: r.id, content: r.content, emotion: r.emotion, risk_level: r.risk_level, created_time: r.created_time };
  }

  /* ---- POST /api/tree-hole 发布树洞 ---- */
  route('POST', '/api/tree-hole', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const b = await readBody(req);
    const content = typeof b.content === 'string' ? b.content.trim() : '';
    if (!content) return badRequest(res, '内容不能为空');
    if (content.length > 500) return badRequest(res, '内容过长（≤500字）');
    const emo = AI.detectEmotion(content);
    const risk = AI.riskOf(content);
    const rec = await store.insert('tree_hole', { user_id: u.id, content, emotion: emo.emotion, risk_level: risk });
    logBehavior(u.id, '发布树洞');
    json(res, 200, { tree_hole: anon(rec), anonymous: true });
  });

  /* ---- GET /api/tree-hole 本人发布记录 ---- */
  route('GET', '/api/tree-hole', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const rows = await store.query('tree_hole', { filters: { user_id: u.id }, order: 'id.desc' });
    json(res, 200, { records: rows.map(anon) });
  });

  /* ---- GET /api/tree-hole/feed 公开匿名流（不含 user_id，倒序 50 条） ---- */
  route('GET', '/api/tree-hole/feed', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['student'], res)) return;
    const rows = await store.query('tree_hole', { order: 'id.desc', limit: 50 });
    json(res, 200, { records: rows.map(anon) });
  });
};
