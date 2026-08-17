# 心屿 MindIsle v5 · API 接口文档

> 基准地址：`http://localhost:3001`（可经环境变量 `PORT` 修改）
> 认证方式：`Authorization: Bearer <token>`（注册/登录返回，HMAC 签名，默认 7 天有效）
> 统一错误格式：`{"error": "中文提示"}`，状态码约定：`400` 参数错误 / `401` 未登录或凭证错误 / `403` 越权 / `404` 不存在 / `409` 冲突 / `500` 服务器内部错误
> 版本：v5.0.0 ｜ 服务标识：`xinyu-mindisle-v5-api`
> 存储模式由环境变量自动决定（Supabase REST / 本地 JSON mock），接口契约完全一致，前端无需感知。

---

## 0. 总览

| 模块 | 接口 | 权限 |
|---|---|---|
| 健康检查 | `GET /api/health` | 公开 |
| 用户 | `POST /api/register`、`POST /api/login`、`GET/PUT /api/user/profile` | 公开 / 登录 |
| AI 人格 | `POST /api/ai/create`、`GET /api/ai/profile` | 学生 |
| AI 聊天 | `POST /api/chat`、`GET /api/chat/history` | 学生 |
| 教师助手 | `POST /api/ai/teacher-assistant` | 学校/社区 |
| 测评 | `POST /api/assessments`、`GET /api/assessments` | 学生 |
| 情绪 | `POST /api/emotions`、`GET /api/emotions` | 学生 |
| 画像 | `GET /api/portrait` | 学生 |
| 树洞 | `POST /api/tree-hole`、`GET /api/tree-hole`、`GET /api/tree-hole/feed` | 学生 |
| 家庭绑定 | `POST /api/family/generate`、`POST /api/family/bind`、`GET /api/family/status`、`GET /api/family/child` | 学生/家长 |
| 看板 | `GET /api/stats/school`、`GET /api/stats/school/focus`、`GET /api/stats/community` | 学校/社区 |
| 行为台账 | `POST /api/behavior`、`GET /api/behavior` | 登录 |

---

## 1. 健康检查

### GET /api/health（公开）

返回服务、存储与 AI 模式，可用于前端判断云端是否可用。

```bash
curl http://localhost:3001/api/health
```

```json
{"ok":true,"service":"xinyu-mindisle-v5-api","version":"5.0.0","time":"2026-08-16T15:30:00.000Z","storage":"json","ai":"mock"}
```

- `storage`：`supabase`（Supabase REST 模式）或 `json`（本地 mock 模式）
- `ai`：`openai:gpt-4o-mini`（已配置密钥）或 `mock`（内置规则式回复）

---

## 2. 用户模块

### 2.1 POST /api/register 创建用户（公开）

入参：`username`（3-20 位字母/数字/下划线/中文）、`password`（≥6 位）、`nickname`（必填，≤30 字）、`role`（`student`/`parent`/`school`/`community`，缺省 `student`）、`age?`（1-120）、`gender?`、`region?`、`school_name?`（学生/学校角色可填，自动匹配或创建学校）、`avatar?`

```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo-stu1","password":"demo123456","nickname":"小雨同学","role":"student","age":19,"gender":"女","region":"北京市海淀区","school_name":"示范大学"}'
```

```json
{
  "user": {
    "id": 1, "username": "demo-stu1", "nickname": "小雨同学", "role": "student",
    "age": 19, "gender": "女", "region": "北京市海淀区",
    "school_id": 1, "school_name": "示范大学", "avatar": "", "created_time": "2026-08-16T15:30:00.000Z"
  },
  "token": "eyJ1aWQiOjEsInJvbGUiOiJzdHVkZW50IiwiZXhwIjoxNzU3MjQ1OTQ2MjU4fQ.abc123..."
}
```

校验失败示例：`400 {"error":"用户名需 3-20 位（字母/数字/下划线/中文）"}`；重复注册 `409 {"error":"用户名已被注册"}`。

### 2.2 POST /api/login 返回 token（公开）

```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo-stu1","password":"demo123456"}'
```

响应同上（`user` + `token`）。失败：`401 {"error":"用户名或密码错误"}`。
登录行为自动写入 `user_behavior`（action=登录）。

### 2.3 GET /api/user/profile 获取用户信息（登录）

```bash
curl http://localhost:3001/api/user/profile -H "Authorization: Bearer <token>"
```

```json
{"user":{"id":1,"username":"demo-stu1","nickname":"小雨同学","role":"student","age":19,"gender":"女","region":"北京市海淀区","school_id":1,"school_name":"示范大学","avatar":"","created_time":"..."}}
```

### 2.4 PUT /api/user/profile 更新档案（登录）

