// 心屿 MindIsle v5 · 演示种子数据（mock 模式，写入 server/data/db.json）
// 与 supabase/migrations/001_init.sql 的演示种子口径一致（账号/密码/邀请码/数据分布）。
// 运行：node seed.js（幂等：重建 db.json，不影响 data/secret.txt 即已有 token 仍有效）
// 全部数据为虚构脱敏演示数据。
const fs = require('fs');
const path = require('path');
const { sha256 } = require('./lib/auth');
const { DB_FILE, DATA_DIR } = require('./config');

const PWD = sha256('demo123456');
const d = (daysAgo, hour = 10) => new Date(Date.now() - daysAgo * 86400000 - (23 - hour) * 3600000).toISOString();

function buildDb() {
  let uid = 0, sid = 0, rid = 0;
  const db = {
    users: [], schools: [], ai_personality: [], chat_records: [], assessments: [],
    emotion_records: [], family_bindings: [], tree_hole: [], user_behavior: []
  };
  const ins = (table, row) => {
    row.id = db[table].length ? Math.max(...db[table].map(r => r.id)) + 1 : 1;
    if (row.created_time === undefined) row.created_time = d(0);
    db[table].push(row);
    return row;
  };
  const mkUser = (username, nickname, role, extra) => ins('users', Object.assign({
    username, password: PWD, nickname, role, age: '', gender: '', region: '', school_id: null, avatar: '', created_time: d(30)
  }, extra));

  /* 学校 */
  const schUni = ins('schools', { school_name: '示范大学', region: '北京市海淀区', student_count: 4, created_time: d(60) });
  const schXu = ins('schools', { school_name: '阳光社区附小', region: '上海市徐汇区', student_count: 2, created_time: d(50) });

  /* 用户（四角色） */
  const stu1 = mkUser('demo-stu1', '小雨同学', 'student', { age: 19, gender: '女', region: '北京市海淀区', school_id: schUni.id });
  const stu2 = mkUser('demo-stu2', '晨光同学', 'student', { age: 13, gender: '男', region: '北京市海淀区', school_id: schUni.id });
  const stu3 = mkUser('demo-stu3', '晚风同学', 'student', { age: 19, gender: '女', region: '北京市海淀区', school_id: schUni.id });
  mkUser('demo-user1', '林间用户', 'student', { age: 20, gender: '女', region: '' });
  const admin = mkUser('demo-admin1', '张老师', 'school', { age: 32, gender: '女', region: '北京市海淀区', school_id: schUni.id });
  const parent = mkUser('demo-parent1', '李妈妈', 'parent', { age: 40, gender: '女', region: '北京市海淀区' });
  mkUser('demo-com1', '王主任', 'community', { age: 45, gender: '女', region: '上海市徐汇区' });
  const seed1 = mkUser('seed-stu1', '小文同学', 'student', { age: 12, gender: '男', region: '上海市徐汇区', school_id: schXu.id });
  const seed2 = mkUser('seed-stu2', '小欣同学', 'student', { age: 12, gender: '女', region: '上海市徐汇区', school_id: schXu.id });

  /* AI 人格 */
  ins('ai_personality', { user_id: stu1.id, personality_type: '温柔倾听型', created_time: d(20) });
  ins('ai_personality', { user_id: seed2.id, personality_type: '理性分析型', created_time: d(15) });

  /* 测评 */
  ins('assessments', { user_id: stu1.id, type: 'PHQ-9', score: 8, level: '轻度', result: '轻度情绪困扰', created_time: d(21) });
  ins('assessments', { user_id: stu1.id, type: 'GAD-7', score: 10, level: '中度', result: '中度焦虑', created_time: d(18) });
  ins('assessments', { user_id: stu1.id, type: '压力测试', score: 22, level: '中等压力', result: '压力水平中等', created_time: d(14) });
  ins('assessments', { user_id: stu1.id, type: '孤独感测试', score: 24, level: '中度孤独感', result: '需要关注情感陪伴', created_time: d(7) });
  ins('assessments', { user_id: stu1.id, type: '睡眠测试', score: 9, level: '轻度问题', result: '轻度睡眠困扰', created_time: d(3) });
  ins('assessments', { user_id: stu1.id, type: 'PHQ-9', score: 6, level: '轻度', result: '轻度情绪困扰', created_time: d(1) });
  ins('assessments', { user_id: stu2.id, type: 'PHQ-9', score: 3, level: '正常', result: '状态良好', created_time: d(10) });
  ins('assessments', { user_id: stu2.id, type: '压力测试', score: 12, level: '较低压力', result: '压力水平较低', created_time: d(9) });
  ins('assessments', { user_id: stu3.id, type: 'GAD-7', score: 14, level: '中度', result: '中度焦虑', created_time: d(6) });
  ins('assessments', { user_id: seed1.id, type: 'PHQ-9', score: 11, level: '中度', result: '中度情绪困扰', created_time: d(8) });
  ins('assessments', { user_id: seed1.id, type: '孤独感测试', score: 18, level: '中度孤独感', result: '需要关注情感陪伴', created_time: d(4) });
  ins('assessments', { user_id: seed2.id, type: '压力测试', score: 15, level: '中等压力', result: '压力水平中等', created_time: d(5) });

  /* 情绪打卡：小雨同学近 14 天 */
  const emoSeq = [['焦虑', '高'], ['低落', '中'], ['平静', '低'], ['疲惫', '高'], ['开心', '低'], ['焦虑', '中'], ['平静', '低'], ['低落', '中'], ['疲惫', '中'], ['焦虑', '高'], ['开心', '中'], ['平静', '低'], ['低落', '高'], ['平静', '中']];
  emoSeq.forEach(([emotion, pressure], i) => {
    ins('emotion_records', { user_id: stu1.id, emotion, pressure, source: '每日打卡', created_time: d(13 - i, 19) });
  });
  ins('emotion_records', { user_id: stu2.id, emotion: '开心', pressure: '低', source: '每日打卡', created_time: d(2, 18) });
  ins('emotion_records', { user_id: stu3.id, emotion: '焦虑', pressure: '中', source: '每日打卡', created_time: d(1, 20) });
  ins('emotion_records', { user_id: seed1.id, emotion: '低落', pressure: '中', source: '每日打卡', created_time: d(3, 17) });
  ins('emotion_records', { user_id: seed2.id, emotion: '平静', pressure: '低', source: '每日打卡', created_time: d(1, 18) });
  ins('emotion_records', { user_id: stu1.id, emotion: '焦虑', pressure: '高', source: 'AI聊天', created_time: d(2, 21) });

  /* AI 聊天记录（记忆演示：先提考试压力 → 下次对话被 AI 引用） */
  ins('chat_records', {
    user_id: stu1.id,
    message: '最近考试压力很大，每天都睡不好',
    response: '我听到你最近承受着不小的考试压力，还影响了睡眠，这很辛苦。可以试着把复习任务拆小，每天只完成一小块；睡前一小时放下手机，做一组 4-7-8 呼吸。你愿意说说最担心哪一科吗？',
    emotion: '压力', risk_level: 'normal', created_time: d(2, 21)
  });
  ins('chat_records', {
    user_id: stu1.id,
    message: '和同桌闹矛盾了，不知道怎么办',
    response: '人际摩擦是成长里常遇到的事。可以试试「我信息」表达：描述事实+说出感受+提出请求。需要我陪你模拟一下怎么说吗？',
    emotion: '低落', risk_level: 'normal', created_time: d(1, 20)
  });
  ins('chat_records', {
    user_id: seed1.id,
    message: '最近好焦虑，感觉什么都做不好',
    response: '焦虑常常是对「不确定」的过度预警。试试把担心的事分成能控制的和不能控制的，把精力放在前者。你已经愿意说出来，这就是很好的第一步。',
    emotion: '焦虑', risk_level: 'attention', created_time: d(1, 22)
  });
  ins('chat_records', {
    user_id: stu3.id,
    message: '今天社团活动挺顺利，开心',
    response: '真为你开心！这种好的感觉值得被记住——要不要把它写进今天的情绪打卡？',
    emotion: '开心', risk_level: 'normal', created_time: d(1, 16)
  });

  /* 树洞 */
  ins('tree_hole', { user_id: stu1.id, content: '期中考试要来了，越想越睡不着，有没有同学也是这样？', emotion: '焦虑', risk_level: 'normal', created_time: d(2, 22) });
  ins('tree_hole', { user_id: seed2.id, content: '今天帮同学讲了一道题，他说谢谢，还挺开心的', emotion: '开心', risk_level: 'normal', created_time: d(1, 18) });

  /* 家庭绑定：李妈妈 ↔ 小雨同学（预绑定）+ 一条未绑定邀请码演示绑定流程 */
  ins('family_bindings', { student_id: stu1.id, parent_id: parent.id, invite_code: 'XY20260815', status: 'active', created_time: d(5) });
  ins('family_bindings', { student_id: seed1.id, parent_id: null, invite_code: 'XH20260001', status: 'active', created_time: d(2) });

  /* 行为台账 */
  ins('user_behavior', { user_id: stu1.id, action: '注册', created_time: d(21) });
  ins('user_behavior', { user_id: stu1.id, action: '登录', created_time: d(1, 8) });
  ins('user_behavior', { user_id: stu1.id, action: '聊天', created_time: d(1, 20) });
  ins('user_behavior', { user_id: stu1.id, action: '测评', created_time: d(1, 21) });
  ins('user_behavior', { user_id: stu1.id, action: '情绪打卡', created_time: d(0, 8) });
  ins('user_behavior', { user_id: stu1.id, action: '训练', created_time: d(2, 10) });
  ins('user_behavior', { user_id: parent.id, action: '注册', created_time: d(4) });
  ins('user_behavior', { user_id: admin.id, action: '注册', created_time: d(4) });
  ins('user_behavior', { user_id: seed2.id, action: '发布树洞', created_time: d(1, 18) });
  void rid; void sid; void uid;

  return db;
}

function writeDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(buildDb(), null, 2), 'utf8');
  console.log('✅ 心屿演示种子数据已写入 ' + DB_FILE);
  console.log('演示账号（密码均为 demo123456）：');
  console.log('  学生   demo-stu1    小雨同学（示范大学·海淀）');
  console.log('  学生   demo-stu2    晨光同学（示范大学）');
  console.log('  学生   demo-stu3    晚风同学（示范大学）');
  console.log('  学生   demo-user1   林间用户（无学校归属）');
  console.log('  家长   demo-parent1 李妈妈（已绑定小雨同学）');
  console.log('  学校   demo-admin1  张老师（示范大学）');
  console.log('  社区   demo-com1    王主任（上海市徐汇区）');
  console.log('  学生   seed-stu1    小文同学（阳光社区附小·徐汇，邀请码 XH20260001 待绑定）');
  console.log('  学生   seed-stu2    小欣同学（阳光社区附小·徐汇）');
}

if (require.main === module) {
  writeDb();
}

module.exports = { buildDb, writeDb };
