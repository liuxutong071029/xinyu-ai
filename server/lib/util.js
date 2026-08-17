// 心屿 MindIsle v5 · 通用工具（HTTP 响应 / 请求体 / 输入校验）
const http = require('http');

/* ---------- JSON 响应（统一 CORS，UTF-8） ---------- */
function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

/* ---------- 请求体读取（上限 1MB） ---------- */
function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e6) { req.destroy(); resolve(null); }
    });
    req.on('end', () => {
      if (raw === null || raw === '') return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

/* ---------- 输入校验小工具 ---------- */
const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;

function isStr(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && (max === undefined || v.length <= max);
}
function isInt(v, min, max) {
  return Number.isInteger(v) && v >= (min === undefined ? -1e9 : min) && v <= (max === undefined ? 1e9 : max);
}
function oneOf(v, list) { return list.includes(v); }
function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function badRequest(res, msg) { json(res, 400, { error: msg }); }
function unauthorized(res, msg) { json(res, 401, { error: msg || '未登录或登录已过期' }); }
function forbidden(res, msg) { json(res, 403, { error: msg || '无权限访问该功能' }); }
function notFound(res, msg) { json(res, 404, { error: msg || '资源不存在' }); }
function conflict(res, msg) { json(res, 409, { error: msg || '资源冲突' }); }
function serverError(res, e) {
  console.error('[心屿] 服务器内部错误:', e && e.message ? e.message : e);
  json(res, 500, { error: '服务器内部错误' });
}

module.exports = {
  json, readBody, isStr, isInt, oneOf, toInt,
  USERNAME_RE,
  badRequest, unauthorized, forbidden, notFound, conflict, serverError
};
