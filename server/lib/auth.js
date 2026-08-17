// 心屿 MindIsle v5 · 认证模块（密码 sha256 哈希 + HMAC token，零依赖）
// token 结构: base64url(JSON{uid, role, exp}) + '.' + HMAC-SHA256 签名
// 密钥来源优先级: 环境变量 JWT_SECRET > server/data/secret.txt（首次自动生成并持久化）
const crypto = require('crypto');
const fs = require('fs');
const { env, SECRET_FILE } = require('../config');

let _cachedSecret = '';
function secret() {
  if (_cachedSecret) return _cachedSecret;
  if (env.JWT_SECRET) { _cachedSecret = env.JWT_SECRET; return _cachedSecret; }
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const s = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (s) { _cachedSecret = s; return _cachedSecret; }
    }
  } catch (e) { /* 忽略，走重新生成 */ }
  const s = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(require('path').dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, s, 'utf8');
  } catch (e) { /* 只读环境则仅本次进程内有效 */ }
  _cachedSecret = s;
  return _cachedSecret;
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function signToken(payload) {
  const body = Object.assign({}, payload, { exp: Date.now() + env.TOKEN_TTL_MS });
  const b64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
  return b64 + '.' + sig;
}

function verifyToken(token) {
  try {
    const [b64, sig] = String(token || '').split('.');
    if (!b64 || !sig) return null;
    const expect = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
    if (sig !== expect) return null;
    const obj = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch (e) { return null; }
}

module.exports = { sha256, signToken, verifyToken, secret };
