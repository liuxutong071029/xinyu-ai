// 心屿 MindIsle v5 · 存储选择器
// SUPABASE_URL + SUPABASE_SERVICE_KEY 都配置 → Supabase REST；
// 缺任一/连通性检查失败 → 自动降级本地 JSON mock（保证比赛演示能跑）。
const jsonDriver = require('./json-driver');
const supabaseDriver = require('./supabase-driver');
const { storageMode } = require('../config');

let store = null;

async function initStore() {
  if (store) return store;
  if (storageMode() === 'supabase') {
    const check = await supabaseDriver.init();
    if (check.ok) {
      store = supabaseDriver;
      return store;
    }
    console.warn('[心屿] Supabase 连通性检查失败，自动降级本地 JSON mock 模式：', check.error || '');
  }
  await jsonDriver.init();
  store = jsonDriver;
  return store;
}

module.exports = { initStore, getStore: () => store };
