// 心屿 MindIsle v5 · 端到端冒烟自测（零依赖，Node 22 全局 fetch）
// 前置：node index.js 已启动（默认 http://localhost:3001）
// 运行：node scripts/smoke.js
// 覆盖：register → login → profile → ai/create → chat（含记忆引用）
//       + 高风险 notice + 四角色权限边界（越权 403/家长可见范围/看板聚合）
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3001';

let pass = 0, fail = 0;
const log = (name, ok, detail) => {
  console.log((ok ? '  ✅ ' : '  ❌ ') + name + (detail ? '  → ' + detail : ''));
  ok ? pass++ : fail++;
};
const api = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  let data = null;
  try { data = await resp.json(); } catch (e) {}
  return { status: resp.status, data };
};
const expect = (cond, name, detail) => log(name, !!cond, detail);

(async () => {
  const uniq = Date.now().toString(36);
  const su = 'smk' + uniq.slice(-7);

  // 1) 健康检查
  const h = await api('GET', '/api/health');
  expect(h.status === 200 && h.data.ok, 'GET /api/health', 'storage=' + h.data.storage + ' ai=' + h.data.ai);

  // 2) 注册（学生）
  const reg = await api('POST', '/api/register', {
    username: su, password: 'demo123456', nickname: '冒烟同学', role: 'student', region: '北京市海淀区', school_name: '示范大学'
  });
  expect(reg.status === 200 && reg.data.token, 'POST /api/register（学生+学校）', 'school_id=' + (reg.data.user && reg.data.user.school_id));
  const stuToken = reg.data.token;

  // 3) 重复注册 → 409
  const reg2 = await api('POST', '/api/register', { username: su, password: 'demo123456', nickname: '冒烟同学', role: 'student' });
  expect(reg2.status === 409, '重复注册 → 409', JSON.stringify(reg2.data));

  // 4) 登录
  const login = await api('POST', '/api/login', { username: su, password: 'demo123456' });
  expect(login.status === 200 && login.data.token, 'POST /api/login → token');
  const token = login.data.token;

  // 5) 错误密码 → 401
  const badLogin = await api('POST', '/api/login', { username: su, password: 'wrong123' });
  expect(badLogin.status === 401, '错误密码 → 401', JSON.stringify(badLogin.data));

  // 6) profile
  const prof = await api('GET', '/api/user/profile', undefined, token);
  expect(prof.status === 200 && prof.data.user.nickname === '冒烟同学', 'GET /api/user/profile', 'school_name=' + prof.data.user.school_name);

  // 7) ai/create
  const aiC = await api('POST', '/api/ai/create', { personality_type: '鼓励成长型' }, token);
  expect(aiC.status === 200 && aiC.data.personality.personality_type === '鼓励成长型', 'POST /api/ai/create', 'personality=' + aiC.data.personality.personality_type);

  // 8) 非法人格 → 400
  const aiBad = await api('POST', '/api/ai/create', { personality_type: '暴躁型' }, token);
  expect(aiBad.status === 400, '非法人格类型 → 400', JSON.stringify(aiBad.data));

  // 9) chat ①：种下考试压力话题
  const chat1 = await api('POST', '/api/chat', { message: '最近考试压力很大，每天都睡不好' }, token);
  expect(chat1.status === 200 && chat1.data.reply && chat1.data.emotion === '压力',
    'POST /api/chat ① 情绪识别=压力', 'risk=' + chat1.data.risk_level + ' memory_used=' + chat1.data.memory_used + ' source=' + chat1.data.source);

  // 10) chat ②：记忆引用（应回问"之前你提到考试压力…"）
  const chat2 = await api('POST', '/api/chat', { message: '今天还是很紧张' }, token);
  const memHit = chat2.status === 200 && chat2.data.memory_used === true &&
    /之前|上次|提过/.test(chat2.data.reply || '');
  expect(memHit, 'POST /api/chat ② 记忆引用', 'memory_used=' + chat2.data.memory_used + ' 回复片段=' + String(chat2.data.reply).slice(0, 30).replace(/\n/g, ' '));

  // 11) chat ③：高风险 → notice + risk=high
  const chat3 = await api('POST', '/api/chat', { message: '我真的不想活了，撑不下去' }, token);
  expect(chat3.status === 200 && chat3.data.risk_level === 'high' && /寻求专业帮助/.test(chat3.data.notice || '') && /12356/.test(chat3.data.notice || ''),
    'POST /api/chat ③ 高风险 notice', 'risk=' + chat3.data.risk_level + ' notice=' + chat3.data.notice);

  // 12) 空消息 → 400
  const chat4 = await api('POST', '/api/chat', { message: '   ' }, token);
  expect(chat4.status === 400, '空消息 → 400', JSON.stringify(chat4.data));

  // 13) 未带 token → 401
  const noAuth = await api('GET', '/api/user/profile');
  expect(noAuth.status === 401, '未带 token → 401', JSON.stringify(noAuth.data));

  // ================= 四角色权限边界 =================
  // 家长登录（demo-parent1，预绑定小雨同学）
  const parentLogin = await api('POST', '/api/login', { username: 'demo-parent1', password: 'demo123456' });
  const parentToken = parentLogin.data && parentLogin.data.token;
  expect(parentLogin.status === 200 && parentToken, '家长登录（demo-parent1）');

  // 家长不能聊天 → 403
  const parentChat = await api('POST', '/api/chat', { message: '你好' }, parentToken);
  expect(parentChat.status === 403, '家长调 /api/chat → 403', JSON.stringify(parentChat.data));

  // 家长看孩子：只有趋势/测评/AI建议，无聊天/树洞字段
  const child = await api('GET', '/api/family/child', undefined, parentToken);
  const childOk = child.status === 200 && child.data.bound === true &&
    Array.isArray(child.data.emotion_trend) && child.data.advice &&
    child.data.chat_records === undefined && child.data.tree_hole === undefined;
  expect(childOk, '家长 GET /api/family/child（趋势/情绪/建议，无聊天/树洞）', 'child=' + (child.data.child && child.data.child.nickname) + ' emo_trend=' + (child.data.emotion_trend || []).length);

  // 家长直接查聊天历史 → 403
  const parentHist = await api('GET', '/api/chat/history', undefined, parentToken);
  expect(parentHist.status === 403, '家长 GET /api/chat/history → 403', JSON.stringify(parentHist.data));

  // 学校登录（demo-admin1）
  const schLogin = await api('POST', '/api/login', { username: 'demo-admin1', password: 'demo123456' });
  const schToken = schLogin.data && schLogin.data.token;
  expect(schLogin.status === 200 && schToken, '学校登录（demo-admin1）');

  // 学校看板：匿名聚合（无具体学生聊天字段）
  const schStats = await api('GET', '/api/stats/school', undefined, schToken);
  const schOk = schStats.status === 200 && schStats.data.school && typeof schStats.data.student_count === 'number' &&
    Array.isArray(schStats.data.pressure_sources) && schStats.data.chat_records === undefined;
  expect(schOk, '学校 GET /api/stats/school（匿名聚合）', 'school=' + schStats.data.school.name + ' students=' + schStats.data.student_count + ' risk_events=' + schStats.data.risk_event_count);

  // 学校看学生聊天 → 403
  const schChat = await api('POST', '/api/chat', { message: '你好' }, schToken);
  expect(schChat.status === 403, '学校调 /api/chat → 403', JSON.stringify(schChat.data));

  // 学校看家长接口 → 403
  const schChild = await api('GET', '/api/family/child', undefined, schToken);
  expect(schChild.status === 403, '学校调 /api/family/child → 403', JSON.stringify(schChild.data));

  // 社区登录（demo-com1，上海市徐汇区）
  const comLogin = await api('POST', '/api/login', { username: 'demo-com1', password: 'demo123456' });
  const comToken = comLogin.data && comLogin.data.token;
  expect(comLogin.status === 200 && comToken, '社区登录（demo-com1）');

  // 社区区域汇总（只含本区域学校）
  const comStats = await api('GET', '/api/stats/community', undefined, comToken);
  const comOk = comStats.status === 200 && comStats.data.region === '上海市徐汇区' &&
    typeof comStats.data.school_count === 'number' && Array.isArray(comStats.data.main_needs);
  expect(comOk, '社区 GET /api/stats/community（区域汇总）', 'region=' + comStats.data.region + ' schools=' + comStats.data.school_count + ' students=' + comStats.data.service_student_count);

  // 社区看学生数据 → 403
  const comChat = await api('POST', '/api/chat', { message: '你好' }, comToken);
  expect(comChat.status === 403, '社区调 /api/chat → 403', JSON.stringify(comChat.data));

  // 学生越权看学校看板 → 403
  const stuStats = await api('GET', '/api/stats/school', undefined, token);
  expect(stuStats.status === 403, '学生调 /api/stats/school → 403', JSON.stringify(stuStats.data));

  // 学生看他人数据（通过接口无用户参数可传 → 只能拿自己的）
  const myHist = await api('GET', '/api/chat/history', undefined, token);
  expect(myHist.status === 200 && Array.isArray(myHist.data.records) && myHist.data.records.length >= 3, '学生 GET /api/chat/history（本人）', 'records=' + myHist.data.records.length);

  // 训练行为上报
  const beh = await api('POST', '/api/behavior', { action: '训练' }, token);
  expect(beh.status === 200, 'POST /api/behavior（训练）', JSON.stringify(beh.data));
  const behBad = await api('POST', '/api/behavior', { action: '打游戏' }, token);
  expect(behBad.status === 400, '非法行为类型 → 400', JSON.stringify(behBad.data));

  // 树洞发布 + 匿名流
  const th = await api('POST', '/api/tree-hole', { content: '冒烟测试：今天的情绪像多云转晴' }, token);
  expect(th.status === 200 && th.data.tree_hole && th.data.tree_hole.user_id === undefined, 'POST /api/tree-hole（匿名返回）');
  const feed = await api('GET', '/api/tree-hole/feed', undefined, token);
  expect(feed.status === 200 && Array.isArray(feed.data.records) && feed.data.records.every(r => r.user_id === undefined), 'GET /api/tree-hole/feed（不含 user_id）', 'records=' + feed.data.records.length);

  // 测评保存
  const ass = await api('POST', '/api/assessments', { type: 'PHQ-9', score: 7, level: '轻度', result: '冒烟测试' }, token);
  expect(ass.status === 200 && ass.data.assessment.type === 'PHQ-9', 'POST /api/assessments', 'score=' + ass.data.assessment.score);

  console.log('\n==========================================');
  console.log('  冒烟自测结果: ' + pass + ' 通过 / ' + fail + ' 失败（共 ' + (pass + fail) + ' 项）');
  console.log('==========================================');
  process.exit(fail ? 1 : 0);
})().catch(e => {
  console.error('冒烟测试异常:', e);
  process.exit(1);
});
