# 心屿 MindIsle v5 · 后端服务 README（server/）

> 零外部依赖 Node 后端：只用 Node 内置 `http/crypto/fs/path` 与 Node 22 全局 `fetch`。
> `node index.js` 直接可跑，**不需要 npm install**（package.json 仅元信息）。
> 双存储（Supabase REST / 本地 JSON mock）+ 双 AI（OpenAI 兼容接口 / 内置规则 mock），无任何凭据也能完整演示。

---

## 1. 架构图（文本）

```
浏览器前端（work/，由前端侧交付，本服务可选静态托管）
        │  HTTP (JSON)   Authorization: Bearer <HMAC token>
        ▼
┌────────────────────────────── server/index.js ──────────────────────────────┐
│  HTTP 服务器（内置 http 模块，默认端口 3001，PORT 可覆盖）                      │
│  中间件：CORS / OPTIONS / 请求体上限 1MB / 统一 JSON 错误                     │
│  路由分发 → routes/（auth / ai / assessment / treehole / family / stats /   │
│             behavior），每个接口：输入校验 → 角色守卫（needRole）→ 业务 →      │
│             行为台账（user_behavior 全量记录）                                │
└──────────────┬──────────────────────────────┬───────────────────────────────┘
               │                              │
     ┌─────────▼──────────┐        ┌──────────▼────────────┐
     │ lib/store.js       │        │ lib/ai-engine.js      │
     │  存储模式选择        │        │  规则引擎（永不依赖密钥） │
     ├────────────────────┤        │  · 情绪识别 压力/焦虑/ │
     │ lib/json-driver.js │        │    开心/低落(+平静)    │
     │  → data/db.json    │        │  · 风险分级 normal/    │
     │   （mock 模式，      │        │    attention/high     │
     │   首启自动播种）     │        │  · 记忆回问（话题抽取） │
     ├────────────────────┤        │  · 陪伴话术/教师助手/  │
     │ lib/supabase-driver│        │    画像建议             │
     │  → SUPABASE_URL    │        └──────────┬────────────┘
     │    /rest/v1（Post- │                   │ 已配置 AI_API_KEY 且风险 normal
     │    gREST，service  │        ┌──────────▼────────────┐
     │    key 绕过 RLS，  │        │ lib/llm.js            │
     │    路由守卫兜底）   │        │  OpenAI 兼容接口       │
     └────────────────────┘        │  (AI_BASE_URL/chat/   │
                                   │   completions，15s 超 │
                                   │   时自动回落规则引擎）  │
                                   └───────────────────────┘
```

数据流（POST /api/chat 核心流程）：

```
用户消息 → 校验(≤2000字) → 读取历史聊天(12条)/最近测评(5条)/情绪(20条)/AI人格
→ 规则引擎: 情绪识别 + 风险分级 + 记忆回问
→ 回复生成: risk=normal 且有 AI_API_KEY → 大模型(带记忆提示词)
           其余/失败 → 规则话术(high/attention 强制规则,安全不交给模型)
→ 保存 chat_records + 顺带写 emotion_records(AI聊天) + user_behavior(聊天)
→ 返回 {reply, emotion, risk_level, memory_used, notice}
```

---

## 2. 环境变量表

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `3001` | HTTP 监听端口 |
| `JWT_SECRET` | 否 | 自动生成并持久化到 `server/data/secret.txt` | HMAC token 签名密钥；重启不失效 |
| `SUPABASE_URL` | 否（两个都配才走 Supabase） | — | 如 `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | 否（同上） | — | service_role 密钥（服务端代理访问，绕过 RLS，权限由路由守卫实施） |
| `AI_API_KEY` | 否 | — | 配置后走 OpenAI 兼容接口，否则内置规则 mock |
| `AI_BASE_URL` | 否 | `https://api.openai.com/v1` | 兼容端点基址（智谱/DeepSeek 等可替换） |
| `AI_MODEL` | 否 | `gpt-4o-mini` | 模型名 |
| `STATIC_DIR` | 否 | 自动探测 `../work`（存在 index.html 才启用） | 静态托管目录，不配置则纯 API 模式 |

> 说明：服务零外部依赖，不读取 .env 文件本身；启动前请在 shell 中 `export`/`set` 环境变量（示例见 `.env.example`）。

---

## 3. 启动步骤

```powershell
# 方式一：mock 模式（无任何凭据，比赛演示推荐）
cd server
node index.js
# 输出：存储模式=本地 JSON 文件（mock）、AI 模式=内置规则式 mock、静态托管=../work
# 首次启动自动生成演示数据 data/db.json（9 账号，密码 demo123456）

# 方式二：连接 Supabase（PowerShell）
$env:SUPABASE_URL='https://xxxx.supabase.co'
$env:SUPABASE_SERVICE_KEY='sb_secret_...'
node index.js
# 连通性检查失败会自动降级 mock 并打印警告（演示不中断）

# 方式三：接入真实大模型
$env:AI_API_KEY='sk-...'
$env:AI_BASE_URL='https://api.openai.com/v1'   # 可选
$env:AI_MODEL='gpt-4o-mini'                    # 可选
node index.js
```