可更新子集：`nickname`/`age`/`gender`/`region`/`avatar`/`school_name`（学生/学校角色）。返回 `{"user":{...}}`。

---

## 3. AI 人格模块

### 3.1 POST /api/ai/create 保存用户选择的 AI 类型（学生）

入参：`personality_type` ∈ {`温柔倾听型`,`鼓励成长型`,`理性分析型`}（兼容旧前端别名「温暖倾听型」→ 温柔倾听型）。同一用户重复调用为覆盖更新。

```bash
curl -X POST http://localhost:3001/api/ai/create \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"personality_type":"温柔倾听型"}'
```

```json
{"personality":{"id":1,"user_id":1,"personality_type":"温柔倾听型","created_time":"..."}}
```

### 3.2 GET /api/ai/profile（学生）

返回 `{"personality":{...}}`；未设置时返回默认 `{"personality":{"personality_type":"温柔倾听型"}}`。

---

## 4. AI 聊天模块（核心）

### 4.1 POST /api/chat（学生）

**流程（需求逐条对应）**：
1. 读取用户历史聊天（最近 12 条）/最近测评（5 条）/情绪数据（20 条）与 AI 人格；
2. 情绪识别（规则引擎）输出 `emotion`（压力/焦虑/开心/低落，无命中为平静）+ `risk_level`（normal/attention/high）；
3. 记忆引用：从最近 8 条历史消息抽取主题，命中历史话题时回复中引用（例：用户说过"最近考试压力很大"，下次 AI 回复开头"之前你提到考试压力，最近有没有好一点？"）；
4. 回复生成：风险 normal 且已配置 `AI_API_KEY` → 调用 OpenAI 兼容接口（带记忆提示词）；未配置或风险 attention/high → 内置规则话术（**安全话术永远走规则，不交给大模型自由发挥**）；
5. 保存 `chat_records` + **顺带写 `emotion_records`**（source=AI聊天，情绪映射入域：压力→焦虑）+ `user_behavior`（action=聊天）。

入参：`message`（必填，≤2000 字）。

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"message":"今天还是很紧张"}'
```

```json
{
  "reply": "我注意到：之前你提到考试压力，最近有没有好一点？\n\n我在认真听。如果暂时不想说具体的事，也可以告诉我你今天的状态……",
  "emotion": "焦虑",
  "confidence": 0.67,
  "risk_level": "normal",
  "source": "rule",
  "memory_used": true,
  "memory": true,
  "record_id": 12,
  "notice": null
}
```

字段说明：
- `reply`：AI 回复（中文、温柔、短）；
- `emotion`：情绪识别输出（压力/焦虑/开心/低落/平静）；
- `risk_level`：`normal` / `attention` / `high`；
- `source`：`llm`（真实大模型）或 `rule`（内置规则 mock）；
- `memory_used`：本次回复是否使用了记忆引用（需求字段）；`memory` 为旧前端兼容字段，值相同；
- `record_id`：chat_records 主键；
- `notice`：仅 `risk_level=high` 时非空，固定文案：`建议寻求专业帮助。AI 不能替代专业诊断。如需紧急支持，请拨打全国心理援助热线 12356。`（需求文案 + 12356 热线）

**极端情绪（high）示例**：

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"message":"我真的不想活了"}'
```

```json
{
  "reply": "我听到你正在经历的痛苦，这非常重要。请先停下来——你不是一个人。\n\n请立即拨打全国心理援助热线 12356（24小时）……\n\n心屿只是辅助支持，不能替代专业帮助。……",
  "emotion": "低落",
  "confidence": 0.33,
  "risk_level": "high",
  "source": "rule",
  "memory_used": false,
  "memory": false,
  "record_id": 13,
  "notice": "建议寻求专业帮助。AI 不能替代专业诊断。如需紧急支持，请拨打全国心理援助热线 12356。"
}
```

### 4.2 GET /api/chat/history 本人最近 50 条（学生）

```bash
curl http://localhost:3001/api/chat/history -H "Authorization: Bearer <token>"
```

```json
{"records":[{"id":12,"user_id":1,"message":"今天还是很紧张","response":"我注意到：……","emotion":"焦虑","risk_level":"normal","created_time":"..."}]}
```

家长/学校/社区调用 → `403`（权限边界，见《权限隔离验证记录》）。

---

## 5. AI 教师助手

### 5.1 POST /api/ai/teacher-assistant（学校/社区）

入参：`situation`（必填，≤500 字，学生情况描述）。返回结构化沟通建议；检测到危机信号时 `crisis=true`。

```bash
curl -X POST http://localhost:3001/api/ai/teacher-assistant \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"situation":"最近成绩下滑，情绪低落，不愿意说话"}'
```

```json
{"matched":"成绩下滑","crisis":false,"source":"rule","sections":["沟通方式：先接住情绪再谈成绩……","表达建议：……","注意事项：……"]}
```

