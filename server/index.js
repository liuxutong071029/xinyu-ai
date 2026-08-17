// ============================================================
// 心屿 MindIsle v5 · 后端 API 服务器入口（零外部依赖）
// 启动：node index.js
// 仅用 Node 内置 http/crypto/fs/path + Node 22 全局 fetch；无需 npm install。
// 存储：SUPABASE_URL + SUPABASE_SERVICE_KEY 都配置 → Supabase REST；
//       否则 → 本地 JSON mock（server/data/db.json，首次启动自动播种演示数据）。
// AI：  AI_API_KEY 配置 → OpenAI 兼容接口；否则 → 内置规则式 mock 回复。
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const util = require('./lib/util');
const { sha256, signToken, verifyToken } = require('./lib/auth');
const { initStore, getStore } = require('./lib/store');
const AI = require('./lib/ai-engine');
const { callChat } = require('./lib/llm');

const { json, readBody } = util;
const PORT = config.env.PORT;

/* ================= 路由表 ================= */
const routes = [];
function route(method, pattern, handler) { routes.push({ method, pattern, handler }); }

/* ================= 权限与上下文辅助 ================= */
const ALLOWED_ACTIONS = ['登录', '聊天', '测评', '训练', '发布树洞', '注册', '情绪打卡'];
const ACTION_ALIAS = { '训练或互动': '训练', '互动': '训练', '课程学习': '训练', '情绪打卡': '情绪打卡' };

function normalizeAction(action) {
  let a = String(action || '').trim();
  if (ACTION_ALIAS[a]) a = ACTION_ALIAS[a];
  return ALLOWED_ACTIONS.includes(a) ? a : null;
}

async function logBehavior(userId, action) {
  const a = normalizeAction(action);
  if (!a) { console.warn('[心屿] 忽略未知行为类型: ' + action); return null; }
  try {
    return await getStore().insert('user_behavior', { user_id: userId, action: a });
  } catch (e) {
    console.warn('[心屿] user_behavior 写入失败:', e.message);
    return null;
  }
}

function tokenFrom(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

async function needAuth(req, res) {
  const payload = verifyToken(tokenFrom(req));
  if (!payload) { util.unauthorized(res); return null; }
  const u = await getStore().get('users', { id: payload.uid });
  if (!u) { util.unauthorized(res, '用户不存在'); return null; }
  return u;
}

function needRole(u, roles, res) {
  if (!roles.includes(u.role)) { util.forbidden(res); return false; }
  return true;
}

async function publicUser(u) {
  let schoolName = '';
  if (u.school_id) {
    const sch = await getStore().get('schools', { id: u.school_id });
    schoolName = sch ? sch.school_name : '';
  }
  return {
    id: u.id, username: u.username, nickname: u.nickname, role: u.role,
    age: u.age || '', gender: u.gender || '', region: u.region || '',
    school_id: u.school_id || null, school_name: schoolName,
    avatar: u.avatar || '', created_time: u.created_time
  };
}

async function ensureSchool(u, schoolName) {
  const region = u.region || '';
  let sch = await getStore().get('schools', { school_name: schoolName, region });
  if (!sch) {
    sch = await getStore().insert('schools', { school_name: schoolName, region, student_count: 0 });
  }
  return Object.assign({}, u, { school_id: sch.id });
}

const ctx = {
  route, json, readBody, needAuth, needRole, logBehavior, publicUser, ensureSchool,
  store: null, AI, callChat,
  sha256, signToken, verifyToken,
  USERNAME_RE: util.USERNAME_RE, util,
  badRequest: util.badRequest, unauthorized: util.unauthorized, forbidden: util.forbidden,
  notFound: util.notFound, conflict: util.conflict,
  aiConfigured: !!config.env.AI_API_KEY
};

/* ================= 挂载业务路由（在 initStore 之后执行，见文件底部 bootstrap） ================= */
function mountRoutes(store) {
  ctx.store = store;

  route('GET', '/api/health', async (req, res) => {
    json(res, 200, {
      ok: true,
      service: 'xinyu-mindisle-v5-api',
      version: '5.0.0',
      time: new Date().toISOString(),
      storage: store.mode,
      ai: config.aiMode() === 'openai' ? ('openai:' + config.env.AI_MODEL) : 'mock'
    });
  });

  require('./routes/auth')(ctx);
  require('./routes/ai')(ctx);
  require('./routes/assessment')(ctx);
  require('./routes/treehole')(ctx);
  require('./routes/family')(ctx);
  require('./routes/stats')(ctx);
  require('./routes/behavior')(ctx);
}

/* ================= 静态托管（可选：STATIC_DIR 或自动探测 ../work） ================= */
function resolveStaticDir() {
  if (config.env.STATIC_DIR) return path.resolve(config.env.STATIC_DIR);
  const candidates = [
    path.join(__dirname, '..', 'work'),   // 比赛交付：server 与 work/ 平级
    path.join(__dirname, '..', 'src')
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  return null;
}
const STATIC_DIR = resolveStaticDir();

function serveStatic(req, res, urlPath) {
  if (!STATIC_DIR) return json(res, 404, { error: 'not found' });
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const safe = path.normalize(rel).replace(/^(\.\.[\/\\])+/, '');
  const file = path.join(STATIC_DIR, safe);
  if (!file.startsWith(STATIC_DIR)) return json(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'not found' });
  const ext = path.extname(file).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.mp3': 'audio/mpeg'
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

/* ================= HTTP 服务器 ================= */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }
  for (const r of routes) {
    if (r.method === req.method && p === r.pattern) {
      req._query = url.searchParams;
      try {
        await r.handler(req, res);
      } catch (e) {
        util.serverError(res, e);
      }
      return;
    }
  }
  if (p.startsWith('/api/')) return json(res, 404, { error: '接口不存在' });
  if (req.method === 'GET') return serveStatic(req, res, p);
  json(res, 405, { error: 'method not allowed' });
});

/* ================= 启动 ================= */
(async () => {
  const store = await initStore();
  mountRoutes(store);
  server.listen(PORT, () => {
    console.log('==============================================');
    console.log('  心屿 MindIsle v5 API 已启动: http://localhost:' + PORT);
    console.log('  存储模式: ' + store.storageName + ' (' + store.mode + ')');
    console.log('  AI 模式 : ' + (config.aiMode() === 'openai'
      ? '真实大模型（' + config.env.AI_BASE_URL + ' / ' + config.env.AI_MODEL + '）'
      : '内置规则式 mock（未配置 AI_API_KEY，演示可用）'));
    if (STATIC_DIR) console.log('  静态托管: ' + STATIC_DIR);
    else console.log('  静态托管: 未启用（未找到 work/ 或 src/，纯 API 模式）');
    console.log('==============================================');
  });
})().catch(e => {
  console.error('[心屿] 启动失败:', e);
  process.exit(1);
});