验证：

```powershell
curl http://localhost:3001/api/health
# {"ok":true,"service":"xinyu-mindisle-v5-api","version":"5.0.0","storage":"json","ai":"mock"}

node scripts/smoke.js    # 31 项冒烟（权限边界 + 记忆 + 高风险 notice 全覆盖）
```

---

## 4. Supabase 迁移命令

### 方式一：控制台 SQL Editor（推荐，最简单）

1. 打开 Supabase 项目 → SQL Editor → New query；
2. 粘贴 `supabase/migrations/001_init.sql` 全部内容 → Run；
3. 验证：
   ```sql
   select count(*) from public.users;           -- 9（演示种子）
   select * from public.school_cockpit;         -- 学校端聚合视图
   select * from public.community_overview;     -- 社区端聚合视图
   ```

### 方式二：Supabase CLI

```bash
# 将 001_init.sql 放入项目 supabase/migrations/ 目录后
supabase db push
# 或本地开发
supabase db reset
```

### 迁移完成后启动服务

```powershell
$env:SUPABASE_URL='https://xxxx.supabase.co'
$env:SUPABASE_SERVICE_KEY='sb_secret_...'
cd server
node index.js
```

---

## 5. mock 模式说明

- **触发条件**：`SUPABASE_URL` 与 `SUPABASE_SERVICE_KEY` 任一未配置 → 本地 JSON 模式；已配置但连通失败 → 自动降级并告警（保证演示不断）。
- **数据位置**：`server/data/db.json`（单文件，9 表结构与 Supabase schema 逐字段对齐）。
- **自动播种**：首次启动若 db.json 不存在，自动写入演示种子（与 001_init.sql 种子口径一致：9 账号、密码 demo123456、绑定关系、14 天情绪序列、记忆演示聊天等）。
- **重置**：`node seed.js`（幂等重建 db.json；不影响 secret.txt，已有 token 仍有效）。
- **AI 降级**：无 `AI_API_KEY` 时，聊天回复来自内置规则引擎——中文、温柔、短句，带记忆引用与风险话术；情绪识别/风险分级/记忆回问永远走规则（安全兜底，即使配了真实大模型，high/attention 也强制规则话术）。
- **静态托管**：自动托管 `../work`（前端团队产物目录），路径穿越已防护；无该目录则纯 API。

---

## 6. 目录清单

```
server/
├── index.js              # 入口：HTTP 服务器 / 路由分发 / 静态托管 / 启动横幅
├── config.js             # 环境变量解析
├── seed.js               # 演示种子（node seed.js）
├── package.json          # 仅元信息，无 dependencies
├── .env.example          # 环境变量示例
├── data/
│   ├── db.json           # mock 存储（自动生成）
│   └── secret.txt        # HMAC 密钥（自动生成）
├── lib/
│   ├── util.js           # JSON 响应 / 请求体 / 输入校验 / 错误助手
│   ├── auth.js           # sha256 + HMAC token 签发/校验（7 天）
│   ├── store.js          # 存储模式选择（Supabase 优先，失败降级 mock）
│   ├── json-driver.js    # 本地 JSON 驱动（表/查询/增改删）
│   ├── supabase-driver.js# PostgREST 驱动（零依赖 fetch）
│   ├── ai-engine.js      # 规则 AI：情绪/风险/记忆/话术/教师助手/画像建议
│   └── llm.js            # OpenAI 兼容调用（超时自动回落）
├── routes/
│   ├── auth.js           # register / login / profile
│   ├── ai.js             # ai/create / ai/profile / chat / chat/history / teacher-assistant
│   ├── assessment.js     # assessments / emotions / portrait
│   ├── treehole.js       # tree-hole（匿名化）
│   ├── family.js         # family/generate / bind / status / child（家长边界）
│   ├── stats.js          # stats/school / stats/school/focus / stats/community（聚合边界）
│   └── behavior.js       # 行为台账
└── scripts/
    └── smoke.js          # 31 项端到端冒烟（含权限边界断言）
```

---

## 7. 常见问题

| 现象 | 处置 |
|---|---|
| `EADDRINUSE :::3001` | 端口被占用：改 `$env:PORT=3002` 或结束占用进程 |
| 启动后 storage=json | 未配 Supabase 环境变量（正常 mock 模式） |
| 配置了 Supabase 但自动降级 | 检查 URL/密钥正确性与网络；服务端会打印具体原因 |
| 回复没有记忆引用 | 前 8 条历史需含话题词（如考试/睡眠/人际）；`memory_used` 字段可判断 |
| smoke 跑多了演示数据变多 | `node seed.js` 一键还原 |
| 想换端口给前端 | 前端 `window.XINYU_API_BASE` 或同源部署；本服务静态托管时天然同源 |