---

## 6. 测评 / 情绪 / 画像模块

### 6.1 POST /api/assessments 保存测评（学生）

入参：`type` ∈ {`PHQ-9`,`GAD-7`,`压力测试`,`孤独感测试`,`睡眠测试`}、`score`（0-100 整数）、`level?`、`result?`。保存后自动写 `user_behavior`（action=测评）与一条 `emotion_records`（source=心理测评）。

```bash
curl -X POST http://localhost:3001/api/assessments \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"type":"PHQ-9","score":8,"level":"轻度","result":"轻度情绪困扰"}'
```

```json
{"assessment":{"id":10,"user_id":1,"type":"PHQ-9","score":8,"level":"轻度","result":"轻度情绪困扰","created_time":"..."}}
```

### 6.2 GET /api/assessments 本人测评记录（学生）

`{"records":[...]}`（倒序）。

### 6.3 POST /api/emotions 情绪打卡（学生）

入参：`emotion` ∈ {`开心`,`平静`,`焦虑`,`低落`,`疲惫`}（兼容旧前端「孤独」→ 自动并入「低落」）、`pressure?`（低/中/高，缺省 中）、`source?`（每日打卡/AI聊天/心理测评，缺省 每日打卡）。

```bash
curl -X POST http://localhost:3001/api/emotions \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"emotion":"开心","pressure":"低","source":"每日打卡"}'
```

```json
{"emotion_record":{"id":20,"user_id":1,"emotion":"开心","pressure":"低","source":"每日打卡","created_time":"..."}}
```

### 6.4 GET /api/emotions 本人情绪记录（学生）

`{"records":[...]}`（倒序）。

### 6.5 GET /api/portrait 心理成长画像 + AI 建议（学生）

```bash
curl http://localhost:3001/api/portrait -H "Authorization: Bearer <token>"
```

```json
{
  "portrait": {
    "nickname": "小雨同学",
    "latest_assessments": [{"type":"PHQ-9","score":6,"level":"轻度"}],
    "emotion_records": [{"emotion":"焦虑","pressure":"高", ...}],
    "emotion_distribution": {"焦虑":4,"平静":4,"低落":3},
    "chat_emotion_distribution": {"压力":1,"低落":1},
    "risk": "attention",
    "assessment_count": 6,
    "chat_count": 2
  },
  "advice": "最近的信号显示你承受得比较多。……"
}
```

---

## 7. 树洞模块（匿名）

### 7.1 POST /api/tree-hole 发布树洞（学生）

入参：`content`（必填，≤500 字）。服务端自动做情绪识别与风险分级。返回**不含 user_id** 的匿名记录。

```bash
curl -X POST http://localhost:3001/api/tree-hole \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"content":"期中考试要来了，越想越睡不着"}'
```

```json
{"tree_hole":{"id":3,"content":"期中考试要来了，越想越睡不着","emotion":"焦虑","risk_level":"normal","created_time":"..."},"anonymous":true}
```

### 7.2 GET /api/tree-hole 本人发布记录（学生）

`{"records":[...匿名字段...]}`。

### 7.3 GET /api/tree-hole/feed 公开匿名流（学生）

最近 50 条，倒序，**不含 user_id**。家长/学校/社区调用 → `403`（树洞对家长不可见）。

---

## 8. 家庭绑定模块

### 8.1 POST /api/family/generate 生成 8 位邀请码（学生）

```bash
curl -X POST http://localhost:3001/api/family/generate -H "Authorization: Bearer <token>"
```

```json
{"invite_code":"XY20260815","binding":{"id":1,"student_id":1,"parent_id":2,"invite_code":"XY20260815","status":"active","created_time":"..."}}
```

### 8.2 POST /api/family/bind 家长凭邀请码绑定（家长）

```bash
curl -X POST http://localhost:3001/api/family/bind \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"invite_code":"XY20260815"}'
```

失败：`404 {"error":"邀请码无效或已失效"}`；已被他人绑定 `409`。

### 8.3 GET /api/family/status 绑定状态（学生/家长）

`{"bindings":[...]}`。

### 8.4 GET /api/family/child 家长查看孩子（家长）

**权限边界核心接口**：只返回绑定孩子的心理趋势/情绪变化/测评摘要/AI 建议；**不包含 AI 聊天内容（chat_records）、树洞（tree_hole）与任何私密记录**。

```bash
curl http://localhost:3001/api/family/child -H "Authorization: Bearer <token>"
```

