// 心屿 MindIsle v5 · Supabase REST 驱动（PostgREST）
// 零第三方依赖：只用 Node 22 全局 fetch。
// 使用 SUPABASE_SERVICE_KEY（service_role）：service_role 绕过 RLS，
// 与 001_init.sql 中 RLS 策略一一对应的权限边界由服务端路由守卫实现。
const { env } = require('../config');

const TIMEOUT_MS = 8000;

function restUrl(table, params) {
  const u = new URL(env.SUPABASE_URL + '/rest/v1/' + table);
  (params || []).forEach(([k, v]) => u.searchParams.append(k, v));
  return u.toString();
}

function headers(extra) {
  return Object.assign({
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}

async function rest(method, table, { params, body, extraHeaders } = {}) {
  const resp = await fetch(restUrl(table, params), {
    method,
    headers: headers(extraHeaders),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!resp.ok) {
    const msg = (data && (data.message || data.error)) || ('HTTP ' + resp.status);
    const err = new Error('Supabase ' + method + ' ' + table + ' 失败: ' + msg);
    err.status = resp.status;
    throw err;
  }
  return data;
}

// 归一化：PostgREST 单行写入返回对象，多行/更新返回数组，统一为数组
function toArray(x) {
  if (x === null || x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

function eqParams(filters) {
  return Object.keys(filters || {}).map(k => [k, 'eq.' + filters[k]]);
}

const driver = {
  mode: 'supabase',
  storageName: 'Supabase REST（PostgREST）',

  async init() {
    // 连通性检查：能列出 users 即视为可用
    try {
      await rest('GET', 'users', { params: [['select', 'id'], ['limit', '1']] });
      return { ok: true, mode: 'supabase' };
    } catch (e) {
      return { ok: false, mode: 'supabase', error: e.message };
    }
  },

  async all(table) {
    const rows = await rest('GET', table, { params: [['select', '*']] });
    return toArray(rows);
  },

  async list(table, filters) {
    const params = [['select', '*']].concat(eqParams(filters));
    const rows = await rest('GET', table, { params });
    return toArray(rows);
  },

  async query(table, { filters, order, limit } = {}) {
    const params = [['select', '*']].concat(eqParams(filters));
    if (order) params.push(['order', order]);
    if (limit) params.push(['limit', String(limit)]);
    const rows = await rest('GET', table, { params });
    return toArray(rows);
  },

  async get(table, filters) {
    const rows = await driver.list(table, filters);
    return rows[0] || null;
  },

  async insert(table, row) {
    const body = Object.assign({}, row);
    // 让数据库生成默认 created_time（调用方未提供时）
    if (body.created_time === undefined) delete body.created_time;
    const out = await rest('POST', table, {
      body,
      extraHeaders: { 'Prefer': 'return=representation' }
    });
    const rows = toArray(out);
    return rows[0] || body;
  },

  async update(table, id, patch) {
    const out = await rest('PATCH', table, {
      params: [['id', 'eq.' + id]],
      body: patch,
      extraHeaders: { 'Prefer': 'return=representation' }
    });
    const rows = toArray(out);
    return rows[0] || null;
  },

  async remove(table, filters) {
    await rest('DELETE', table, { params: eqParams(filters) });
    return 0; // PostgREST 不返回删除数（演示规模下无需精确值）
  },

  async count(table, filters) {
    const rows = await driver.list(table, filters);
    return rows.length;
  },

  resetAll() {
    throw new Error('Supabase 模式不支持 resetAll（演示种子数据请执行 001_init.sql）');
  }
};

module.exports = driver;
