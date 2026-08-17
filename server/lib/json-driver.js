// 心屿 MindIsle v5 · 本地 JSON 文件存储（mock 模式）
// 单文件 server/data/db.json，9 张表与 Supabase schema 逐字段对齐；
// 首次启动时若文件不存在，自动写入演示种子数据（见 ../seed.js），保证开箱可演示。
const fs = require('fs');
const path = require('path');
const { DB_FILE, DATA_DIR } = require('../config');

let cache = null; // { users: [...], schools: [...], ... }

const TABLES = ['users', 'schools', 'ai_personality', 'chat_records', 'assessments',
  'emotion_records', 'family_bindings', 'tree_hole', 'user_behavior'];

function now() { return new Date().toISOString(); }

function ensure() {
  if (cache) return;
  if (!fs.existsSync(DB_FILE)) {
    // 首启自动播种：demo123456 演示账号等，与 001_init.sql 种子口径一致
    const { buildDb } = require('../seed');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = buildDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('[心屿] mock 存储: 已自动生成演示数据 server/data/db.json');
  }
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    cache = {};
  }
  TABLES.forEach(t => { if (!Array.isArray(cache[t])) cache[t] = []; });
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function nextId(rows) {
  return rows.length ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
}

function matches(row, filters) {
  return Object.keys(filters || {}).every(k => row[k] === filters[k]);
}

const driver = {
  mode: 'json',
  storageName: '本地 JSON 文件（mock 模式）',

  async init() {
    ensure();
    return { ok: true, mode: 'json' };
  },

  async all(table) {
    ensure();
    return (cache[table] || []).slice();
  },

  // 等值过滤（对应 Supabase REST 的 eq 查询参数）
  async list(table, filters) {
    ensure();
    return (cache[table] || []).filter(r => matches(r, filters));
  },

  // 列表 + 排序 + 限量（对应 REST 的 order/limit）
  async query(table, { filters, order, limit } = {}) {
    ensure();
    let rows = (cache[table] || []).filter(r => matches(r, filters));
    if (order) {
      const [field, dir] = String(order).split('.');
      rows.sort((a, b) => {
        const av = a[field], bv = b[field];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return dir === 'desc' ? -cmp : cmp;
      });
    }
    if (limit) rows = rows.slice(0, limit);
    return rows;
  },

  async get(table, filters) {
    ensure();
    return (cache[table] || []).find(r => matches(r, filters)) || null;
  },

  async insert(table, row) {
    ensure();
    const rows = cache[table] || (cache[table] = []);
    const rec = Object.assign({}, row);
    if (rec.id === undefined || rec.id === null) rec.id = nextId(rows);
    if (rec.created_time === undefined) rec.created_time = now();
    rows.push(rec);
    save();
    return Object.assign({}, rec);
  },

  async update(table, id, patch) {
    ensure();
    const rows = cache[table] || [];
    const i = rows.findIndex(r => Number(r.id) === Number(id));
    if (i < 0) return null;
    rows[i] = Object.assign({}, rows[i], patch);
    save();
    return Object.assign({}, rows[i]);
  },

  async remove(table, filters) {
    ensure();
    const rows = cache[table] || [];
    const keep = rows.filter(r => !matches(r, filters));
    cache[table] = keep;
    save();
    return rows.length - keep.length;
  },

  async count(table, filters) {
    ensure();
    return (cache[table] || []).filter(r => matches(r, filters)).length;
  },

  // 仅种子脚本使用
  resetAll() {
    cache = null;
    TABLES.forEach(t => { cache = cache || {}; cache[t] = []; });
    save();
  }
};

module.exports = driver;