```json
{
  "bound": true,
  "child": {"nickname":"小雨同学","username":"demo-stu1","school_name":"示范大学","created_time":"..."},
  "emotion_trend": [{"emotion":"焦虑","pressure":"高","date":"..."}, ...],
  "emotion_distribution": {"焦虑":4,"平静":4,"低落":3},
  "assessments": [{"type":"PHQ-9","score":6,"level":"轻度","date":"..."}],
  "advice": "从你的档案看……（AI 建议文本，风险口径仅来自测评分级，不读取聊天内容）"
}
```

---

## 9. 看板模块（匿名聚合）

### 9.1 GET /api/stats/school 学校端驾驶舱（学校）

只读本校整体匿名统计，不含任何学生个体字段。

```bash
curl http://localhost:3001/api/stats/school -H "Authorization: Bearer <token>"
```

```json
{
  "school": {"id":1,"name":"示范大学"},
  "student_count": 4,
  "platform_registered": 9,
  "assessment_completion_rate": 75,
  "ai_service_count": 4,
  "risk_event_count": 1,
  "pressure_sources": [{"type":"压力测试","avg":19,"count":2}],
  "emotion_distribution": {"焦虑":6,"低落":5},
  "chat_trend_7d": [{"date":"2026-08-10","count":0}, ...],
  "assessment_count": 9
}
```

### 9.2 GET /api/stats/school/focus 重点关注名单（学校，脱敏）

`?level=` 可筛选（如 `?level=中`）。返回**脱敏摘要**：昵称 + 测评类型/分数/分级/日期，**不含用户 id、不含聊天内容**。

### 9.3 GET /api/stats/community 社区端区域汇总（社区）

只读本区域（按社区账号 region）汇总。

```bash
curl http://localhost:3001/api/stats/community -H "Authorization: Bearer <token>"
```

```json
{
  "region": "上海市徐汇区",
  "school_count": 1,
  "service_student_count": 2,
  "assessment_count": 3,
  "ai_service_count": 1,
  "main_needs": [{"type":"孤独感测试","avg":18,"count":1}],
  "emotion_distribution": {"低落":1,"平静":1},
  "trend_14d": [{"date":"2026-08-03","count":0}, ...]
}
```

---

## 10. 行为台账模块

### 10.1 POST /api/behavior 上报行为（登录）

`action` ∈ {`登录`,`聊天`,`测评`,`训练`,`发布树洞`,`注册`,`情绪打卡`}（兼容旧前端「训练或互动」→ 训练）。系统侧自动记录：注册→注册、登录→登录、聊天→聊天、测评→测评、发布树洞→发布树洞、情绪打卡→情绪打卡；前端负责上报「训练」。

```bash
curl -X POST http://localhost:3001/api/behavior \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"action":"训练"}'
```

```json
{"ok":true,"behavior":{"id":30,"user_id":1,"action":"训练","created_time":"..."}}
```

### 10.2 GET /api/behavior 本人最近 100 条（登录）

`{"records":[...]}`。

---

## 11. 全局行为台账记录点（user_behavior 全量）

| 触发接口 | action 值 |
|---|---|
| POST /api/register | 注册 |
| POST /api/login | 登录 |
| POST /api/chat | 聊天（并顺带写 emotion_records，source=AI聊天） |
| POST /api/assessments | 测评 |
| POST /api/behavior（前端训练上报） | 训练 |
| POST /api/tree-hole | 发布树洞 |
| POST /api/emotions | 情绪打卡 |

---

## 12. 错误码速查

| 状态码 | 含义 | 示例 |
|---|---|---|
| 400 | 参数校验失败 | `{"error":"消息不能为空"}` |
| 401 | 未登录/token 过期/凭证错误 | `{"error":"未登录或登录已过期"}` |
| 403 | 角色越权 | `{"error":"无权限访问该功能"}` |
| 404 | 接口或资源不存在 | `{"error":"接口不存在"}` |
| 409 | 冲突 | `{"error":"用户名已被注册"}` |
| 500 | 服务器内部错误 | `{"error":"服务器内部错误"}` |

---

## 13. 演示账号（mock 模式与 SQL 种子一致，密码均为 demo123456）

| 用户名 | 昵称 | 角色 | 归属 |
|---|---|---|---|
| demo-stu1 | 小雨同学 | student | 示范大学（海淀） |
| demo-stu2 | 晨光同学 | student | 示范大学（海淀） |
| demo-stu3 | 晚风同学 | student | 示范大学（海淀） |
| demo-user1 | 林间用户 | student | 无学校 |
| demo-parent1 | 李妈妈 | parent | 已绑定小雨同学（邀请码 XY20260815） |
| demo-admin1 | 张老师 | school | 示范大学（海淀） |
| demo-com1 | 王主任 | community | 上海市徐汇区 |
| seed-stu1 | 小文同学 | student | 阳光社区附小（徐汇，邀请码 XH20260001 待绑定） |
| seed-stu2 | 小欣同学 | student | 阳光社区附小（徐汇） |
