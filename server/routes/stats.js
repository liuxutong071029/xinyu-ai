// 心屿 MindIsle v5 · 看板路由（匿名聚合）
// 权限边界：
//   学校端（school）→ 只读本校整体匿名统计（学生数/测评数/心理趋势/主要压力来源），
//                   不含任何学生个体字段；具体学生聊天内容不可见；
//   社区端（community）→ 只读本区域汇总（覆盖学校/服务人数/心理需求趋势）；
// 口径与 supabase/migrations/001_init.sql 中 school_cockpit / community_overview
// 等聚合视图一致（本模块为服务端 JS 聚合实现，Supabase 视图供接入 Auth 后直查）。
module.exports = function register(ctx) {
  const { route, json, needAuth, needRole, store } = ctx;

  function dayKey(ts) { return String(ts || '').slice(0, 10); }
  function dayRange(n) {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 86400000);
      return d.toISOString().slice(0, 10);
    });
  }
  function byDay(rows, keys) {
    const out = {};
    rows.forEach(r => { const k = dayKey(r.created_time); if (keys.includes(k)) out[k] = (out[k] || 0) + 1; });
    return out;
  }
  function emoDist(rows) {
    const out = {};
    rows.forEach(e => { out[e.emotion] = (out[e.emotion] || 0) + 1; });
    return out;
  }
  function pressureSources(rows) {
    const typeScore = {};
    rows.forEach(a => {
      typeScore[a.type] = typeScore[a.type] || { n: 0, sum: 0 };
      typeScore[a.type].n++; typeScore[a.type].sum += Number(a.score) || 0;
    });
    return Object.entries(typeScore)
      .map(([type, v]) => ({ type, avg: Math.round(v.sum / v.n), count: v.n }))
      .sort((a, b) => b.avg - a.avg).slice(0, 5);
  }

  /* ---- GET /api/stats/school 学校端：本校心理驾驶舱（匿名聚合） ---- */
  route('GET', '/api/stats/school', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['school'], res)) return;
    const school = u.school_id ? await store.get('schools', { id: u.school_id }) : null;
    const students = await store.list('users', { school_id: u.school_id, role: 'student' });
    const studentIds = new Set(students.map(s => s.id));
    // 演示规模：全表拉取后内存过滤；生产可由 SQL 聚合视图直查
    const [allUsers, ass, chats, emos] = await Promise.all([
      store.all('users'), store.all('assessments'), store.all('chat_records'), store.all('emotion_records')
    ]);
    const myAss = ass.filter(a => studentIds.has(a.user_id));
    const myChats = chats.filter(c => studentIds.has(c.user_id));
    const myEmos = emos.filter(e => studentIds.has(e.user_id));
    const assed = new Set(myAss.map(a => a.user_id));
    const riskChats = myChats.filter(c => c.risk_level === 'high' || c.risk_level === 'attention');
    const days7 = dayRange(7);
    json(res, 200, {
      school: { id: u.school_id, name: school ? school.school_name : '未命名学校' },
      student_count: students.length,
      platform_registered: allUsers.length,
      assessment_completion_rate: students.length ? Math.round(assed.size / students.length * 100) : 0,
      ai_service_count: myChats.length,
      risk_event_count: riskChats.length,
      pressure_sources: pressureSources(myAss),
      emotion_distribution: emoDist(myEmos),
      chat_trend_7d: days7.map(d => ({ date: d, count: byDay(myChats, days7)[d] || 0 })),
      assessment_count: myAss.length
    });
  });

  /* ---- GET /api/stats/school/focus 学校端：重点关注名单（脱敏摘要，无 id/年级） ---- */
  route('GET', '/api/stats/school/focus', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['school'], res)) return;
    const level = ((req._query && req._query.get('level')) || '').toLowerCase();
    const students = await store.list('users', { school_id: u.school_id, role: 'student' });
    const studentIds = new Set(students.map(s => s.id));
    const ass = (await store.all('assessments')).filter(a => studentIds.has(a.user_id)).sort((a, b) => b.id - a.id);
    const latestByUser = {};
    ass.forEach(a => { if (!latestByUser[a.user_id]) latestByUser[a.user_id] = a; });
    const list = Object.entries(latestByUser).map(([uid, a]) => {
      const st = students.find(s => String(s.id) === String(uid));
      return {
        nickname: st ? st.nickname : '同学',
        type: a.type, score: a.score, level: a.level, date: a.created_time
      };
    }).filter(x => !level || /中|重/.test(x.level || '')).sort((a, b) => b.score - a.score);
    json(res, 200, { records: list });
  });

  /* ---- GET /api/stats/community 社区端：区域心理服务汇总（匿名聚合） ---- */
  route('GET', '/api/stats/community', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    if (!needRole(u, ['community'], res)) return;
    const region = u.region || '';
    if (!region) return json(res, 200, {
      region: '未指定区域', school_count: 0, service_student_count: 0,
      assessment_count: 0, ai_service_count: 0, main_needs: [],
      emotion_distribution: {}, trend_14d: dayRange(14).map(d => ({ date: d, count: 0 }))
    });
    const schools = await store.list('schools', { region });
    const schoolIds = new Set(schools.map(s => s.id));
    const allStudents = await store.list('users', { role: 'student' });
    const students = allStudents.filter(x => schoolIds.has(x.school_id) || x.region === region);
    const studentIds = new Set(students.map(s => s.id));
    const [ass, emos, chats] = await Promise.all([
      store.all('assessments'), store.all('emotion_records'), store.all('chat_records')
    ]);
    const myAss = ass.filter(a => studentIds.has(a.user_id));
    const myEmos = emos.filter(e => studentIds.has(e.user_id));
    const myChats = chats.filter(c => studentIds.has(c.user_id));
    const days14 = dayRange(14);
    const trendMap = byDay([...myAss, ...myEmos, ...myChats], days14);
    json(res, 200, {
      region,
      school_count: schools.length,
      service_student_count: students.length,
      assessment_count: myAss.length,
      ai_service_count: myChats.length,
      main_needs: pressureSources(myAss),
      emotion_distribution: emoDist(myEmos),
      trend_14d: days14.map(d => ({ date: d, count: trendMap[d] || 0 }))
    });
  });
};
