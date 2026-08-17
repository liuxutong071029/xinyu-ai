// 心屿 MindIsle v5 · 用户行为台账路由
// action 域（与 001_init.sql CHECK 一致）：
//   需求枚举：登录/聊天/测评/训练/发布树洞 + 系统补充：注册/情绪打卡
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, badRequest, store, logBehavior } = ctx;

  /* ---- POST /api/behavior 上报行为（如训练） ---- */
  route('POST', '/api/behavior', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    const b = await readBody(req);
    const action = typeof b.action === 'string' ? b.action.trim() : '';
    if (!action) return badRequest(res, 'action 必填');
    const rec = await logBehavior(u.id, action);
    if (!rec) return badRequest(res, '不支持的行为类型（支持：登录/聊天/测评/训练/发布树洞/注册/情绪打卡）');
    json(res, 200, { ok: true, behavior: rec });
  });

  /* ---- GET /api/behavior 本人最近 100 条 ---- */
  route('GET', '/api/behavior', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    const rows = await store.query('user_behavior', { filters: { user_id: u.id }, order: 'id.desc', limit: 100 });
    json(res, 200, { records: rows });
  });
};
