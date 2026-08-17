// 心屿 MindIsle v5 · OpenAI 兼容大模型调用（AI_API_KEY / AI_BASE_URL / AI_MODEL）
// 零第三方依赖：Node 22 全局 fetch。任何失败/超时返回 null，由调用方回落规则引擎。
const { env } = require('../config');

/**
 * 调用 chat/completions。
 * @param {{messages: Array<{role:string,content:string}>, temperature?: number, maxTokens?: number, timeoutMs?: number}} opts
 * @returns {Promise<string|null>} 回复文本；未配置 key 或失败返回 null
 */
async function callChat(opts) {
  if (!env.AI_API_KEY) return null;
  const { messages, temperature = 0.7, maxTokens = 600, timeoutMs = 15000 } = opts;
  try {
    const resp = await fetch(env.AI_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.AI_API_KEY
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!resp.ok) {
      console.warn('[心屿] 大模型接口返回 ' + resp.status + '，回落规则引擎');
      return null;
    }
    const data = await resp.json();
    const content = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    return null;
  } catch (e) {
    console.warn('[心屿] 大模型调用失败（' + (e && e.message ? e.message : e) + '），回落规则引擎');
    return null;
  }
}

module.exports = { callChat };
