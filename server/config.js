// 心屿 MindIsle v5 · 运行配置（环境变量解析）
// 零外部依赖：只用 Node 内置模块
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SECRET_FILE = path.join(DATA_DIR, 'secret.txt');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const env = {
  // 服务端口（默认 3001，与旧版 MVP 前端 XINYU_API_BASE 约定一致）
  PORT: parseInt(process.env.PORT || '3001', 10) || 3001,

  // HMAC token 密钥：未设置时自动生成并持久化到 server/data/secret.txt（重启不失效）
  JWT_SECRET: process.env.JWT_SECRET || '',

  // Supabase（PostgREST REST）。两者都配置 → Supabase 模式；否则 → 本地 JSON mock 模式
  SUPABASE_URL: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',

  // AI：OpenAI 兼容接口（AI_API_KEY 配置 → 真实大模型；否则 → 内置规则式 mock 回复）
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_BASE_URL: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o-mini',

  // 静态托管目录（默认自动探测 ../work，不存在则纯 API 模式）
  STATIC_DIR: process.env.STATIC_DIR || '',

  // token 有效期（默认 7 天）
  TOKEN_TTL_MS: 7 * 24 * 3600 * 1000
};

// 存储模式：'supabase' | 'json'
function storageMode() {
  return (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) ? 'supabase' : 'json';
}

// AI 模式：'openai' | 'mock'
function aiMode() {
  return env.AI_API_KEY ? 'openai' : 'mock';
}

module.exports = { env, storageMode, aiMode, DATA_DIR, SECRET_FILE, DB_FILE };
