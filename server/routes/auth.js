// 心屿 MindIsle v5 · 用户模块路由（注册 / 登录 / 用户信息）
module.exports = function register(ctx) {
  const { route, json, readBody, needAuth, badRequest, unauthorized, conflict, store, logBehavior, publicUser, ensureSchool, sha256, signToken, USERNAME_RE, util } = ctx;
  const { isStr, isInt, oneOf, toInt } = util;

  /* ---- POST /api/register 创建用户（四角色） ---- */
  route('POST', '/api/register', async (req, res) => {
    const b = await readBody(req);
    if (b === null) return badRequest(res, '请求体不是合法 JSON');
    const { username, password, nickname } = b;
    const role = ['student', 'parent', 'school', 'community'].includes(b.role) ? b.role : 'student';

    if (!isStr(username, 20) || !isStr(password, 64) || !isStr(nickname, 30)) {
      return badRequest(res, '用户名、密码、昵称必填（昵称≤30字，密码≤64位）');
    }
    if (!USERNAME_RE.test(username)) return badRequest(res, '用户名需 3-20 位（字母/数字/下划线/中文）');
    if (password.length < 6) return badRequest(res, '密码至少 6 位');
    if (b.age !== undefined && b.age !== '' && b.age !== null && !isInt(toInt(b.age), 1, 120)) {
      return badRequest(res, '年龄需为 1-120 的整数');
    }
    if (await store.get('users', { username })) return conflict(res, '用户名已被注册');

    let u = {
      username, password: sha256(password), nickname,
      role,
      age: (b.age === undefined || b.age === '' || b.age === null) ? null : toInt(b.age),
      gender: typeof b.gender === 'string' ? b.gender.slice(0, 10) : '',
      region: typeof b.region === 'string' ? b.region.slice(0, 50) : '',
      school_id: null,
      avatar: typeof b.avatar === 'string' ? b.avatar.slice(0, 500) : ''
    };
    const schoolName = typeof b.school_name === 'string' ? b.school_name.trim().slice(0, 50) : '';
    if ((role === 'student' || role === 'school') && schoolName) {
      u = await ensureSchool(u, schoolName);
    }
    const saved = await store.insert('users', u);
    // 学生注册 → 学校学生数 +1
    if (role === 'student' && saved.school_id) {
      const sch = await store.get('schools', { id: saved.school_id });
      if (sch) await store.update('schools', sch.id, { student_count: (Number(sch.student_count) || 0) + 1 });
    }
    logBehavior(saved.id, '注册');
    json(res, 200, { user: await publicUser(saved), token: signToken({ uid: saved.id, role: saved.role }) });
  });

  /* ---- POST /api/login 返回 token（HMAC，7 天有效） ---- */
  route('POST', '/api/login', async (req, res) => {
    const b = await readBody(req);
    if (b === null) return badRequest(res, '请求体不是合法 JSON');
    const username = typeof b.username === 'string' ? b.username.trim() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    if (!username || !password) return badRequest(res, '用户名与密码必填');
    const u = await store.get('users', { username });
    if (!u || u.password !== sha256(password)) return unauthorized(res, '用户名或密码错误');
    logBehavior(u.id, '登录');
    json(res, 200, { user: await publicUser(u), token: signToken({ uid: u.id, role: u.role }) });
  });

  /* ---- GET /api/user/profile 获取用户信息 ---- */
  route('GET', '/api/user/profile', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    json(res, 200, { user: await publicUser(u) });
  });

  /* ---- PUT /api/user/profile 更新档案（前端兼容） ---- */
  route('PUT', '/api/user/profile', async (req, res) => {
    const u = await needAuth(req, res); if (!u) return;
    const b = await readBody(req);
    const patch = {};
    if (typeof b.nickname === 'string' && b.nickname.trim() && b.nickname.length <= 30) patch.nickname = b.nickname.trim();
    if (b.age !== undefined && b.age !== '') {
      const age = toInt(b.age);
      if (isInt(age, 1, 120)) patch.age = age; else return badRequest(res, '年龄需为 1-120 的整数');
    }
    if (typeof b.gender === 'string') patch.gender = b.gender.slice(0, 10);
    if (typeof b.region === 'string') patch.region = b.region.slice(0, 50);
    if (typeof b.avatar === 'string') patch.avatar = b.avatar.slice(0, 500);
    const schoolName = typeof b.school_name === 'string' ? b.school_name.trim().slice(0, 50) : '';
    if (schoolName && (u.role === 'student' || u.role === 'school')) {
      const tmp = await ensureSchool(Object.assign({}, u, { school_name: schoolName }), schoolName);
      patch.school_id = tmp.school_id;
    }
    if (Object.keys(patch).length === 0) return badRequest(res, '没有可更新的字段');
    const saved = await store.update('users', u.id, patch);
    if (!saved) return badRequest(res, '用户不存在');
    json(res, 200, { user: await publicUser(saved) });
  });
};
