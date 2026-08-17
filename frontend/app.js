
/* ═══════════════ 工具函数 ═══════════════ */
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function fmtDay(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
let toastTimer;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function go(page){
  const cu=DB.currentUser();
  if(!cu && page!=='login'){showAuth();return;}
  if(cu && !cu.role && page!=='login' && page!=='role' && page!=='roleform'){showRolePage();return;}
  if(cu&&cu.role&&PAGE_ROLES[page]&&PAGE_ROLES[page].indexOf(cu.role)<0){toast('该功能不属于你的角色，已为你返回首页');go('home');return;}
  if(page==='mood-diary'&&!isPrimaryStudent(cu)){toast('心情日记仅对小学、初中学生开放');go('home');return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $('page-'+page).classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='chat'){initChat();maybeInjectScaleContext();}
  if(page==='mood-diary')renderMoodDiary();
  if(page==='home')renderHome();
  if(page==='community')renderPosts();
  if(page==='manage')renderManage();
  if(page==='profile')renderProfile();
  if(page==='child')renderChild();
  if(page==='edu')renderEdu();
  if(page==='family')renderFamily();
  if(page==='resources')renderResources();
  if(page==='referrals')renderReferrals();
  if(page==='portrait')renderPortrait();
  if(page==='school-trend')renderSchoolTrend();
  if(page==='school-grade')renderSchoolGrade();
  if(page==='school-focus')renderSchoolFocus();
  if(page==='school-privacy')renderSchoolPrivacy();
  if(page==='courses'){renderCourses();renderCourseVisits();}
  renderBottomNav();
  if(page!=='home')clearInterval(flipTimer);
}
function openModal(html){$('modal-body').innerHTML=html;$('modal-mask').classList.add('show');}
function closeModal(){$('modal-mask').classList.remove('show');}

/* ═══════════════ 密码哈希 & 本地数据库 ═══════════════ */
async function sha256(str){
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){ // 极老浏览器兜底（演示用）
    let h=0;for(let i=0;i<str.length;i++){h=(Math.imul(31,h)+str.charCodeAt(i))|0;}
    return 'x'+Math.abs(h).toString(36);
  }
}
const DB={
  get users(){try{return JSON.parse(localStorage.getItem('xinyu-users')||'{}');}catch(e){return {};}},
  saveUsers(u){localStorage.setItem('xinyu-users',JSON.stringify(u));},
  get session(){try{return JSON.parse(localStorage.getItem('xinyu-session')||'null');}catch(e){return null;}},
  setSession(s){localStorage.setItem('xinyu-session',JSON.stringify(s));},
  clearSession(){localStorage.removeItem('xinyu-session');},
  currentUser(){const s=this.session;if(!s)return null;const u=this.users[s.username]||null;if(u&&!u.username)u.username=s.username;return u;},
  saveUser(u){if(!u||!u.username)return;const users=this.users;users[u.username]=u;this.saveUsers(users);},
  dataKey(k){const u=this.session;return 'xinyu-'+k+'-'+(u?u.username:'anon');},
  getData(k,def){try{return JSON.parse(localStorage.getItem(this.dataKey(k))||'null')??def;}catch(e){return def;}},
  setData(k,v){localStorage.setItem(this.dataKey(k),JSON.stringify(v));}
};

/* ═══════════════ 角色与身份（v2.1） ═══════════════ */
const ROLE_DEFS={
  student:{name:'学生',short:'学生',tag:'在校学生'},
  normal:{name:'普通用户',short:'用户',tag:'一般用户'},
  school_admin:{name:'学校管理人员',short:'校管理员',tag:'教职工'},
  parent:{name:'家长',short:'家长',tag:'家庭端'},
  community_admin:{name:'社区管理人员',short:'社管理员',tag:'基层工作人员'}
};
const NAV_DEFS={
  student:[['home','首页'],['portrait','成长档案'],['scales','测评中心'],['chat','AI 疏导'],['train','自助训练'],['community','心屿 树洞'],['courses','课程库'],['profile','个人中心']],
  normal:[['home','首页'],['portrait','成长档案'],['scales','测评中心'],['chat','AI 疏导'],['train','自助训练'],['community','心屿 树洞'],['courses','课程库'],['profile','个人中心']],
  school_admin:[['home','首页'],['school-trend','趋势分析'],['school-grade','年级分析'],['school-focus','重点关注'],['school-privacy','隐私说明'],['courses','课程库'],['profile','个人中心']],
  parent:[['home','首页'],['child','孩子心理变化'],['edu','沟通课堂'],['family','家庭互动'],['courses','课程库'],['profile','个人中心']],
  community_admin:[['home','首页'],['manage','区域概览'],['resources','资源连接'],['referrals','转介记录'],['courses','课程库'],['profile','个人中心']]
};
const PAGE_ROLES={
  manage:['school_admin','community_admin'],
  child:['parent'],edu:['parent'],family:['parent'],
  resources:['community_admin'],referrals:['community_admin'],
  community:['student','normal'],
  scales:['student','normal'],chat:['student','normal'],train:['student','normal'],test:['student','normal'],result:['student','normal'],
  portrait:['student','normal'],
  'school-trend':['school_admin'],'school-grade':['school_admin'],'school-focus':['school_admin'],'school-privacy':['school_admin'],
  courses:['student','normal','school_admin','parent','community_admin']
};
function getRoleName(r){return (ROLE_DEFS[r]||{}).name||'未设置';}
function isAdminUser(u){return u&&(u.role==='school_admin'||u.role==='community_admin');}
function renderNav(){
  const nav=$('main-nav');if(!nav)return;
  const u=DB.currentUser();
  const items=!u
    ?[['home','首页'],['scales','测评中心'],['chat','AI 疏导'],['train','自助训练'],['community','心屿 树洞'],['profile','个人中心']]
    :isPrimaryStudent(u)?[['home','首页'],['portrait','成长档案'],['scales','测评中心'],['chat','AI 疏导'],['train','自助训练'],['community','心屿树洞'],['courses','课程库'],['profile','个人中心']]
    :(u&&NAV_DEFS[u.role])?NAV_DEFS[u.role]:[];
  nav.innerHTML=items.map(([p,l])=>`<button data-page="${p}">${l}</button>`).join('');
  nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
}

/* ═══════════════ 全局台账 roster（信息管理数据源，v2.1） ═══════════════ */
function getRoster(){try{return JSON.parse(localStorage.getItem('xinyu-roster')||'{}');}catch(e){return {};}}
function saveRoster(r){localStorage.setItem('xinyu-roster',JSON.stringify(r));}
function scaleLevelOf(scaleId,total){
  const s=SCALES.find(x=>x.id===scaleId);if(!s)return {label:'—',cls:'mild'};
  const lv=getLevel(s,total);return {label:lv.label,cls:lv.cls};
}
function syncRoster(u){
  if(!u)return;
  const r=getRoster();
  r[u.username]={
    username:u.username,nickname:u.nickname,avatar:u.avatar||'',
    role:u.role||'',orgType:u.orgType||'',orgName:u.orgName||'',region:u.region||'',
    grade:u.grade||'',className:u.className||'',childUsername:u.childUsername||'',tags:u.tags||[],
    joinedAt:u.createdAt,lastActive:Date.now(),
    records:(u.records||[]).map(x=>({scaleId:x.scaleId,total:x.total,date:x.date,answers:x.answers||[],level:scaleLevelOf(x.scaleId,x.total).label,cls:scaleLevelOf(x.scaleId,x.total).cls})),
    trainings:(u.trainings||[]).map(t=>({type:t.type,date:t.date})),
    postCount:u.postCount||0,replyCount:u.replyCount||0,repostCount:u.repostCount||0,chatCount:u.chatCount||0,
    referred:u.referred||false,referredAt:u.referredAt||0
  };
  saveRoster(r);
}

/* ═══════════════ 角色选择与分流（v2.1） ═══════════════ */
function showRolePage(){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $('page-role').classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  window.scrollTo({top:0,behavior:'smooth'});
}
let pendingRole=null;
function chooseRole(role){pendingRole=role;renderRoleForm(role);}
function backToRole(){pendingRole=null;showRolePage();}
function renderRoleForm(role){
  const d=ROLE_DEFS[role];
  $('rf-step').innerHTML='<b>第 2 步 / 共 2 步</b> · 已选择身份：'+d.name;
  if(role==='student'){
    $('rf-title').textContent='填写学校信息';
    $('rf-sub').textContent='完善学校信息后即可进入平台（年级覆盖小学一年级至博士研究生，选择后测评、课程与内容会按年级智能匹配）';
    $('rf-form').innerHTML=`
      <div class="field"><label>学校名称 *</label><input id="rf-school" placeholder="例如：XX小学 / XX中学 / XX大学"></div>
      <div class="field"><label>所在地区 *</label><input id="rf-region" placeholder="例如：浙江省杭州市余杭区"></div>
      <div class="field"><label>年级 *（小学一年级～博士研究生）</label>
        <select id="rf-grade" onchange="renderRfClass()">${gradeOptionsHtml('')}</select></div>
      <div class="field" id="rf-class-field" style="display:none;"><label>班级（选填）</label><input id="rf-class" placeholder="例如：三年级 2 班 / 计科 2301 班"></div>
      <div class="field"><label>专业 / 方向（选填）</label><input id="rf-major" placeholder="例如：计算机科学与技术 / 语数英（小学可不填）"></div>`;
  }else if(role==='normal'){
    $('rf-title').textContent='完善身份信息（选填）';
    $('rf-sub').textContent='可跳过。填写归属后，你的心理状态与测评数据会同步给对应学校/社区管理员的「信息管理」。';
    $('rf-form').innerHTML=`
      <div class="field"><label>归属类型（选填）</label>
        <select id="rf-orgtype"><option value="">暂不选择</option><option value="school">学校</option><option value="community">社区</option><option value="street">街道</option></select></div>
      <div class="field"><label>学校 / 社区 / 街道名称（选填）</label><input id="rf-school" placeholder="填写后数据按此名称归入对应管理员台账"></div>
      <div class="field"><label>所在地区（选填）</label><input id="rf-region" placeholder="例如：广东省广州市天河区"></div>
      <div style="margin-top:6px;text-align:right;"><button class="suggest" onclick="skipNormalRole()">跳过，直接进入平台 →</button></div>`;
    $('rf-submit').textContent='保存并进入平台';
  }else if(role==='parent'){
    $('rf-title').textContent='家长信息';
    $('rf-sub').textContent='绑定孩子后，可查看孩子的心理状态变化、学习沟通方式、获取家庭互动建议。孩子用户名可稍后绑定。';
    $('rf-form').innerHTML=`
      <div class="field"><label>孩子用户名（选填，进入后可再绑定）</label><input id="rf-school" placeholder="输入孩子的账号用户名，例如：demo-stu1"></div>
      <div class="field"><label>所在地区（选填）</label><input id="rf-region" placeholder="例如：浙江省杭州市余杭区"></div>`;
  }else if(role==='school_admin'){
    $('rf-title').textContent='填写学校信息';
    $('rf-sub').textContent='你将看到本校学生的心理状态、测评结果与训练情况（信息管理模块）。';
    $('rf-form').innerHTML=`
      <div class="field"><label>学校名称 *</label><input id="rf-school" placeholder="与本校学生填写的学校名称保持一致，才能匹配到数据"></div>
      <div class="field"><label>所在地区 *</label><input id="rf-region" placeholder="例如：北京市海淀区"></div>
      <div class="field"><label>职务（选填）</label>
        <select id="rf-title2"><option value="">请选择</option><option>心理老师</option><option>辅导员</option><option>校医院工作人员</option><option>其他教职工</option></select></div>`;
  }else if(role==='community_admin'){
    $('rf-title').textContent='填写社区 / 街道信息';
    $('rf-sub').textContent='你将看到该区域居民的心理状态、测评结果与训练情况（信息管理模块）。';
    $('rf-form').innerHTML=`
      <div class="field"><label>机构类型 *</label>
        <select id="rf-orgtype2"><option value="community">社区</option><option value="street">街道</option></select></div>
      <div class="field"><label>社区 / 街道名称 *</label><input id="rf-school" placeholder="与居民填写的名称保持一致，才能匹配到数据"></div>
      <div class="field"><label>所在地区 *</label><input id="rf-region" placeholder="例如：上海市徐汇区"></div>
      <div class="field"><label>职务（选填）</label>
        <select id="rf-title2"><option value="">请选择</option><option>社区工作者</option><option>网格员</option><option>其他工作人员</option></select></div>`;
  }
  if(role==='student'){
    const form=$('rf-form'), grade=$('rf-grade');
    if(form&&grade){
      const stageField=document.createElement('div');
      stageField.className='field';
      stageField.innerHTML='<label>学段 *</label><select id="rf-stage"><option value="">请选择学段</option><option value="primary">小学</option><option value="junior">初中</option><option value="senior">高中</option><option value="college">本科</option><option value="master">硕士</option><option value="doctor">博士</option></select>';
      form.insertBefore(stageField,form.firstChild);
      grade.disabled=true;
      grade.innerHTML='<option value="">请先选择学段</option>';
      $('rf-stage').onchange=onRfStageChange;
    }
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $('page-roleform').classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
function onRfStageChange(){
  const key=$('rf-stage')&&$('rf-stage').value, grade=$('rf-grade');
  const st=GRADE_STAGES.find(x=>x.key===key);
  if(!grade)return;
  grade.disabled=!st;
  grade.innerHTML=st?'<option value="">请选择年级</option>'+st.grades.map(g=>'<option value="'+g+'">'+g+'</option>').join(''):'<option value="">请先选择学段</option>';
  renderRfClass();
}
function submitRoleForm(){
  const u=DB.currentUser();if(!u)return;
  const role=pendingRole;if(!role){toast('请先选择身份');return;}
  const school=$('rf-school')?$('rf-school').value.trim():'';
  const region=$('rf-region')?$('rf-region').value.trim():'';
  if(role==='student'){
    if(!school){toast('请填写学校名称');return;}
    if(!region){toast('请填写所在地区');return;}
    const stage=$('rf-stage')&&$('rf-stage').value;
    if(!stage){toast('请选择学段');return;}
    const grade=$('rf-grade').value;
    if(!grade){toast('请选择年级（小学一年级至博士研究生）');return;}
    u.role=role;u.orgType='school';u.orgName=school;u.region=region;
    u.grade=grade;u.className=$('rf-class')?$('rf-class').value.trim():'';u.major=$('rf-major').value.trim();
  }else if(role==='normal'){
    u.role=role;
    const ot=$('rf-orgtype').value;
    if(ot&&!school){toast('已选择归属类型，请填写对应机构名称，或把类型改为「暂不选择」');return;}
    u.orgType=ot||'';u.orgName=ot?school:'';u.region=region;
  }else if(role==='parent'){
    u.role=role;
    const child=$('rf-school')?$('rf-school').value.trim():'';
    if(child){
      const c=DB.users[child];
      if(!c){toast('未找到该用户名，请确认孩子已注册，或清空后跳过');return;}
      if(c.role!=='student'&&c.role!=='normal'){toast('该账号不是学生/普通用户，无法绑定为孩子');return;}
      if(child===u.username){toast('不能绑定自己');return;}
      u.childUsername=child;
    }else{u.childUsername='';}
    u.region=region;
  }else if(role==='school_admin'){
    if(!school){toast('请填写学校名称');return;}
    if(!region){toast('请填写所在地区');return;}
    u.role=role;u.orgType='school';u.orgName=school;u.region=region;u.title=$('rf-title2')?$('rf-title2').value:'';
  }else if(role==='community_admin'){
    if(!school){toast('请填写机构名称');return;}
    if(!region){toast('请填写所在地区');return;}
    u.role=role;u.orgType=$('rf-orgtype2').value;u.orgName=school;u.region=region;u.title=$('rf-title2')?$('rf-title2').value:'';
  }
  u.roleSetAt=Date.now();
  DB.saveUser(u);
  syncRoster(u);
  pendingRole=null;
  toast('身份已确认：'+(ROLE_DEFS[role]?ROLE_DEFS[role].name:role)+' ✅');
  afterLogin();
}
function skipNormalRole(){
  const u=DB.currentUser();if(!u)return;
  u.role='normal';u.orgType='';u.orgName='';u.region='';u.roleSetAt=Date.now();
  DB.saveUser(u);syncRoster(u);pendingRole=null;
  toast('已以普通用户身份进入（可随时在个人中心补充归属信息）');
  afterLogin();
}
function renderRfClass(){const f=$('rf-class-field');if(f)f.style.display=$('rf-grade').value?'block':'none';}
function renderNavAdmin(){renderNav();}

/* ═══════════════ 用户系统 ═══════════════ */
function switchAuthTab(tab){
  $('tab-login').classList.toggle('active',tab==='login');
  $('tab-register').classList.toggle('active',tab==='register');
  if(tab==='login'){
    $('auth-form').innerHTML=`
      <div class="field"><label>用户名 / 昵称</label><input id="au-name" placeholder="输入你的用户名"></div>
      <div class="field"><label>密码</label><input id="au-pass" type="password" placeholder="输入密码"></div>
      <button class="btn btn-teal" style="width:100%;" onclick="doLogin()">登 录</button>`;
  }else{
    $('auth-form').innerHTML=`
      <div class="field"><label>昵称（展示用）</label><input id="ru-nick" placeholder="例如：小屿同学"></div>
      <div class="field"><label>用户名（登录用，3-20位）</label><input id="ru-name" placeholder="例如：xinyu2026"></div>
      <div class="field"><label>密码（至少6位）</label><input id="ru-pass" type="password" placeholder="设置密码"></div>
      <div class="field"><label>确认密码</label><input id="ru-pass2" type="password" placeholder="再次输入密码"></div>
      <button class="btn btn-teal" style="width:100%;" onclick="doRegister()">注 册</button>`;
  }
}
async function doLogin(){
  const name=$('au-name').value.trim(),pass=$('au-pass').value;
  if(!name||!pass){toast('请填写用户名和密码');return;}
  const users=DB.users;
  if(!users[name]){toast('该用户名不存在，请先注册');return;}
  const hash=await sha256(pass);
  if(users[name].password!==hash){toast('密码错误，请重试');return;}
  DB.setSession({username:name,loginAt:Date.now()});
  toast('欢迎回来，'+users[name].nickname+' 👋');
  afterLogin();
}
async function doRegister(){
  const nick=$('ru-nick').value.trim(),name=$('ru-name').value.trim(),pass=$('ru-pass').value,pass2=$('ru-pass2').value;
  if(!nick){toast('请填写昵称');return;}
  if(!/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/.test(name)){toast('用户名需 3-20 位（字母/数字/下划线/中文）');return;}
  if(pass.length<6){toast('密码至少 6 位');return;}
  if(pass!==pass2){toast('两次密码不一致');return;}
  const users=DB.users;
  if(users[name]){toast('该用户名已被注册');return;}
  users[name]={username:name,nickname:nick,password:await sha256(pass),createdAt:Date.now(),records:[],trainings:[],chatCount:0};
  DB.saveUsers(users);
  DB.setSession({username:name,loginAt:Date.now()});
  toast('注册成功，欢迎加入心屿 🎉');
  afterLogin();
}
function showAuth(){
  switchAuthTab('login');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $('page-login').classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  renderNav();
}
function logout(){
  DB.clearSession();
  document.body.classList.remove('primary-theme');
  applyTheme(null);
  toast('已退出登录');
  showAuth();
}
function afterLogin(){
  renderUserArea();
  renderHome();
  const u=DB.currentUser();
  applyTheme(u);
  if(!u||!u.role){showRolePage();return;}
  if(u.role&&!NAV_DEFS[u.role]){u.role='normal';DB.saveUser(u);syncRoster(u);}
  renderNavAdmin();
  renderBottomNav();
  initChat();
  go('home');
  showWelcomePopup();
}
function renderUserArea(){
  const u=DB.currentUser();
  const area=$('user-area');
  if(!u){area.innerHTML='<button class="u-btn" onclick="showAuth()">登录 / 注册</button>';return;}
  const av=avatarHTML(u,28,'avatar');
  const rb=u.role?`<span class="role-badge">${esc(ROLE_DEFS[u.role]?ROLE_DEFS[u.role].short:'')}</span>`:'';
  const themeBtn=isThemeEligible(u)?`<button class="u-btn theme-btn" onclick="openThemePanel()" title="风格设置">🎨</button>`:'';
  area.innerHTML=`<div class="user-menu" onclick="go('profile')">${av}<b>${esc(u.nickname)}</b>${rb}</div>
  ${themeBtn}
  <button class="u-btn" onclick="logout()">退出</button>`;
}
/* ═══════════════ 量表数据（国际标准） ═══════════════ */
const SCALES=[
  {id:'phq9',name:'抑郁自评量表',en:'PHQ-9 · Patient Health Questionnaire-9',time:'约3分钟',items:9,
   intro:'过去两周内，以下问题困扰你的频率是？本量表为国际通用的抑郁症筛查工具（PHQ-9），总分 0-27 分。',
   options:[['完全没有',0],['有几天',1],['一半以上天数',2],['几乎每天',3]],
   questions:['做事时提不起劲或没有兴趣','感到心情低落、沮丧或绝望','入睡困难、睡不安稳或睡眠过多','感觉疲倦或没有活力','食欲不振或吃太多','觉得自己很糟、觉得自己很失败、或让自己或家人失望','对事物专注有困难（例如阅读报纸或看电视时）','行动或说话速度缓慢到别人已经察觉，或刚好相反——变得比平日更烦躁或坐立不安','有不如死掉或用某种方式伤害自己的念头'],
   max:27,
   levels:[{min:0,max:4,label:'心理状态良好',cls:'mild',desc:'整体状态平稳。继续保持规律作息、运动与社交，建议每周做一次正念练习巩固心理韧性。',recs:[['巩固练习','每周做 1-2 次呼吸或正念练习，保持好状态'],['规律生活','坚持固定作息与运动，维持支持性社交']]},
     {min:5,max:9,label:'轻度情绪困扰',cls:'mild',desc:'存在轻度情绪波动，属于正常范围但值得关注。多数同学经过自我调节可以缓解。',recs:[['AI 疏导','和心屿聊聊你的感受，梳理近期压力源'],['认知重构','练习识别消极自动化思维'],['4-7-8 呼吸','每天睡前做一组，帮助放松']]},
     {min:10,max:14,label:'中度情绪困扰',cls:'moderate',desc:'情绪困扰较明显，可能已影响学习与生活。建议坚持使用自助训练，并预约学校心理咨询中心进行一次专业评估。',recs:[['坚持训练','每天完成至少一项自助训练（情绪日记/认知重构）'],['预约咨询','建议预约学校心理咨询中心做专业评估'],['减少压力源','适当降低近期任务强度，保证睡眠']]},
     {min:15,max:19,label:'中重度困扰 · 建议寻求专业帮助',cls:'severe',desc:'你的感受值得被专业支持。请尽快预约学校心理咨询中心或专业机构进行评估，AI 只能提供辅助支持。',recs:[['立即转介','尽快联系学校心理咨询中心或拨打 12356'],['告知信任的人','把情况告诉辅导员或信任的亲友'],['安全第一','暂时远离高危环境，保持与他人的联系']]},
     {min:20,max:27,label:'重度困扰 · 请尽快就医评估',cls:'severe',desc:'你的感受非常需要专业支持。请尽快联系学校心理咨询中心、拨打心理援助热线 12356，或前往精神卫生专业机构。请一定不要独自承受。',recs:[['紧急转介','立即联系专业机构：热线 12356 或学校心理中心'],['告知他人','务必告知辅导员/室友/家人，请他们陪同'],['停止独处','近期不要单独行动，保持与信任的人联系']]}],
   ref:'PHQ-9: Spitzer RL, Kroenke K, Williams JBW. JAMA. 1999;282(18):1737-1744. 分界标准：0-4 无/轻度，5-9 轻度，10-14 中度，15-19 中重度，20-27 重度。'},
  {id:'gad7',name:'焦虑自评量表',en:'GAD-7 · Generalized Anxiety Disorder-7',time:'约2分钟',items:7,
   intro:'过去两周内，你有多频繁地被以下问题困扰？GAD-7 是国际通用的广泛性焦虑筛查工具，总分 0-21 分。',
   options:[['完全没有',0],['有几天',1],['一半以上天数',2],['几乎每天',3]],
   questions:['感到紧张、焦虑或急切','不能停止或控制担忧','对各种各样的事情担忧过多','很难放松下来','由于不安而无法静坐','变得容易烦恼或被激怒','感到似乎有可怕的事情会发生'],
   max:21,
   levels:[{min:0,max:4,label:'焦虑水平正常',cls:'mild',desc:'焦虑水平在正常范围。',recs:[['4-7-8 呼吸','感到紧张时随时可用'],['保持规律','维持规律作息与运动']]},
     {min:5,max:9,label:'轻度焦虑',cls:'mild',desc:'存在轻度焦虑，常见于考试季或压力期，多数可自行调节。',recs:[['呼吸练习','每天做 2 组 4-7-8 呼吸'],['认知重构','练习识别「灾难化」想法'],['接地练习','焦虑来袭时用 5-4-3-2-1 接地法']]},
     {min:10,max:14,label:'中度焦虑',cls:'moderate',desc:'焦虑程度较明显，可能影响睡眠与专注力，建议积极干预。',recs:[['坚持训练','每天完成接地练习或呼吸训练'],['情绪日记','记录焦虑的触发事件与强度'],['建议咨询','考虑预约学校心理咨询中心']]},
     {min:15,max:21,label:'重度焦虑 · 建议专业评估',cls:'severe',desc:'焦虑水平较高，请尽快寻求专业帮助，不要独自硬扛。',recs:[['立即转介','联系学校心理咨询中心或拨打 12356'],['告知信任的人','把情况告诉辅导员或亲友'],['安全第一','保持与他人的联系']]}],
   ref:'GAD-7: Spitzer RL, Kroenke K, Williams JBW, Löwe B. Arch Intern Med. 2006;166(10):1092-1097. 分界：0-4 无/轻微，5-9 轻度，10-14 中度，15-21 重度。'},
  {id:'pss10',name:'压力知觉量表',en:'PSS-10 · Perceived Stress Scale',time:'约3分钟',items:10,
   intro:'过去一个月内，以下情况多久发生一次？PSS-10（Cohen 编制）是国际最常用的压力感知测量工具，总分 0-40 分。',
   options:[['从不',0],['几乎没有',1],['有时',2],['经常',3],['总是',4]],
   questions:['因为发生意外的事情而感到心烦意乱','感到无法控制生活中重要的事情','感到紧张和压力','能够成功地处理恼人的生活麻烦（反向）','感到自己能有效地处理生活中发生的重大变化（反向）','发现自己无法处理所有自己必须做的事情','能够控制生活中的恼怒情绪（反向）','感到事情顺心如意（反向）','被一些超出自己控制范围的事情激怒','感到困难的事情堆积如山，自己无法克服'],
   reverse:[3,4,6,7],
   max:40,
   levels:[{min:0,max:13,label:'压力水平较低',cls:'mild',desc:'当前感知压力处于较低水平，心理状态较轻松。',recs:[['保持习惯','维持现有的良好调节方式'],['三件好事','可以尝试积极心理练习巩固状态']]},
     {min:14,max:26,label:'中等压力',cls:'moderate',desc:'感知压力处于中等水平，常见于学业与生活过渡期，需要主动调节。',recs:[['压力管理','每天做呼吸练习 + 情绪日记'],['合理规划','把大任务拆小，减少「堆积感」'],['运动调节','每周 3 次 30 分钟运动']]},
     {min:27,max:40,label:'高压力水平',cls:'severe',desc:'感知压力较高，长期处于此状态可能影响身心健康，建议积极调整并寻求支持。',recs:[['立即行动','减少任务负荷，优先保证睡眠'],['求助支持','与辅导员/朋友/心理咨询中心沟通'],['每天训练','坚持接地练习与正念呼吸']]}],
   ref:'PSS-10: Cohen S, Kamarck T, Mermelstein R. J Health Soc Behav. 1983;24(4):385-396. 常用解读：0-13 低压力，14-26 中等，27-40 高压力。第 4、5、7、8 题反向计分。'},
  {id:'isi7',name:'失眠严重程度指数',en:'ISI · Insomnia Severity Index',time:'约2分钟',items:7,
   intro:'请评估你最近两周的睡眠状况。ISI（Morin 编制）是国际通用的失眠严重程度评估工具，总分 0-28 分。',
   options:[['完全没有',0],['轻度',1],['中度',2],['重度',3],['极重度',4]],
   questions:['入睡困难','维持睡眠困难（夜间易醒）','早醒问题（醒后难以再入睡）','你对当前睡眠模式的满意程度（0=非常满意 → 4=非常不满意）','你的睡眠问题在多大程度上干扰了你的日常功能（0=无干扰 → 4=非常严重干扰）','你的睡眠问题在多大程度上降低了你的生活质量（0=无 → 4=非常多）','你对自己当前的睡眠问题有多担心/苦恼（0=完全不 → 4=非常）'],
   max:28,
   levels:[{min:0,max:7,label:'无明显失眠',cls:'mild',desc:'睡眠状况良好，未达到临床失眠标准。',recs:[['保持作息','维持规律睡眠时间'],['睡前放松','可用 4-7-8 呼吸助眠']]},
     {min:8,max:14,label:'阈下失眠（轻度）',cls:'mild',desc:'存在轻度睡眠困扰，尚未达到临床失眠标准，但值得关注。',recs:[['睡眠卫生','睡前一小时远离屏幕'],['4-7-8 呼吸','睡前练习帮助放松'],['刺激控制','睡不着就离开床，困了再回来']]},
     {min:15,max:21,label:'中度失眠（临床水平）',cls:'moderate',desc:'达到临床失眠标准，建议接受专业评估与干预（如 CBT-I 失眠认知行为治疗）。',recs:[['寻求帮助','建议咨询学校心理中心，CBT-I 对失眠有效'],['固定起床时间','无论睡多久，每天固定时间起床'],['睡前引导','使用「睡前放松引导」训练模块']]},
     {min:22,max:28,label:'重度失眠',cls:'severe',desc:'失眠程度较严重，强烈建议尽快寻求专业医疗帮助。',recs:[['尽快就医','前往睡眠门诊或精神科评估'],['告知家人','寻求家人陪伴与支持'],['避免自行用药','不要自行服用安眠药']]}],
   ref:'ISI: Morin CM. Insomnia: Psychological Assessment and Management. Guilford Press, 1993. 分界：0-7 无临床显著失眠，8-14 阈下，15-21 中度（临床失眠），22-28 重度。'},
  {id:'rses',name:'自尊量表',en:'RSES · Rosenberg Self-Esteem Scale',time:'约2分钟',items:10,
   intro:'请根据你平时对自己的看法，选择最符合的选项。RSES（Rosenberg 编制，季益富、于欣 1993 中文修订版）是国际应用最广泛的自尊测量工具。',
   options:[['非常不同意',1],['不同意',2],['同意',3],['非常同意',4]],
   questions:['我觉得自己是个有价值的人，至少与别人不相上下','我觉得我有许多好的品质','归根到底，我倾向于觉得自己是一个失败者','我能像大多数人一样把事情做好','我觉得自己值得自豪的地方不多','我对自己持肯定态度','总的说来，我对自己是满意的','我希望我能为自己赢得更多尊重','有时我确实感到自己很没用','有时我觉得自己一无是处'],
   reverse:[2,4,7,8,9],
   max:40,
   levels:[{min:10,max:24,label:'自尊水平偏低',cls:'moderate',desc:'你对自己的评价偏低，可能伴随自我怀疑，但这是可以通过练习逐步改善的。',recs:[['认知重构','识别「我不够好」等自动化想法并检验证据'],['三件好事','每天记录 3 件让你感觉不错的小事'],['和 AI 聊聊','梳理你的自我评价来源']]},
     {min:25,max:35,label:'自尊水平正常',cls:'mild',desc:'你总体上能够客观地看待自己，自尊水平在正常范围。',recs:[['巩固练习','定期做三件好事练习'],['自我肯定','写下自己的优点清单']]},
     {min:36,max:40,label:'自尊水平较高',cls:'mild',desc:'你对自己有积极的整体评价，这是很好的心理资源。',recs:[['保持谦逊','高自尊与良好的人际边界结合更健康'],['帮助他人','在心屿 树洞分享你的经验']]}],
   ref:'RSES: Rosenberg M. Society and the Adolescent Self-Image. Princeton University Press, 1965. 中文版：季益富、于欣 1993 年翻译修订。计分：每题 1-4 分（非常不同意=1 到 非常同意=4），第 3、5、8、9、10 题反向计分，总分 10-40（≤24 偏低，25-35 正常，≥36 较高）。'}
];
function toggleLeftBehindTag(username){
  const users=DB.users;
  const u=users[username];
  if(!u){toast('未找到该用户');return;}
  u.tags=u.tags||[];
  const i=u.tags.indexOf('leftbehind');
  if(i>=0)u.tags.splice(i,1);else u.tags.push('leftbehind');
  DB.saveUsers(users);
  syncRoster(u);
  toast(u.tags.includes('leftbehind')?'🏷️ 已标注为留守儿童：该学生测评中心将优先推荐孤独感测评，AI 交流也会更关注情感陪伴':'已取消留守儿童标注');
  showPerson(username);
  if($('scale-grid'))renderScaleGrid();
}
/* 测评中心：青少年专项展示（留守儿童优先推荐孤独感） */
const PRIMARY_SCALE_COPY={
  loneliness:{title:'独处情绪小测评',professional:'孤独感测试',questions:['你有多常觉得身边少了可以陪伴你的人？','你有多常觉得心里话找不到人说？','你有多常觉得自己能自然地融入身边的同学或朋友？','你有多常觉得自己被大家忽略了？','你有多常觉得和身边的人有一些距离？','你有多常觉得有人真正懂你的感受？','你有多常想找人聊聊，却不知道可以找谁？','你有多常觉得让别人理解自己并不容易？']},
  family:{title:'家庭相处小测评',professional:'家庭关系测评',questions:['最近，家人会主动问问你的心情和近况吗？','有烦恼时，你能比较自然地告诉家人吗？','一家人吃饭或相处时，气氛通常轻松吗？','你说话时，家人愿意先听你说完吗？','遇到困难时，你能感受到家人的支持吗？','家人的话语或行动，会让你感到被爱吗？','你愿意主动和家人分享学校或生活里的事情吗？','你相信家人对你的关心是真诚的吗？']},
  sleep:{title:'睡眠状态小测评',professional:'睡眠质量测评',questions:['最近躺下后，你会超过30分钟还睡不着吗？','夜里醒来后，你会很难再次睡着吗？','你会早早醒来，而且没办法继续睡吗？','白天会因为没睡好而犯困或难以集中注意力吗？','睡眠问题会让你觉得烦躁或低落吗？','你会因为担心睡不好，反而更难入睡吗？','睡觉前，你的脑海会一直想着各种事情、停不下来吗？']},
  phq9:{title:'低落情绪自查',professional:'抑郁自评量表',questions:['最近做事情时，你会觉得提不起劲或没什么兴趣吗？','最近会常常觉得心情低落、难过，或者看不到希望吗？','最近会难以入睡、睡不安稳，或者睡得太多吗？','最近会觉得身体很累，做事没有力气吗？','最近会不太想吃东西，或者比平时吃得更多吗？','最近会觉得自己不够好、很失败，或者让自己和家人失望了吗？','最近阅读、听课或看视频时，会很难集中注意力吗？','最近动作或说话会慢很多，或者反而烦躁得很难安静下来吗？','最近有没有出现过不想活着，或想用某种方式伤害自己的念头？']},
  gad7:{title:'紧张情绪自查',professional:'焦虑自评量表',questions:['最近会常常觉得紧张、不安或心里着急吗？','开始担心后，会觉得很难让自己停下来吗？','最近会为许多不同的事情担心太多吗？','最近会觉得身体和心情很难放松下来吗？','最近会因为不安而很难安静坐着吗？','最近是不是比平时更容易烦恼或生气？','最近会担心可能有不好的事情发生吗？']},
  pss10:{title:'压力状况小测评',professional:'压力知觉量表',questions:['最近一个月，意外发生的事情会让你很心烦吗？','最近会觉得生活中重要的事情不在自己掌握中吗？','最近会常常觉得紧张、有压力吗？','最近能顺利处理生活里让人烦恼的小麻烦吗？','最近能适应生活里发生的重要变化吗？','最近会觉得要做的事情太多，自己处理不过来吗？','最近能让自己从生气或烦躁中平静下来吗？','最近会觉得不少事情都进行得比较顺利吗？','最近会因为无法控制的事情而生气吗？','最近会觉得困难一件接一件，自己很难解决吗？']},
  isi7:{title:'睡眠烦恼自查',professional:'睡眠严重程度指数自评量表',questions:['最近入睡困难的情况有多明显？','最近夜里容易醒、很难继续睡的情况有多明显？','最近醒得太早、无法继续睡的情况有多明显？','你对自己最近的睡眠状态有多不满意？','睡眠问题对你白天学习和生活的影响有多明显？','睡眠问题对你日常心情和生活质量的影响有多明显？','你对目前的睡眠问题有多担心或苦恼？']}
};
function renderScaleGrid(){
  const g=$('scale-grid');if(!g)return;
  const u=DB.currentUser();
  const primary=isPrimaryStudent(u);$('page-scales').classList.toggle('kid-scales',primary);
  const scaleSub=$('page-scales').querySelector('.sub');if(scaleSub)scaleSub.textContent=primary?'用温和的小测评了解最近的情绪、压力、相处和睡眠状态。答案没有对错，按照真实感受选择就好。':'8 套通用标准化量表（Standardized Instruments）：5 套国际经典量表 + 3 套青少年专项（孤独感/家庭关系/睡眠质量），均标注出处与分界标准。测评结果自动保存，并进入 AI 分级支持与心理成长档案。';
  const leftTag=u&&u.tags&&u.tags.includes('leftbehind');
  const st=gradeStageOf(u&&u.grade||'');
  const recIds=u&&u.grade&&st?gradeRecommendScales(st.key):[];
  const source=primary?SCALES.filter(s=>PRIMARY_SCALE_COPY[s.id]):SCALES;
  const ordered=[...source].sort((a,b)=>(recIds.includes(b.id)?1:0)-(recIds.includes(a.id)?1:0));
  const tipHtml=(u&&u.grade&&st)?`<div class="role-tip">🎯 已按你的年级（${esc(u.grade)} ${st.icon} ${esc(st.name)}）智能匹配推荐：${recIds.map(id=>{const s=SCALES.find(x=>x.id===id);return s?esc(s.name):'';}).filter(Boolean).join('、')}（优先展示在上方）。</div>`:'';
  g.innerHTML=tipHtml+ordered.map(s=>{
    const isYouth=['loneliness','family','sleep'].includes(s.id);
    const isLon=s.id==='loneliness';
    const copy=PRIMARY_SCALE_COPY[s.id];return `
    <div class="scale-card" onclick="startTest('${s.id}')" style="${isLon&&leftTag?'border-color:var(--v4-coral);background:#fff5f6;':''}">
      <div class="s-top"><div><div class="s-name">${primary?copy.title:s.name}${isYouth?' <span class="youth-mark">青少年专项</span>':''}</div><div class="s-en">${primary?copy.professional:s.en}</div></div><span class="s-badge">${isYouth?'专项筛查':'国际标准'}</span></div>
      <p>${s.intro}</p>
      ${isLon&&leftTag?'<div class="scale-info" style="margin-top:8px;background:#fce7f3;border-color:#fbcfe8;color:#9d174d;">🏷️ 你已被老师/社区标注为留守儿童，平台为你优先推荐这套孤独感测评，重点关注情感陪伴与社交关系。</div>':''}
      <div class="s-meta"><span>🕐 ${s.time}</span><span>📝 ${s.items} 题</span><span>🧮 总分 ${s.max} 分</span></div>
    </div>`;
  }).join('');
}
let currentScale=null, answers=[],quizStep=0;
function startTest(id){
  const s=SCALES.find(x=>x.id===id);if(!s)return;
  currentScale=s;answers=new Array(s.questions.length).fill(null);quizStep=0;const primary=isPrimaryStudent(DB.currentUser()),copy=PRIMARY_SCALE_COPY[s.id];
  $('page-test').classList.toggle('kid-test',primary);
  $('test-title').innerHTML=primary&&copy?`${copy.title}<small>${copy.professional}</small>`:s.name+'（'+s.en+'）';
  $('test-info').innerHTML=`<b>指导语：</b>${esc(s.intro)} 测评结果仅用于自我筛查参考，不能替代专业诊断。`;
  renderQuiz();go('test');
}
function renderQuiz(){
  const area=$('quiz-area');
  const primary=isPrimaryStudent(DB.currentUser()),copy=PRIMARY_SCALE_COPY[currentScale.id];
  if(primary&&copy){
    const i=quizStep,q=copy.questions[i]||currentScale.questions[i];
    area.innerHTML=`<div class="kid-quiz-count"><span>${i+1} / ${currentScale.questions.length}</span><b>${['☁','♡','✦'][i%3]}</b></div><div class="q-item kid-q-item"><div class="q-text">${esc(q)}</div><div class="q-options">${currentScale.options.map(([label,val])=>`<label><input type="radio" name="q${i}" value="${val}" ${answers[i]===val?'checked':''} onchange="pick(${i},${val})"><span>${label}</span></label>`).join('')}</div></div><div class="kid-quiz-nav"><button onclick="quizMove(-1)" ${i===0?'disabled':''}>← 上一题</button><button onclick="quizMove(1)" ${i===currentScale.questions.length-1||answers[i]===null?'disabled':''}>下一题 →</button></div>`;
    $('quiz-submit').style.display=i===currentScale.questions.length-1?'':'none';updateProgress();return;
  }
  $('quiz-submit').style.display='';
  area.innerHTML=currentScale.questions.map((q,i)=>`
    <div class="q-item"><div class="q-text">${i+1}. ${esc(q)}</div>
    <div class="q-options">${currentScale.options.map(([label,val])=>`
      <label><input type="radio" name="q${i}" value="${val}" onchange="pick(${i},${val})"><span>${label}</span></label>`).join('')}
    </div></div>`).join('');
  updateProgress();
}
function pick(i,val){answers[i]=val;$('quiz-submit').disabled=answers.some(a=>a===null);if(isPrimaryStudent(DB.currentUser()))renderQuiz();else updateProgress();}
function quizMove(dir){const next=quizStep+dir;if(next<0||next>=currentScale.questions.length)return;if(dir>0&&answers[quizStep]===null)return;quizStep=next;renderQuiz();}
function updateProgress(){
  const done=answers.filter(a=>a!==null).length;
  $('quiz-progress-bar').style.width=(done/currentScale.questions.length*100)+'%';
}
function resetQuiz(){
  answers=new Array(currentScale.questions.length).fill(null);quizStep=0;
  renderQuiz();$('quiz-submit').disabled=true;
  $('quiz-progress-bar').style.width='0%';
}
let quizSubmitting=false;
function submitQuiz(){
  if(quizSubmitting)return;
  quizSubmitting=true;
  try{
    const opts=currentScale.options;
    const minV=opts[0][1],maxV=opts[opts.length-1][1];
    const total=answers.reduce((a,b,i)=>a+(currentScale.reverse&&currentScale.reverse.includes(i)?(minV+maxV-b):b),0);
    saveRecord(currentScale.id,total,answers.slice());
    showResult(currentScale,total);
    renderReport();
    go('result');
    /* v4：AI 分级支持闭环（测评→AI分析→分层→诱导支持→反馈追踪） */
    afterQuizRiskFlow(currentScale,total);
  }finally{
    setTimeout(()=>{quizSubmitting=false;},400);
  }
}
function saveRecord(scaleId,total,answers){
  const u=DB.currentUser();if(!u)return;
  u.records=u.records||[];
  u.records.push({scaleId,total,date:Date.now(),answers:answers||[]});
  DB.saveUser(u);
  syncRoster(u);
  if(isPrimaryStudent(u)) awardPetForQuiz();
}
function getLevel(scale,total){
  return scale.levels.find(l=>total>=l.min&&total<=l.max)||scale.levels[scale.levels.length-1];
}
const ATTR_NOTES={
  phq9:'可能的影响因素：学业/人际压力累积、睡眠不足、缺少运动与社交支持、负性思维反刍等。建议结合「认知重构」与「三件好事」练习，并保持规律作息。',
  gad7:'可能的影响因素：考试/求职等不确定性事件、完美主义倾向、信息过载、咖啡因与睡眠不足等。建议练习 4-7-8 呼吸与 5-4-3-2-1 接地，减少刺激摄入。',
  pss10:'可能的影响因素：任务负荷过高、时间管理不足、缺少恢复性休息、社交支持不足等。建议使用「时间管理训练」与呼吸练习，并保证每周运动。',
  isi7:'可能的影响因素：睡前思维反刍、屏幕暴露、作息不规律、焦虑与压力等。建议执行睡眠卫生与「睡前放松引导」，必要时就医评估。',
  rses:'可能的影响因素：长期自我否定、比较心态、负面反馈累积、缺少认可体验等。建议进行「三件好事」与自我肯定记录，必要时与咨询师探讨自我概念。'
};
function showResult(scale,total){
  const lv=getLevel(scale,total);
  window._lastScaleInfo={scaleId:scale.id,name:scale.name,total,max:scale.max,level:lv.label,date:Date.now()};
  $('result-title').textContent=scale.name+' · 测评结果';
  $('result-score').textContent=total;
  const hero=$('result-hero');hero.className='result-hero '+lv.cls;
  $('result-level').textContent=lv.label+'（'+total+'/'+scale.max+'）';
  $('result-desc').textContent=lv.desc;
  $('result-ref').innerHTML='📚 <b>量表出处：</b>'+scale.ref;
  $('result-recs').innerHTML=lv.recs.map(r=>`<div class="rec-card"><b>${r[0]}</b><br>${r[1]}</div>`).join('');
  const attr=$('result-attr');
  if(attr){attr.innerHTML='🧭 <b>可能的影响因素（供参考）：</b>'+(ATTR_NOTES[scale.id]||'多因素综合影响，建议与 AI 疏导聊聊，梳理近期压力源。');attr.style.display='block';}
  const warn=$('result-warn');
  const sevLevel=scale.levels.find(l=>l.cls==='severe');
  if(sevLevel&&total>=sevLevel.min){
    warn.style.display='block';
    warn.innerHTML='⚠️ <b>重要提示：</b>你的分数已达到需要专业帮助的范围。请尽快联系学校心理咨询中心，或拨打全国心理援助热线 <b>12356</b>（24小时）。如果你此刻有伤害自己的想法，请立即告诉身边信任的人，或前往最近的精神卫生机构。<br>📌 <b>建议操作：</b>点击下方"带着结果去找 AI 聊聊"，让心屿陪你梳理下一步。';
  }else{warn.style.display='none';}
  window.scrollTo({top:0,behavior:'smooth'});
}
/* ═══════════════ 综合报告 & 雷达图 ═══════════════ */
function renderReport(){
  const u=DB.currentUser();if(!u)return;
  const latest={};
  (u.records||[]).forEach(r=>{latest[r.scaleId]=r;});
  const ids=Object.keys(latest);
  if(ids.length<2){$('report-panel').style.display='none';return;}
  $('report-panel').style.display='block';
  const dims=ids.map(id=>{const s=SCALES.find(x=>x.id===id);return {id,name:s.name,val:latest[id].total/s.max*100,raw:latest[id].total,max:s.max,lv:getLevel(s,latest[id].total)};});
  // 画雷达图
  const W=480,H=400,cx=240,cy=185,R=118,rings=4;
  let svg='';
  const ang=i=>(-Math.PI/2)+(2*Math.PI*i/dims.length);
  // 网格环
  for(let r=1;r<=rings;r++){
    const pts=dims.map((d,i)=>{const a=ang(i);return (cx+R*r/rings*Math.cos(a)).toFixed(1)+','+(cy+R*r/rings*Math.sin(a)).toFixed(1);}).join(' ');
    svg+=`<polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  // 轴线与标签
  dims.forEach((d,i)=>{
    const a=ang(i);
    const x1=cx+R*Math.cos(a),y1=cy+R*Math.sin(a);
    svg+=`<line x1="${cx}" y1="${cy}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#e2e8f0"/>`;
    const lx=cx+(R+34)*Math.cos(a),ly=cy+(R+34)*Math.sin(a);
    svg+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#334155" font-weight="600">${esc(d.name)}</text>`;
    svg+=`<text x="${lx.toFixed(1)}" y="${(ly+15).toFixed(1)}" text-anchor="middle" font-size="11" fill="${d.val>66?'#dc2626':d.val>33?'#d97706':'#16a34a'}">${d.raw}/${d.max}</text>`;
  });
  // 数据多边形
  const dataPts=dims.map((d,i)=>{const a=ang(i),r=R*d.val/100;return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1);}).join(' ');
  const dots=dims.map((d,i)=>{const a=ang(i),r=R*d.val/100;return `<circle cx="${(cx+r*Math.cos(a)).toFixed(1)}" cy="${(cy+r*Math.sin(a)).toFixed(1)}" r="4" fill="${d.val>66?'#dc2626':d.val>33?'#d97706':'#0e7490'}"/>`;}).join('');
  svg+=`<polygon points="${dataPts}" fill="rgba(14,116,144,.25)" stroke="#0e7490" stroke-width="2"/>${dots}`;
  $('radar-chart').innerHTML=svg;
  // 汇总文字
  const red=dims.filter(d=>d.val>66).length, yellow=dims.filter(d=>d.val>33&&d.val<=66).length;
  let sum='';
  if(red===0&&yellow===0){sum='<div class="panel" style="background:var(--mint);border-color:var(--mint-border);">✅ <b>整体状态良好：</b>各维度均在较理想范围。继续保持规律作息与运动，定期（如每 2-4 周）复测追踪变化。</div>';}
  else if(red===0){sum='<div class="panel" style="background:var(--warm);border-color:var(--warm-border);">🟡 <b>有 '+yellow+' 个维度需要关注：</b>'+dims.filter(d=>d.val>33&&d.val<=66).map(d=>d.name).join('、')+'。建议坚持对应自助训练并 2 周后复测。</div>';}
  else{sum='<div class="panel" style="background:var(--danger-bg);border-color:#fecaca;">🔴 <b>有 '+red+' 个维度达到较高水平：</b>'+dims.filter(d=>d.val>66).map(d=>d.name).join('、')+'。强烈建议尽快预约学校心理咨询中心或拨打 12356 获得专业支持，同时可先用 AI 疏导梳理感受。</div>';}
  $('report-summary').innerHTML=sum+'<p style="font-size:12.5px;color:var(--muted);margin-top:8px;">说明：雷达图展示各量表最近一次测评的相对严重度（分数/满分），仅供参考，不能替代专业评估。</p>';
}
/* ═══════════════ 头像系统（v2.1） ═══════════════ */
function _avaSvg(c1,c2,face){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#g)"/><circle cx="50" cy="42" r="17" fill="#fff" opacity=".20"/>'+face+'</svg>';
}
const BUILTIN_AVATARS=[
  {name:'屿蓝',svg:_avaSvg('#0e7490','#2dd4bf','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿粉',svg:_avaSvg('#db2777','#f9a8d4','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿绿',svg:_avaSvg('#059669','#6ee7b7','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿紫',svg:_avaSvg('#7c3aed','#c4b5fd','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿橙',svg:_avaSvg('#ea580c','#fdba74','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿青',svg:_avaSvg('#0d9488','#5eead4','<circle cx="36" cy="50" r="4" fill="#fff"/><path d="M64 47 L64 53" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿米',svg:_avaSvg('#a16207','#fcd34d','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')},
  {name:'屿夜',svg:_avaSvg('#334155','#94a3b8','<circle cx="35" cy="50" r="4" fill="#fff"/><circle cx="65" cy="50" r="4" fill="#fff"/><path d="M35 63 Q50 75 65 63" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')}
];
function avatarDataURL(i){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(BUILTIN_AVATARS[i].svg);}
function avatarHTML(u,size,cls){
  size=size||28;
  if(u&&u.avatar)return '<img class="'+(cls||'avatar-img')+'" style="width:'+size+'px;height:'+size+'px;" src="'+esc(u.avatar)+'" alt="头像">';
  const ch=u&&u.nickname?u.nickname[0]:'屿';
  return '<span class="'+(cls||'avatar')+'" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.46)+'px;">'+esc(ch)+'</span>';
}
function openAvatarModal(){
  const u=DB.currentUser();if(!u)return;
  openModal(`
    <h3>🖼️ 设置我的头像</h3>
    <p class="sub">选择内置形象，或上传你自己的图片（自动压缩，仅保存在本浏览器，刷新不丢失）</p>
    <div class="panel-title">内置图库</div>
    <div class="ava-grid">${BUILTIN_AVATARS.map((a,i)=>`
      <div class="ava-item ${u.avatar===avatarDataURL(i)?'sel':''}" onclick="pickAvatar(${i})">
        <img src="${avatarDataURL(i)}" alt="${a.name}"><span>${a.name}</span>
      </div>`).join('')}
    </div>
    <div class="panel-title">本地上传</div>
    <label class="upload-zone" for="avatar-file">📁 点击选择图片上传（jpg/png，自动缩放至 160px）</label>
    <input type="file" id="avatar-file" accept="image/*" style="display:none;" onchange="uploadAvatar(this)">
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button></div>
  `);
}
function pickAvatar(i){
  const u=DB.currentUser();if(!u)return;
  u.avatar=avatarDataURL(i);
  DB.saveUser(u);syncRoster(u);
  toast('✅ 头像已更新为「'+BUILTIN_AVATARS[i].name+'」');
  closeModal();renderUserArea();renderProfile();renderHome();
}
function uploadAvatar(input){
  const f=input.files&&input.files[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const max=160;
      let w=img.width,h=img.height;
      const scale=Math.min(1,max/Math.max(w,h));
      w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
      const c=document.createElement('canvas');
      c.width=w;c.height=h;
      const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      const url=c.toDataURL('image/jpeg',0.85);
      const u=DB.currentUser();if(!u)return;
      u.avatar=url;
      DB.saveUser(u);syncRoster(u);
      toast('✅ 头像上传成功，已全局生效');
      closeModal();renderUserArea();renderProfile();renderHome();
    };
    img.onerror=()=>{toast('⚠️ 图片读取失败，请换一张图片');};
    img.src=e.target.result;
  };
  reader.readAsDataURL(f);
}
/* ═══════════════ 身份信息弹窗（v2.1） ═══════════════ */
function openIdentityModal(){
  const u=DB.currentUser();if(!u)return;
  const cur=u.role||'student';
  openModal(`
    <h3>🎭 修改身份与归属</h3>
    <p class="sub">修改后按新身份分流；管理员身份会显示趋势分析、重点关注等管理模块</p>
    <div class="field"><label>身份</label>
      <select id="im-role" onchange="renderIdentityModalFields(this.value)">
        <option value="student" ${cur==='student'?'selected':''}>学生</option>
        <option value="normal" ${cur==='normal'?'selected':''}>普通用户</option>
        <option value="school_admin" ${cur==='school_admin'?'selected':''}>学校管理人员</option>
        <option value="parent" ${cur==='parent'?'selected':''}>家长</option>
        <option value="community_admin" ${cur==='community_admin'?'selected':''}>社区管理人员</option>
      </select></div>
    <div id="im-fields"></div>
    <div class="modal-foot">
      <button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button>
      <button class="btn btn-teal" onclick="saveIdentityModal()">保存</button>
    </div>
  `);
  renderIdentityModalFields(cur);
}
function renderIdentityModalFields(role){
  const u=DB.currentUser();if(!u)return;
  const el=$('im-fields');if(!el)return;
  const orgType=u.orgType||'',orgName=u.orgName||'',region=u.region||'';
  if(role==='student'){
    el.innerHTML=`<div class="field"><label>学校名称 *</label><input id="im-org" value="${esc(orgName)}"></div><div class="field"><label>所在地区 *</label><input id="im-region" value="${esc(region)}"></div>
    <div class="field"><label>年级 *（小学一年级～博士研究生）</label><select id="im-grade">${gradeOptionsHtml(u.grade||'')}</select></div>
    <div class="field"><label>班级（选填）</label><input id="im-class" value="${esc(u.className||'')}" placeholder="例如：三年级 2 班 / 计科 2301 班"></div>
    <div class="field"><label>专业 / 方向（选填）</label><input id="im-major" value="${esc(u.major||'')}"></div>`;
  }else if(role==='normal'){
    el.innerHTML=`<div class="field"><label>归属类型（选填）</label><select id="im-orgtype"><option value="">暂不选择</option><option value="school" ${orgType==='school'?'selected':''}>学校</option><option value="community" ${orgType==='community'?'selected':''}>社区</option><option value="street" ${orgType==='street'?'selected':''}>街道</option></select></div><div class="field"><label>机构名称（选填）</label><input id="im-org" value="${esc(orgName)}"></div><div class="field"><label>所在地区（选填）</label><input id="im-region" value="${esc(region)}"></div>`;
  }else if(role==='parent'){
    el.innerHTML=`<div class="field"><label>孩子用户名（选填）</label><input id="im-org" value="${esc(u.childUsername||'')}"></div><div class="field"><label>所在地区（选填）</label><input id="im-region" value="${esc(region)}"></div>`;
  }else if(role==='school_admin'){
    el.innerHTML=`<div class="field"><label>学校名称 *</label><input id="im-org" value="${esc(orgName)}"></div><div class="field"><label>所在地区 *</label><input id="im-region" value="${esc(region)}"></div>`;
  }else if(role==='community_admin'){
    el.innerHTML=`<div class="field"><label>机构类型 *</label><select id="im-orgtype2"><option value="community" ${orgType!=='street'?'selected':''}>社区</option><option value="street" ${orgType==='street'?'selected':''}>街道</option></select></div><div class="field"><label>机构名称 *</label><input id="im-org" value="${esc(orgName)}"></div><div class="field"><label>所在地区 *</label><input id="im-region" value="${esc(region)}"></div>`;
  }
  /* 年龄/性别（用于 AI 心理记忆个性化，学生/普通用户/家长） */
  if(role==='student'||role==='normal'||role==='parent'){
    el.innerHTML+=`<div class="field"><label>年龄（选填，用于 AI 个性化交流）</label><input id="im-age" type="number" min="3" max="99" value="${esc(u.age||'')}" placeholder="例如：16"></div>
    <div class="field"><label>性别（选填）</label><select id="im-gender"><option value="">暂不填写</option><option value="男" ${u.gender==='男'?'selected':''}>男</option><option value="女" ${u.gender==='女'?'selected':''}>女</option><option value="其他" ${u.gender==='其他'?'selected':''}>其他 / 不便说明</option></select></div>`;
  }
}
function saveIdentityModal(){
  const u=DB.currentUser();if(!u)return;
  const role=$('im-role').value;
  const orgName=($('im-org')?$('im-org').value:'').trim();
  const region=($('im-region')?$('im-region').value:'').trim();
  if((role==='student'||role==='school_admin')&&(!orgName||!region)){toast('请填写机构名称与所在地区');return;}
  if(role==='community_admin'&&(!orgName||!region)){toast('请填写机构名称与所在地区');return;}
  if(role==='normal'&&$('im-orgtype')&&$('im-orgtype').value&&!orgName){toast('已选择归属类型，请填写机构名称，或改为「暂不选择」');return;}
  u.role=role;
  if(role!=='parent')u.childUsername='';
  if(role==='normal'){
    u.orgType=$('im-orgtype').value||'';u.orgName=u.orgType?orgName:'';u.region=region;
  }else if(role==='community_admin'){
    u.orgType=$('im-orgtype2').value;u.orgName=orgName;u.region=region;
  }else if(role==='parent'){
    const child=orgName;
    if(child){
      const c=DB.users[child];
      if(!c){toast('未找到该用户名，请确认孩子已注册');return;}
      if(c.role!=='student'&&c.role!=='normal'){toast('该账号不是学生/普通用户，无法绑定为孩子');return;}
      if(child===u.username){toast('不能绑定自己');return;}
    }
    u.orgType='';u.orgName='';u.region=region;u.childUsername=child||'';
  }else if(role==='student'){
    u.orgType='school';u.orgName=orgName;u.region=region;
    u.grade=$('im-grade').value;u.className=($('im-class')?$('im-class').value:'').trim();u.major=($('im-major')?$('im-major').value:'').trim();
  }else{
    u.orgType='school';u.orgName=orgName;u.region=region;
  }
  if($('im-age')){const age=parseInt($('im-age').value,10);u.age=(age>=3&&age<=99)?age:'';}
  if($('im-gender'))u.gender=$('im-gender').value;
  u.roleSetAt=Date.now();
  DB.saveUser(u);syncRoster(u);
  applyTheme(u);
  closeModal();renderNavAdmin();renderUserArea();renderProfile();renderHome();
  if($('page-manage').classList.contains('active'))renderManage();
  toast('✅ 身份信息已更新');
}
/* __AI_PART__ */
/* ═══════════════ AI 疏导 ═══════════════ */
const AI_PROVIDERS={
  zhipu:{name:'智谱 GLM',url:'https://open.bigmodel.cn/api/paas/v4/chat/completions',model:'glm-4.7-flash'},
  deepseek:{name:'DeepSeek',url:'https://api.deepseek.com/chat/completions',model:'deepseek-chat'},
  qwen:{name:'通义千问',url:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',model:'qwen-turbo'},
  kimi:{name:'Kimi',url:'https://api.moonshot.cn/v1/chat/completions',model:'moonshot-v1-8k'}
};
const SYSTEM_PROMPT='你叫心屿，是面向高校学生的 AI 心理倾听者。核心原则：1.共情优先：先接纳和确认感受，不急着给建议、不评判。2.安全第一：用户出现自伤/自杀/伤人等危机信号时，立即建议联系专业帮助（全国心理援助热线12356、学校心理咨询中心），不继续深入危险话题。3.不替代专业：不诊断、不开药、不做心理治疗，只做倾听、疏导与轻量 CBT/正念引导。4.保护隐私：不主动询问也不存储姓名学号等身份信息。5.回应要具体、温暖、简洁（一般不超过150字），多用开放式提问引导用户表达。';
const PRIMARY_SYSTEM_PROMPT='你叫心屿，是陪伴小学和初中学生的 AI 伙伴。用温柔、亲和、简短、口语化的中文回应，不使用诊断、风险等级、临床症状、心理疾病、专业干预等生硬术语，不推断家庭、学业或人际问题。先认真倾听，再用一个简单问题陪学生继续表达。只有出现自伤、自杀或伤人等危机表达时，才清楚建议立刻联系可信任的大人、学校老师或 12356。';
function getApiSettings(){const u=DB.currentUser();return (u&&u.settings&&u.settings.apiKey)?u.settings:null;}
function chatMode(){return getApiSettings()?'ai':'demo';}
function updateChatModeUI(){
  const ai=chatMode()==='ai';
  const p=currentPersona();
  $('chat-mode-label').innerHTML=p.name+'<span class="persona-tag">'+p.desc+'</span>';
  $('chat-mode-tip').innerHTML=ai?'✅ 已连接 <b>'+AI_PROVIDERS[getApiSettings().provider].name+'</b>，现在是真实大模型对话（'+p.name+'）。':'未配置 AI 接口：当前为内置演示对话模式（'+p.name+'）。前往<a href="javascript:go(\'profile\')" style="color:var(--teal);">个人中心</a>填入你的大模型 API Key（智谱 GLM 有免费额度），即可解锁真实 AI 对话。';
  const u=DB.currentUser();
  const vp=currentVoicePack();
  const vn=$('vp-name');if(vn)vn.textContent=vp.custom?('🎤 '+esc(vp.name)):(vp.name||'💙 心屿本音');
  const vr=$('voice-reply-btn');
  if(vr){vr.style.background=u&&u.voiceReply?'var(--teal)':'#fff';vr.style.color=u&&u.voiceReply?'#fff':'var(--teal)';}
  const ava=$('chat-ava');
  if(ava)ava.textContent=p.ico;
  renderPersonaRow();
}
let chatHistory=[];
const PRIMARY_GREETING='我会认真倾听你的所有小事委屈，放心说说就好啦。';
function chatStamp(){const ts=Date.now();return {ts,date:fmtDay(ts)};}
function initChat(){
  chatHistory=DB.getData('chat',[]);
  const body=$('chat-body');
  const p=currentPersona();
  const u=DB.currentUser();
  const memGreet=u?memoryGreeting(u):null;
  if(chatHistory.length===0){
    chatHistory=[Object.assign({role:'assistant',content:isPrimaryStudent(u)?PRIMARY_GREETING:p.greet+(memGreet?'\n\n'+memGreet:'')},chatStamp())];
    saveChat();
  }
  body.innerHTML=chatHistory.map(m=>{
    if(m.role==='user')return `<div class="msg user">${esc(m.content)}</div>`;
    return `<div class="msg bot">${esc(m.content)}<br><button class="voice-play" onclick="speakAI(this.dataset.t)" data-t="${esc(m.content)}">🔊 播放语音</button></div>`;
  }).join('');
  body.scrollTop=body.scrollHeight;
  renderPrimaryChatTools();
  updateChatModeUI();
}
function saveChat(){chatHistory=chatHistory.map(m=>m.ts?m:Object.assign({},m,chatStamp()));DB.setData('chat',chatHistory.slice(-100));maybeAwardMoodTask();}
/* 测评结果 → AI 联动 */
function buildAIContext(){
  const u=DB.currentUser();
  if(!u||!u.records||!u.records.length)return null;
  const rec=u.records[u.records.length-1];
  const s=SCALES.find(x=>x.id===rec.scaleId);
  if(!s)return null;
  const lv=getLevel(s,rec.total);
  return '【参考背景】用户最近一次测评：'+s.name+' 得分 '+rec.total+'/'+s.max+'，等级：'+lv.label+'（测评时间 '+fmtDay(rec.date)+'）。仅在对话内容相关时自然参考，不主动炫耀、不评判。';
}
function maybeInjectScaleContext(){
  if(!window._lastScaleInfo)return;
  const info=window._lastScaleInfo;
  const key=info.scaleId+'_'+info.date;
  if(DB.getData('aiCtxKey','')===key)return;
  const msg='我注意到你刚刚完成了【'+info.name+'】测评（得分 '+info.total+'/'+info.max+'，等级：'+info.level+'）。如果你愿意，我们可以聊聊测评里让你最有感触的地方，或者你最近的真实感受。当然，想聊别的也可以。';
  chatHistory.push({role:'assistant',content:msg});
  DB.setData('aiCtxKey',key);
  addMsg('bot',msg);
  saveChat();
}
function addMsg(role,text,cls){
  const body=$('chat-body');
  const div=document.createElement('div');
  div.className='msg '+(cls||role);
  div.textContent=text;
  body.appendChild(div);
  body.scrollTop=body.scrollHeight;
  return div;
}
function quickChat(text){$('chat-input').value=text;sendChat();}
const PRIMARY_MOODS=[
  {id:'happy',name:'开心',icon:'assets/mood-happy.svg',fallback:'开心',animation:'happy',color:'#e8bc66',message:'我现在感到开心。'},
  {id:'unhappy',name:'不开心',icon:'assets/mood-unhappy.svg',fallback:'不开心',animation:'comfort',color:'#88acd0',message:'我现在有点不开心。'},
  {id:'anxious',name:'焦虑',icon:'assets/mood-anxious.svg',fallback:'焦虑',animation:'comfort',color:'#d69aaa',message:'我现在有点焦虑。'},
  {id:'calm',name:'平静',icon:'assets/mood-calm.svg',fallback:'平静',animation:'calm',color:'#75b59c',message:'我现在感到很平静。'},
  {id:'tired',name:'疲惫',icon:'assets/mood-tired.svg',fallback:'疲惫',animation:'rest',color:'#a89bc1',message:'我现在有点疲惫。'}
];
function moodConfig(id){return PRIMARY_MOODS.find(m=>m.id===id);}
function moodIconHTML(m){return m.icon?`<img src="${esc(m.icon)}" alt="${esc(m.fallback)}">`:`<i style="--mood-color:${m.color}" aria-hidden="true"></i>`;}
function renderPrimaryChatTools(){
  const primary=isPrimaryStudent(DB.currentUser()),quick=$('primary-mood-quick'),entry=$('mood-diary-entry'),standard=$('standard-chat-suggestions');
  if(quick){quick.style.display=primary?'flex':'none';quick.innerHTML=primary?PRIMARY_MOODS.map(m=>`<button onclick="quickMood('${m.id}')">${moodIconHTML(m)}<span>${m.name}</span></button>`).join(''):'';}
  if(entry)entry.style.display=primary?'flex':'none';if(standard)standard.style.display=primary?'none':'flex';
}
function quickMood(id){const m=moodConfig(id);if(!m)return;triggerMoodPet(id);$('chat-input').value=m.message;sendChat();}
const CRISIS_WORDS=['自杀','不想活','轻生','结束生命','伤害自己','自残','活着没意思','想死','不想活了','太痛苦了','撑不下去','熬不下去','离开这个世界','一了百了','割腕','吞药','跳楼','安眠药','遗书','解脱','消失','了结','放弃生命','活不下去','没意思了','想走极端','伤害我'];
const FILTER_WORDS=['自杀','不想活','轻生','结束生命','伤害自己','自残','割腕','吞药','跳楼','遗书','了结','活不下去','去死','杀了','打死','揍死','贱人','废物','滚'];
function crisisCheck(text){
  for(const w of CRISIS_WORDS){if(text.includes(w))return w;}
  return null;
}
async function sendChat(){
  const input=$('chat-input');
  const text=input.value.trim();
  if(!text)return;
  if(!chatHistory.length)initChat(); /* 兜底：登录后/刷新后先恢复该用户历史，避免覆盖 */
  input.value='';
  addMsg('user',text);
  chatHistory.push(Object.assign({role:'user',content:text},chatStamp()));
  const typing=document.createElement('div');
  typing.className='msg bot typing loading-dots';
  typing.textContent='正在思考';
  $('chat-body').appendChild(typing);
  $('chat-body').scrollTop=$('chat-body').scrollHeight;
  const u=DB.currentUser();
  if(!isPrimaryStudent(u))awardPetForTask('AI疏导');
  /* v4 敏感词优先：命中 → 风险台账 + 紧急联系弹窗 */
  const sen=checkSensitive(text);
  if(sen){
    typing.remove();
    const ev=sensitiveTrigger(text,'AI 聊天');
    const msg='⚠️ 我听到了你正在经历的痛苦，这非常重要。请先停下来——你不是一个人。\n\n按平台分级支持流程，需要立即联系相关负责人员：请拨打全国心理援助热线 12356（24小时），或联系学校心理咨询中心，或告诉身边信任的人。\n\n你的安全是最重要的。我无法替代专业帮助，但如果你愿意，我们可以一起先做一次 4-7-8 呼吸练习，让身体稍微平静下来。';
    addMsg('bot',msg,'crisis');
    chatHistory.push({role:'assistant',content:msg});
    saveChat();
    setTimeout(()=>{openSensitiveModal(sen,ev);},500);
    if(u){u.chatCount=(u.chatCount||0)+1;DB.saveUser(u);syncRoster(u);}
    return;
  }
  /* 兼容旧危机词表（未被敏感词表覆盖的危机表达） */
  if(crisisCheck(text)){
    typing.remove();
    const ev=addRiskEvent({type:'sensitive',trigger:'【AI 聊天】检测到危机表达：「'+crisisCheck(text)+'」',level:'high',action:'启动人工支持流程：弹窗提供紧急联系渠道',notes:[{ts:Date.now(),text:'命中旧危机词表'}]});
    const msg='⚠️ 我听到了你正在经历的痛苦，这非常重要。请先停下来——你不是一个人。\n\n请立即拨打全国心理援助热线 12356（24小时），或联系学校心理咨询中心，或告诉身边信任的人。你的安全是最重要的。\n\n我无法替代专业帮助，但如果你愿意，我们可以一起先做一次 4-7-8 呼吸练习，让身体稍微平静下来。';
    addMsg('bot',msg,'crisis');
    chatHistory.push({role:'assistant',content:msg});
    saveChat();
    setTimeout(()=>{openCrisisSupportModal('你在聊天中表达了「'+crisisCheck(text)+'」等危机信号',ev);},500);
    if(u){u.chatCount=(u.chatCount||0)+1;DB.saveUser(u);syncRoster(u);}
    return;
  }
  /* v4 风险识别分级：长期低落 / 强烈孤独 / 无望感 */
  const risk=chatRiskAssess(text);
  if(risk.level==='mid'&&!isPrimaryStudent(u)){
    typing.remove();
    addRiskEvent({type:'risk-grade',trigger:'【AI 聊天】'+risk.reason,level:'mid',action:'推荐帮助：建议联系心理中心 + 平台持续陪伴',notes:[{ts:Date.now(),text:'AI 情绪分析判定中风险'}]});
    const msg='我先接住你的情绪：谢谢你愿意说出来，这本身就很有勇气。我注意到你最近的状态有些低落（'+risk.reason+'），想陪你一起梳理。\n\n同时，按心屿的分级支持流程，这样的情况建议你：① 预约学校心理咨询中心做一次专业评估（他们能给你更专业的支持）；② 每天坚持一项自助训练（呼吸/日记都可以）；③ 随时回来找我聊。你愿意从哪一件开始？';
    addMsg('bot',msg);
    chatHistory.push({role:'assistant',content:msg});
    saveChat();
    toast('🧭 AI 风险识别：中风险 · 已推荐专业帮助');
    if(u){u.chatCount=(u.chatCount||0)+1;DB.saveUser(u);syncRoster(u);}
    return;
  }
  const settings=getApiSettings();
  let reply='';
  /* v4 心理记忆：优先个性化回应 */
  const memReply=u?memoryAwareReply(text,u):null;
  if(settings){
    try{
      const p=AI_PROVIDERS[settings.provider]||AI_PROVIDERS.zhipu;
      const persona=currentPersona();
      const history=chatHistory.slice(-12).map(m=>({role:m.role,content:m.content}));
      history.unshift({role:'system',content:(isPrimaryStudent(u)?PRIMARY_SYSTEM_PROMPT:SYSTEM_PROMPT)+'\n'+persona.sys});
      const mem=u?buildMemory(u):null;
      if(mem&&mem.scaleNotes.length)history.unshift({role:'system',content:'【用户心理记忆】年龄:'+(mem.age||'未知')+' 性别:'+(mem.gender||'未知')+' 年级:'+(mem.grade||'未知')+(mem.isLeftBehind?' 标注:留守儿童':'')+' 最近测评:'+mem.scaleNotes.join('；')+'. 在合适时机自然引用这些记忆（例如留守儿童问起父母、压力用户问起上次考试），不要生硬罗列。'});
      const aiCtx=buildAIContext();
      if(aiCtx)history.unshift({role:'system',content:aiCtx});
      const resp=await fetch(p.url,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+settings.apiKey},
        body:JSON.stringify({model:p.model,messages:history,temperature:0.7,max_tokens:800})
      });
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      const data=await resp.json();
      reply=data.choices&&data.choices[0]&&data.choices[0].message?data.choices[0].message.content:'';
      if(!reply)throw new Error('empty');
    }catch(e){
      typing.remove();
      addMsg('demo','⚠️ 大模型调用失败（'+e.message+'）。已自动切换为本地演示回复。请检查个人中心里的 API Key 是否正确、额度是否充足。');
      reply=isPrimaryStudent(u)?primaryDemoReply(text):(memReply||personaDemoReply(text));
      addMsg('bot',reply);
      chatHistory.push({role:'assistant',content:reply});
      saveChat();
      if(u&&u.voiceReply)speakAI(reply);
      if(u){u.chatCount=(u.chatCount||0)+1;DB.saveUser(u);syncRoster(u);}
      return;
    }
  }else{
    reply=isPrimaryStudent(u)?primaryDemoReply(text):(memReply||personaDemoReply(text));
  }
  typing.remove();
  addMsg('bot',reply);
  chatHistory.push({role:'assistant',content:reply});
  saveChat();
  if(u&&u.voiceReply)speakAI(reply);
  if(u){u.chatCount=(u.chatCount||0)+1;DB.saveUser(u);syncRoster(u);}
  trackFollowUp(u);
}
/* 人格化演示回复 */
function personaDemoReply(text){
  const p=currentPersona();
  const base=demoReply(text);
  if(p.id==='mentor')return '🌱 '+base;
  if(p.id==='pressure')return '📚 '+base;
  if(p.id==='friend')return '🎈 '+base;
  return base;
}
function primaryDemoReply(text){
  if(/开心|高兴|快乐|平静/.test(text))return '听到你这样说，我也替你开心呀。愿意再告诉我一件今天让你觉得舒服的小事吗？';
  if(/累|疲惫|困/.test(text))return '辛苦啦，累的时候可以先歇一会儿。你可以慢慢说，今天是什么时候开始觉得累的？';
  if(/焦虑|紧张|害怕|担心/.test(text))return '我在听呀。先不用急着把事情说得很完整，我们可以从最让你担心的一小点开始。';
  if(/不开心|难过|委屈|伤心/.test(text))return '这份不开心一定不太好受。你愿意说出来已经很勇敢了，我会认真听着的。';
  return '我在听呀。无论是什么小事，都可以慢慢告诉我，不用急着说得很完整。';
}
/* 本地演示模式：30+ 场景关键词回复（真实 AI 未配置时的降级方案） */
const DEMO_HINTS=[
  ['失眠','睡眠问题常常和「睡前思维反刍」有关——脑子里的事停不下来。可以试试：睡前一小时放下手机，把脑子里转的事写下来；然后做一组 4-7-8 呼吸（吸气4秒-屏息7秒-呼气8秒，循环4轮）。你最近是不是有什么事情一直放不下？'],
  ['睡','睡眠问题常常和「睡前思维反刍」有关。试试：睡前一小时远离屏幕，把心事写下来，再做一组 4-7-8 呼吸。你最近压力是不是比较大？'],
  ['考试','面对重要考试感到压力很正常，说明你在乎它。试试把「我必须考好」换成「我只需要做到当下能做的」。如果焦虑已经影响睡眠和饮食，记得预约学校心理咨询中心，他们有专业的减压辅导。你愿意说说最担心的是哪一科吗？'],
  ['压力','压力大的时候，人容易把目标定得太高。可以试着把任务拆小，完成一项就肯定自己一次。你愿意跟我具体说说，是哪件事让你压力最大吗？'],
  ['孤独','孤独感是一种信号，它在告诉你：你需要连接。其实很多同学都有同样的感受，只是没人先开口。要不要去心屿 树洞看看？那里有很多匿名的同龄人在分享相似的感受，也可以试着加入一个社团。'],
  ['迷茫','迷茫是成长的一部分，说明你正在探索「我想成为什么样的人」。可以试着列三个问题：我擅长什么？我享受什么？什么对我重要？不用急着找到答案，带着问题生活，答案会慢慢浮现。'],
  ['难过','难过的时候，不需要立刻「好起来」。允许自己拥有这种感受，本身就是一种照顾。如果愿意，可以试试情绪日记：写下今天发生了什么、你的感受、你做了什么应对——这会帮你更了解自己。'],
  ['想哭','想哭就哭出来吧，眼泪是身体在释放压力，不需要觉得丢脸。哭完可以喝点温水，做几次深呼吸。你愿意跟我说说发生了什么吗？'],
  ['焦虑','焦虑常常是对「未来不确定」的过度预警。一个有用的方法：把「我担心的事」分成两类——能控制的，和不能控制的。把精力放在能控制的那部分上。要不要现在试试做个认知重构练习？'],
  ['抑郁','听到你这样说，我有些担心你，也很感谢你愿意说出来。「心情低落」本身不是你的错，它像感冒一样需要被照顾。如果这种状态持续超过两周，建议预约学校心理咨询中心做一次专业评估。现在，愿意和我聊聊最近发生了什么吗？'],
  ['情绪低落','情绪低落的时候，先别急着「振作起来」。可以试试：把要做的事缩减到最小，完成一件就够；出门晒 10 分钟太阳；给朋友发条消息。你最近是有什么具体的事情让你低落吗？'],
  ['室友','室友关系是大学里最常见的烦恼之一。可以试试「我信息」表达：描述事实+说出感受+提出请求，比如「最近晚上熄灯后还有声音，我睡得比较浅，能麻烦你戴耳机吗？」。沟通前先想清楚自己想要什么结果。需要我陪你模拟一下怎么说吗？'],
  ['人际关系','人际关系的烦恼往往来自「猜测」——我猜他不喜欢我、我猜他们在议论我。试着把猜测变成确认：直接问，或者观察事实。你愿意说说具体是什么情况吗？'],
  ['恋爱','恋爱中的情绪起伏是很正常的。好的关系需要「表达需求」而不是「猜心思」。如果这段关系让你长期难受，也值得重新审视它是否健康。你愿意多说一点吗？'],
  ['失恋','失恋带来的难过是真实的，不要急着「放下」。给自己设定一个「允许难过的期限」，比如两周；期间保持作息、运动、和朋友见面。时间会帮你慢慢消化。现在感觉怎么样？'],
  ['分手','分手后的空虚感需要时间修复。可以试试：删掉反复看的聊天记录、把回忆写下来封存、每天安排一件让自己期待的小事。你愿意说说你们在一起多久了吗？'],
  ['家庭','家庭带来的压力有时最难以言说。你可以先分清：哪些是你能改变的，哪些不是。改变不了的，学着设定边界；能改变的，从一次坦诚沟通开始。你想聊聊具体是哪方面吗？'],
  ['父母','和父母观念冲突很正常，说明你在成长。可以试试「先倾听再表达」：先听完他们的担心，再平静说出你的想法和计划。你愿意说说你们在什么事情上有分歧吗？'],
  ['学业','学业压力大的时候，先把「我要学好」拆成「今天完成哪一步」。挂科、成绩波动都不是终点，大学里调整方向的机会很多。你最近是哪门课最困扰？'],
  ['挂科','挂科确实让人难受，但它不是对「你这个人」的评价，只是对「这门课这次考试」的评价。重要的是复盘：是没时间学、方法不对还是状态不好？需要的话可以聊聊怎么重新规划。'],
  ['拖延','拖延往往不是懒，而是「害怕做不好」或「任务太模糊」。试试 5 分钟启动法：告诉自己只做 5 分钟，通常开始后就停不下来了。你最近在拖什么任务？'],
  ['内卷','内卷的环境让人疲惫。可以试试给自己定义「足够好」的标准，而不是永远追着别人的进度跑。你的节奏是你自己的。你觉得什么对你来说「足够好」？'],
  ['自卑','自卑常常来自「和想象中的别人比较」。试着记录每天 3 件「我做得还不错」的小事，两周后你会看到不一样的自己。你觉得你最容易在哪方面否定自己？'],
  ['自我怀疑','自我怀疑是成长中的正常噪音。可以试试「证据检验」：把「我不行」写下来，列出支持它的证据和反对它的证据，通常你会发现反对的证据更多。你怀疑自己什么？'],
  ['未来','对未来的焦虑说明你在认真思考人生。把「未来」切成「下个学期」「下个月」「这周」，只处理眼前这一段。你目前最不确定的是哪方面？'],
  ['就业','就业焦虑是大四常见的课题。可以先做「信息收集」而不是「担心」：看看目标岗位的要求、学长学姐的经验。把焦虑变成行动清单，你会踏实很多。你学的专业方向是什么？'],
  ['毕业','毕业是人生阶段转换，迷茫和不舍都很正常。可以把「想做的事」「想成为的人」写下来，毕业不是终点，是下一个开始。你现在最舍不得的是什么？'],
  ['容貌','容貌焦虑背后，是对「被接纳」的渴望。可以试着把注意力从「看起来怎样」移到「我做了什么、我喜欢什么」上。你觉得自己身上最有魅力的特质是什么？'],
  ['身材','身材焦虑和容貌焦虑一样，常常是社会标准压在身上。健康比标准重要得多：规律运动、好好吃饭、睡够觉。你是因为什么开始在意身材的？'],
  ['社恐','社交焦虑很常见，你不是一个人。可以试试「小步子」：先从和一个人打招呼开始，再慢慢加到小组。紧张时做几次深呼吸，把注意力放在对方身上而不是自己身上。你想改善哪种社交场合？'],
  ['社交','社交累的话，允许自己「电量低」——独处充电也是合理的需求。不需要强迫自己成为「很会社交」的人，舒服的关系自然会长久。你最近参加什么让你累的场合了吗？'],
  ['愤怒','愤怒是正常的情绪，它在告诉你「边界被侵犯了」。可以试试：先离开现场、做几个深呼吸、等平静下来再用「我信息」表达。你现在是因为什么生气？'],
  ['烦躁','烦躁的时候，身体需要先动起来：出去走一圈、洗把脸、听一首歌。烦躁也是一种信号，它可能说明你太久没照顾自己了。你最近休息得怎么样？'],
  ['累','累的时候要允许自己休息，这不是偷懒，是必要的恢复。可以试试「什么都不做」10 分钟：不刷手机、不思考，只是坐着或躺下。你是身体累还是心累？'],
  ['疲惫','疲惫分两种：身体疲惫靠睡眠恢复，心理疲惫靠「放下」恢复。如果是心累，可能需要减少一点任务或期待。你最近在忙什么？'],
  ['emo','emo 的时候，先别评价自己「矫情」。情绪没有对错，它只是需要被看见。可以试试把此刻的感受写下来，或者去社区看看——很多同龄人也在经历类似的时刻。'],
  ['谢谢','不用谢呀，能陪着你我也很开心。💙 记得照顾好自己，需要的时候我都在。'],
  ['你好','你好呀！很高兴见到你。今天感觉怎么样？想聊点什么都可以。'],
  ['加油','加油！我知道你在努力。不过也要记得：努力的同时，允许自己休息，允许自己有情绪。你最近在为什么努力呀？']
];
const DEMO_FALLBACKS=[
  '谢谢你愿意跟我说这些。听起来你现在承受着一些情绪的重量，这很不容易。你能具体说说，是从什么时候开始的吗？',
  '我在听。你描述的这些感受，很多同学都经历过。如果给现在的情绪打个分（1-10分），大概是几分？',
  '嗯，我理解你的感受。有时候把话说出来本身，就已经是一种缓解。你希望我陪你聊这件事，还是想聊聊怎么应对它？',
  '感谢你的信任。你刚才说的这些，如果让一个好朋友听到，他会怎么回应你？试试用那个声音对自己说一遍。',
  '我听到你在说一件对你很重要的事。如果用一个词形容你现在的感受，会是哪个词？',
  '这件事听起来确实不容易。你希望从哪个部分开始聊：事情本身、你的感受，还是你想怎么做？',
  '我在认真听。很多人遇到类似情况时，第一反应是「自己是不是太脆弱了」，但其实这说明你很敏感、很在乎。你愿意再展开说说吗？',
  '谢谢你告诉我这些。如果现在什么都不用做、不用想，你最想做什么？'
];
function demoReply(text){
  for(const [kw,resp] of DEMO_HINTS){if(text.includes(kw))return resp;}
  return DEMO_FALLBACKS[Math.floor(Math.random()*DEMO_FALLBACKS.length)];
}
/* __TRAIN_PART__ */
/* ═══════════════ 自助训练 ═══════════════ */
function renderTrainGrid(){
  const grid=$('train-grid');
  const primary=isPrimaryStudent(DB.currentUser());
  const titles=primary?['把烦恼想法换个角度','跟着圆圈慢慢呼吸','写下今天的小心情','让身体慢慢放松','收藏今天的三件好事','把大任务拆成小步骤','看看、听听，回到现在']:['认知重构练习','4-7-8 呼吸练习','情绪日记','睡前放松引导','三件好事练习','时间管理训练','5-4-3-2-1 接地练习'];
  grid.innerHTML=`
  <div class="train-card"><span class="t-tag">认知练习</span><h4>${titles[0]}</h4><small class="kid-pro-name">${primary?'认知重构练习':'CBT 认知行为'}</small><p>${primary?'把心里的烦恼写下来，试着从另一个角度看看。':'识别自动化的消极想法，用证据检验它，重构为更平衡的思维。'}</p><button class="t-btn" onclick="toggleBox('reframe-box')">开始练习</button>
    <div class="train-box" id="reframe-box">
      <input id="reframe-thought" placeholder="1. 刚才让我感到难受的想法是？">
      <textarea id="reframe-evidence" rows="2" placeholder="2. 支持这个想法的证据有哪些？"></textarea>
      <textarea id="reframe-against" rows="2" placeholder="3. 反对这个想法的证据有哪些？（比如：有没有其他解释？最坏情况真的会发生吗？）"></textarea>
      <input id="reframe-new" placeholder="4. 一个更客观、平衡的想法是？">
      <input id="reframe-proof" placeholder="5. 明天可以做的验证行动（小实验）：">
      <button class="t-btn" onclick="doReframe()">完成重构并保存</button>
    </div></div>
  <div class="train-card"><span class="t-tag">放松练习</span><h4>${titles[1]}</h4><small class="kid-pro-name">4-7-8 呼吸练习</small><p>${primary?'跟着圆圈慢慢呼吸，不用一次做到完美。':'吸气 4 秒 → 屏息 7 秒 → 呼气 8 秒。'}</p><button class="t-btn" onclick="startBreathe()">开始练习</button>
    <div class="train-box" id="breathe-box">
      <div class="breathe-circle" id="breathe-circle">准备</div>
      <div class="breathe-status" id="breathe-status">点击开始，跟随圆圈的节奏呼吸（建议 3-4 轮）</div>
      <div style="text-align:center;margin-top:8px;"><button class="t-btn" onclick="startBreathe()">开始</button> <button class="t-btn" style="border-color:var(--muted);color:var(--muted);" onclick="stopBreathe()">结束</button></div>
    </div></div>
  <div class="train-card"><span class="t-tag">心情记录</span><h4>${titles[2]}</h4><small class="kid-pro-name">情绪日记</small><p>${primary?'写下一点今天的心情，想写多少都可以。':'记录每天的情绪波动、触发事件与应对方式。'}</p><button class="t-btn" onclick="toggleBox('diary-box')">开始记录</button>
    <div class="train-box" id="diary-box">
      <div class="mood-pick" id="mood-pick"></div>
      <textarea id="diary-event" rows="2" placeholder="今天发生了什么？（触发事件）"></textarea>
      <textarea id="diary-thought" rows="2" placeholder="当时脑海里闪过了什么想法？"></textarea>
      <textarea id="diary-cope" rows="2" placeholder="我做了什么应对？（哪怕很小）"></textarea>
      <button class="t-btn" onclick="saveDiary()">保存日记</button>
    </div>
    <div class="diary-list" id="diary-list" style="margin-top:10px;"></div></div>
  <div class="train-card"><span class="t-tag">安静放松</span><h4>${titles[3]}</h4><small class="kid-pro-name">睡前放松引导</small><p>${primary?'让身体一点点松下来，给自己一段安静时间。':'渐进式肌肉放松 + 正念身体扫描。'}</p><button class="t-btn" onclick="toggleBox('sleep-box')">开始练习</button>
    <div class="train-box" id="sleep-box">
      <div class="guide-steps" id="sleep-steps"></div>
      <div style="text-align:center;margin-top:10px;"><button class="t-btn" onclick="nextSleepStep()" id="sleep-next">下一步</button></div>
    </div></div>
  <div class="train-card"><span class="t-tag">小小收藏</span><h4>${titles[4]}</h4><small class="kid-pro-name">积极心理小练习</small><p>${primary?'把今天的小快乐收藏起来，一件也很好。':'每天睡前写下今天发生的 3 件好事。'}</p><button class="t-btn" onclick="toggleBox('gratitude-box')">开始记录</button>
    <div class="train-box" id="gratitude-box">
      <input id="g1" placeholder="好事 1：例如「今天食堂阿姨多给了我一块肉」">
      <input id="g2" placeholder="好事 2：例如「跑步时看到了很美的晚霞」">
      <input id="g3" placeholder="好事 3：例如「完成了一个拖延很久的任务」">
      <button class="t-btn" onclick="saveGratitude()">保存</button>
    </div></div>
  <div class="train-card"><span class="t-tag">一步一步</span><h4>${titles[5]}</h4><small class="kid-pro-name">时间管理训练</small><p>${primary?'把大事情拆成今天能做的一小步。':'把大任务拆小、设定优先级与番茄工作法。'}</p><button class="t-btn" onclick="toggleBox('time-box')">开始练习</button>
    <div class="train-box" id="time-box">
      <input id="time-task" placeholder="1. 最近最让你焦虑的任务是什么？">
      <input id="time-pieces" placeholder="2. 把它拆成 3 个 30 分钟内能完成的小步骤：">
      <input id="time-tomorrow" placeholder="3. 明天只做第 1 小步，计划什么时候做？">
      <button class="t-btn" onclick="doTimeTrain()">保存训练记录</button>
    </div></div>
  <div class="train-card"><span class="t-tag">回到现在</span><h4>${titles[6]}</h4><small class="kid-pro-name">5-4-3-2-1 接地练习</small><p>${primary?'看看、听听周围，让自己慢慢回到现在。':'焦虑或恐慌来袭时，用五种感官把注意力拉回当下。'}</p><button class="t-btn" onclick="toggleBox('ground-box')">开始练习</button>
    <div class="train-box" id="ground-box">
      <div class="guide-steps" id="ground-steps"></div>
      <div style="text-align:center;margin-top:10px;"><button class="t-btn" onclick="nextGroundStep()" id="ground-next">下一步</button></div>
    </div></div>`;
  renderMoodPick();
  renderDiaryList();
  sleepStep=0;groundStep=0;
}
function toggleBox(id){
  const b=$(id);if(!b)return;
  if(isPrimaryStudent(DB.currentUser()))document.querySelectorAll('#page-train .train-box.show').forEach(x=>{if(x!==b)x.classList.remove('show');});
  b.classList.toggle('show');
}
function doTimeTrain(){
  const task=$('time-task').value.trim();
  const pieces=$('time-pieces').value.trim();
  const tomorrow=$('time-tomorrow').value.trim();
  if(!task){toast('请至少填写「最让你焦虑的任务」');return;}
  saveTraining('时间管理训练',{task,pieces,tomorrow,date:Date.now()});
  ['time-task','time-pieces','time-tomorrow'].forEach(id=>$(id).value='');
  $('time-box').classList.remove('show');
  toast('✅ 已保存！拆小任务是缓解学业压力的第一步');
}
function doReframe(){
  const thought=$('reframe-thought').value.trim();
  const ev=$('reframe-evidence').value.trim();
  const ag=$('reframe-against').value.trim();
  const neu=$('reframe-new').value.trim();
  if(!thought||!neu){toast('请至少填写「消极想法」和「新想法」两栏');return;}
  saveTraining('认知重构',{thought,ev,ag,neu,date:Date.now()});
  toast('✅ 重构完成并已保存！证据检验是 CBT 的核心技能');
  ['reframe-thought','reframe-evidence','reframe-against','reframe-new','reframe-proof'].forEach(id=>$(id).value='');
  $(reframeBox()).classList.remove('show');
}
function reframeBox(){return 'reframe-box';}
/* 呼吸练习（Date.now 驱动，修复原版定时器偏差） */
let breatheTimer=null,breatheTimeout=null,breatheRunning=false;
const BREATH_PHASES=[{name:'吸气',sec:4},{name:'屏息',sec:7},{name:'呼气',sec:8}];
function startBreathe(){
  if(breatheRunning)return;
  if(isPrimaryStudent(DB.currentUser()))document.querySelectorAll('#page-train .train-box.show').forEach(x=>x.classList.remove('show'));
  breatheRunning=true;
  $('breathe-box').style.display='block';
  $('breathe-box').classList.add('show');
  const circle=$('breathe-circle'),status=$('breathe-status');
  let round=0,phaseIdx=0,startTs=Date.now();
  circle.classList.remove('in','out');
  circle.textContent='准备';status.textContent='3 秒后开始…';
  clearInterval(breatheTimer);
  if(breatheTimeout)clearTimeout(breatheTimeout);
  breatheTimeout=setTimeout(()=>{startTs=Date.now();tick();breatheTimer=setInterval(tick,200);},3000);
  function tick(){
    const ph=BREATH_PHASES[phaseIdx];
    const elapsed=(Date.now()-startTs)/1000;
    const remain=Math.max(0,Math.ceil(ph.sec-elapsed));
    if(remain<=0){
      phaseIdx++;
      if(phaseIdx>=3){phaseIdx=0;round++;
        if(round>=4){stopBreathe(true);return;}}
      startTs=Date.now();
    }
    const cur=BREATH_PHASES[phaseIdx];
    circle.textContent=cur.name;
    circle.classList.toggle('in',cur.name==='吸气');
    circle.classList.toggle('out',cur.name==='呼气');
    status.textContent='第 '+(round+1)+' 轮 · '+cur.name+' '+Math.max(0,Math.ceil((cur.sec-(Date.now()-startTs)/1000)))+' 秒';
  }
}
function stopBreathe(done){
  clearInterval(breatheTimer);
  if(breatheTimeout){clearTimeout(breatheTimeout);breatheTimeout=null;}
  breatheRunning=false;
  const c=$('breathe-circle');c.classList.remove('in','out');c.textContent='准备';
  $('breathe-status').textContent=done?'✅ 完成 4 轮，感觉怎么样？':'已结束，记得循序渐进（建议从 3 轮开始）';
  if(done)saveTraining('4-7-8呼吸',{rounds:4,date:Date.now()});
  if(done&&isPrimaryStudent(DB.currentUser()))setTimeout(()=>{$('breathe-box').classList.remove('show');$('breathe-box').style.display='';},350);
}
/* 情绪日记 */
const MOODS=[['😄',9],['🙂',7],['😐',5],['😔',3],['😢',1]];
let diaryMood=5;
function renderMoodPick(){
  $('mood-pick').innerHTML=MOODS.map(m=>`<span data-v="${m[1]}" class="${m[1]===diaryMood?'sel':''}" onclick="pickMood(${m[1]})">${m[0]}</span>`).join('')+'<span style="font-size:12px;color:var(--muted);align-self:center;">当前情绪：'+diaryMood+'/10</span>';
}
function pickMood(v){diaryMood=v;renderMoodPick();}
function saveDiary(){
  const ev=$('diary-event').value.trim(),th=$('diary-thought').value.trim(),co=$('diary-cope').value.trim();
  if(!ev&&!th){toast('至少写一项内容再保存吧');return;}
  saveTraining('情绪日记',{mood:diaryMood,event:ev,thought:th,cope:co,date:Date.now()});
  ['diary-event','diary-thought','diary-cope'].forEach(id=>$(id).value='');
  toast('✅ 日记已保存，坚持记录两周你会看到规律');
  renderDiaryList();
}
function renderDiaryList(){
  const u=DB.currentUser();if(!u)return;
  const list=((u.trainings||[]).filter(t=>t.type==='情绪日记')).slice(-5).reverse();
  $('diary-list').innerHTML=list.length?
    list.map(t=>`<div class="diary-item"><div class="d-head"><span>情绪 ${t.mood}/10</span><span>${fmtDay(t.date)}</span></div><div>${esc(t.event||'—')}</div></div>`).join('')
    :'<div class="empty">还没有日记，写下第一篇吧</div>';
}
function saveTraining(type,data){
  const u=DB.currentUser();if(!u)return;
  u.trainings=u.trainings||[];
  const record=Object.assign({type,id:'train-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),complete:true,rewarded:false},data);
  u.trainings.push(record);
  DB.saveUser(u);
  syncRoster(u);
  if(isPrimaryStudent(u)&&!record.rewarded&&completePrimaryTask('training',record.id,'自助训练')){record.rewarded=true;record.rewardedAt=Date.now();DB.saveUser(u);}
  else if(!isPrimaryStudent(u))awardPetForTask('自助训练');
}
/* 睡前引导（渐进式放松） */
const SLEEP_STEPS=[
  '找个舒服的姿势躺好，轻轻闭上眼睛。先做 3 次深呼吸：吸气…呼气…把注意力放在呼吸上。',
  '现在把注意力移到双脚。感受脚底贴着床的感觉，让双脚放松、再放松。',
  '注意力来到小腿和大腿，感觉它们渐渐变沉、放松，像陷进床垫里一样。',
  '放松腹部和背部，让呼吸自然地带动它们起伏，不需要控制。',
  '放松肩膀和手臂，把一天的紧绷都卸下来，放在床上。',
  '放松脖子、下巴、脸颊，松开紧咬的牙齿，眉头舒展开来。',
  '最后做一次全身扫描：从头顶到脚尖，哪里还有紧绷，就让哪里放松。',
  '想象自己躺在一片宁静的海面上，随着呼吸轻轻起伏。如果思绪飘走，就轻轻把它带回来。晚安。🌙'
];
let sleepStep=0,groundStep=0;
function nextSleepStep(){
  if(sleepStep>=SLEEP_STEPS.length){sleepStep=0;$('sleep-next').textContent='下一步';return;}
  $('sleep-steps').innerHTML=`<div class="g-step">${SLEEP_STEPS[sleepStep]}</div>`;
  sleepStep++;
  if(sleepStep>=SLEEP_STEPS.length){
    $('sleep-next').textContent='完成 ✅';
    saveTraining('睡前引导',{date:Date.now()});
    setTimeout(()=>{toast('✅ 完成睡前引导，愿你有个好梦');sleepStep=0;$('sleep-next').textContent='下一步';},100);
  }
}
/* 三件好事 */
function saveGratitude(){
  const g=[$('g1').value.trim(),$('g2').value.trim(),$('g3').value.trim()].filter(Boolean);
  if(!g.length){toast('至少写一件好事吧');return;}
  saveTraining('三件好事',{items:g,date:Date.now()});
  ['g1','g2','g3'].forEach(id=>$(id).value='');
  toast('✅ 已保存！坚持 21 天效果最佳');
}
/* 5-4-3-2-1 接地 */
const GROUND_STEPS=[
  '环顾四周，说出你看到的 <b>5</b> 样东西（比如：灯、杯子、窗帘…）',
  '仔细听，说出你听到的 <b>4</b> 种声音（空调声、键盘声、呼吸声…）',
  '感受你的身体，说出 <b>3</b> 种触觉（脚踩地板、衣服贴着皮肤、手放在腿上…）',
  '说出 <b>2</b> 种气味（咖啡味、空气的味道…）',
  '说出 <b>1</b> 种味道（喝口水感受它的味道）',
  '很好，你已经回到当下。做一次深呼吸：吸气 4 秒，呼气 8 秒。感觉怎么样？'
];
function nextGroundStep(){
  if(groundStep>=GROUND_STEPS.length){groundStep=0;return;}
  $('ground-steps').innerHTML=`<div class="g-step">${GROUND_STEPS[groundStep]}</div>`;
  groundStep++;
  if(groundStep>=GROUND_STEPS.length){saveTraining('接地练习',{date:Date.now()});setTimeout(()=>toast('✅ 完成接地练习，焦虑感会慢慢降下来'),100);}
}
/* __COMMUNITY_PART__ */
/* ═══════════════ 心屿 树洞 ═══════════════ */
function getPosts(){
  let p=DB.getData('posts',[]);
  if(!p.length){
    const cu=DB.currentUser();
    if(cu&&(cu.role==='student'||cu.role==='normal')){p=seedPosts();savePosts(p);}
  }
  return p;
}
function savePosts(p){DB.setData('posts',p);}
/* ── 系统推荐示例内容（v2.1）：首次进入自动生成，带明确标识 ── */
const SYSTEM_POSTS=[
 {tag:'求助',text:'马上就要考试了，可我一点都复习不进去。每天坐在图书馆里发呆，越急越看不进去，晚上还失眠。有没有同学也是这样？我该怎么办……',replies:[['心屿小助手','考前焦虑非常普遍，试试把任务拆小：今天只复习一个章节，完成就打勾。你现在的感受完全可以被理解。'],['匿名同学（示例）','我也是！后来发现是目标定太高了，改成只复习 30 分钟反而效率高了'],['匿名同学（示例）','抱抱你，先保证睡眠，脑子清醒比熬时间重要']]},
 {tag:'心情分享',text:'来大学三个月了，还是觉得融入不进去。室友都挺好的，但就是感觉隔着一层。晚上一个人回宿舍的时候特别想家。',replies:[['心屿小助手','孤独感是很多人刚入学时的共同体验，给自己一点时间。可以从一次主动的邀约开始。'],['匿名同学（示例）','一模一样……后来加入了羽毛球社团，慢慢就好多了']]},
 {tag:'求助',text:'最近总是半夜醒来就睡不着，脑子里全是第二天要做的事，越想越清醒。白天又困得不行，感觉自己快撑不住了。',replies:[['心屿小助手','睡眠困扰常常和「睡前思维反刍」有关。试试睡前一小时放下手机，把担心的事写下来，再做一组 4-7-8 呼吸。'],['匿名同学（示例）','试试睡前听点白噪音，我亲测有效！'],['匿名同学（示例）','如果持续超过两周，建议去学校心理咨询中心聊聊，失眠是可以治疗的']]},
 {tag:'经验分享',text:'分享一个对抗拖延的小方法：5 分钟启动法。不想做的时候先骗自己「只做 5 分钟」，一般开始之后就停不下来了。亲测对写论文有效！',replies:[['心屿小助手','「5 分钟启动法」是行为激活的有效技巧，感谢分享！'],['匿名同学（示例）','确实有用，我最近写课程论文就用这个方法']]},
 {tag:'求助',text:'和室友因为作息问题闹了矛盾，现在在宿舍里特别尴尬，谁都不说话。我该主动破冰吗？还是等对方先开口？',replies:[['心屿小助手','可以试试「我信息」表达：描述事实+说出感受+提出请求，比如「最近熄灯后还有声音，我睡得比较浅，能麻烦你戴耳机吗？」'],['匿名同学（示例）','主动一点不丢人，我上次就是先开口的，聊开就好了'],['匿名同学（示例）','买副耳塞也行，先把自己照顾好']]},
 {tag:'鼓励',text:'最近考研二战，压力大到每天哭。但我知道我不是一个人，论坛里好多同学都在互相打气。我们一起加油，不管结果如何，认真生活的你已经很棒了。',replies:[['心屿小助手','「认真生活的你已经很棒了」——这句话也说给我们每一个人。压力大的时候记得给自己休息的许可。'],['匿名同学（示例）','二战人抱团取暖，你一定可以的！']]}
];
const SYSTEM_POSTS_MORE=[
 {tag:'求助',text:'小组作业队友不靠谱，全都压在我一个人身上，快崩溃了。怎么拒绝又不伤和气？',replies:[['心屿小助手','可以试试先明确分工再沟通：「这部分我负责，那部分你负责，周五我们对一下进度」，把责任边界说清楚。'],['匿名同学（示例）','直接说出来吧，总比自己扛到崩溃好']]},
 {tag:'心情分享',text:'今天完成了拖延一个月的课程论文初稿，虽然很烂，但迈出第一步的感觉真好。',replies:[['心屿小助手','完成比完美重要，为你高兴！'],['匿名同学（示例）','恭喜！烂初稿好过没初稿']]},
 {tag:'求助',text:'面试被刷了，觉得自己一无是处。明明准备了很久，还是不行。该怎么调整心态？',replies:[['心屿小助手','一次面试结果不等于你的价值。试试「证据检验」：列出这次面试你做得好的地方和可以改进的地方，把失败变成复盘材料。'],['匿名同学（示例）','我也被刷过，后来复盘发现是紧张的问题，多模拟几次就好了']]}
];
function seedPosts(){
  const now=Date.now();
  return SYSTEM_POSTS.map((p,i)=>({
    id:'sys'+i,author:'心屿·示例',authorId:'__system__',system:true,
    text:p.text,tag:p.tag,date:now-(SYSTEM_POSTS.length-i)*5*3600*1000,
    likes:8+i*3,liked:false,reposts:3+i,reposted:false,mood:['😟','😢','💭','😊','😤','🥱'][i%6],
    replies:p.replies.map((r,j)=>({from:r[0],authorId:'__system__',text:r[1],date:now-(SYSTEM_POSTS.length-i)*5*3600*1000+j*60000})),
    reported:0
  }));
}
function addSystemPost(){
  const posts=getPosts();
  const idx=Math.floor(Math.random()*SYSTEM_POSTS_MORE.length);
  const p=SYSTEM_POSTS_MORE[idx];
  const now=Date.now();
  posts.unshift({id:'sys'+now,author:'心屿·示例',authorId:'__system__',system:true,text:p.text,tag:p.tag,date:now,likes:5+Math.floor(Math.random()*6),liked:false,reposts:2+Math.floor(Math.random()*3),reposted:false,mood:['😟','😢','💭','😤'][Math.floor(Math.random()*4)],replies:p.replies.map(r=>({from:r[0],authorId:'__system__',text:r[1],date:now})),reported:0});
  savePosts(posts);
  renderPosts();
  toast('✨ 已为你推荐一篇新的示例内容');
}
function aiReplyToPost(i){
  const p=getPosts();if(!p[i])return;
  const crisis=crisisCheck(p[i].text);
  let reply='';
  if(crisis){reply='⚠️ 我看到你提到了「'+crisis+'」。这非常重要，请一定不要独自承受——立即拨打全国心理援助热线 12356（24小时），或告诉身边信任的人，或联系学校心理中心。你的安全是第一位的。';}
  else{
    const pool=[
      '我在树洞里看到你的分享了，谢谢你愿意说出来。这样的感受很多同龄人都有过，你不是一个人。💙',
      '抱抱你。先允许自己有情绪，再慢慢来，树洞会一直在这里。',
      '你的感受是真实的，也值得被认真对待。今天有做什么照顾自己的小事吗？',
      '谢谢你分享这些。如果需要，也可以去「AI 疏导」和我多聊一会儿。'
    ];
    reply=pool[Math.floor(Math.random()*pool.length)];
  }
  p[i].replies=p[i].replies||[];
  p[i].replies.push({from:'心屿 AI',authorId:'__system__',text:reply,date:Date.now()});
  savePosts(p);renderPosts();
  toast(crisis?'🤖 心屿 AI 已回应（含危机转介提示）':'🤖 心屿 AI 已回应');
}
function renderEmpathyBar(){
  const bar=$('empathy-bar');if(!bar)return;
  const posts=getPosts();
  const sys=posts.filter(p=>p.system);
  const pick=sys.length?sys[Math.floor(Math.random()*sys.length)]:null;
  bar.innerHTML=pick?`💛 今日共鸣：「${esc(pick.text.slice(0,36))}${pick.text.length>36?'…':''}」 <button onclick="focusPost(${posts.indexOf(pick)})">去看看 →</button>`:'💛 树洞里还没有内容，来发第一条吧';
}
function focusPost(i){
  const el=$('reply-'+i);if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  const post=el.closest('.post');
  post.style.boxShadow='0 0 0 2.5px var(--teal)';
  setTimeout(()=>{post.style.boxShadow='';},2200);
}
function replyAvatar(r){
  const u=DB.currentUser();
  if(u&&r.authorId===u.username)return avatarHTML(u,22,'avatar-img');
  if(r.authorId==='__system__')return '<span class="avatar" style="width:22px;height:22px;font-size:10px;">屿</span>';
  return '<span class="avatar" style="width:22px;height:22px;font-size:10px;">🕶️</span>';
}
function renderPosts(){
  const list=getPosts();
  const el=$('post-list');
  renderEmpathyBar();
  renderVents();
  renderPostMoodPick();
  renderPrimaryModuleCopy('community');
  if(!list.length){el.innerHTML='<div class="empty">树洞还很安静，来发第一条吧 🌱</div>';return;}
  el.innerHTML=list.map((p,i)=>postHTML(p,i)).join('');
}
function postHTML(p,i){
  const headAvatar=p.system?'<span class="avatar" style="width:26px;height:26px;font-size:12px;">屿</span>':'<span class="avatar" style="width:26px;height:26px;font-size:12px;">🕶️</span>';
  const primary=isPrimaryStudent(DB.currentUser()),moodCfg=primary&&moodConfig(p.mood);
  const moodHTML=p.mood?`<span class="p-mood">${moodCfg?moodIconHTML(moodCfg)+' '+esc(moodCfg.name):esc(p.mood)}</span>`:'';
  const mine=primary&&!p.system&&p.authorId===(DB.currentUser()||{}).username;
  const hidden=mine&&p.archived&&!primaryArchiveReveals.has('post:'+p.id);
  return `<div class="post">
    <div class="p-head">
      ${headAvatar}
      <span class="p-name">${esc(p.name||p.author||'匿名同学')}</span>
      ${moodHTML}
      ${p.system?'<span class="p-sys">✦ 系统推荐</span>':'<span class="p-anon">匿名</span>'}
      ${p.tag?`<span class="p-tag">${esc(p.tag)}</span>`:''}
      <span class="p-time">${fmtDay(p.date)}</span>
    </div>
    ${hidden?'<div class="primary-archive-note"><b>这条心事已封存</b><span>内容默认折叠，这不是密码加密。</span><button onclick="revealPrimaryArchive(\'post\',\''+esc(p.id)+'\')">暂时查看</button></div>':`<div class="p-text">${esc(p.text)}</div>${p.aiAnalysis?aiAnalysisHTML(p.aiAnalysis):''}`}
    <div class="p-actions">
      <button class="p-act ${p.warm&&p.warm.heard?'liked':''}" onclick="warmAction(${i},'heard')">❤️ 我听到了 ${(p.warmCounts&&p.warmCounts.heard||0)+(p.warm&&p.warm.heard?1:0)}</button>
      <button class="p-act ${p.warm&&p.warm.with?'liked':''}" style="color:${p.warm&&p.warm.with?'#15803d':''};" onclick="warmAction(${i},'with')">🌱 陪你一起 ${(p.warmCounts&&p.warmCounts.with||0)+(p.warm&&p.warm.with?1:0)}</button>
      <button class="p-act ${p.warm&&p.warm.helped?'liked':''}" style="color:${p.warm&&p.warm.helped?'#1e40af':''};" onclick="warmAction(${i},'helped')">💡 这个方法帮助了我 ${(p.warmCounts&&p.warmCounts.helped||0)+(p.warm&&p.warm.helped?1:0)}</button>
      <button class="p-act" onclick="focusReply(${i})">💬 回应 ${(p.replies||[]).length}</button>
      <button class="p-act ${p.reposted?'reposted':''}" onclick="repostPost(${i})">🔁 转发 ${p.reposts||0}</button>
      <button class="p-act ai" onclick="aiReplyToPost(${i})">🤖 AI 回应</button>
      ${p.system?'':'<button class="p-act report" onclick="reportPost('+i+')">🚩 举报</button>'}
      ${mine?`<button class="p-act archive" onclick="togglePostArchive(${i})">${p.archived?'取消封存':'封存心事'}</button>`:''}
    </div>
    <div class="p-replies" ${hidden?'hidden':''}>
      ${(p.replies||[]).map(r=>`<div class="reply">${replyAvatar(r)}<div class="r-body"><b>${esc(r.from)}</b>：${esc(r.text)}</div></div>`).join('')}
      <div class="r-input"><input id="reply-${i}" placeholder="友善地回应 Ta…"><button onclick="addReply(${i})">回应</button></div>
    </div>
  </div>`;
}
let postTag='心情分享';
let postMood='';let ventMode='public';
const STANDARD_POST_MOODS=[['😊','开心'],['😔','难过'],['😰','焦虑'],['😕','迷茫'],['😠','愤怒']];
const PRIMARY_POST_MOODS=[['happy','开心'],['unhappy','不开心'],['anxious','焦虑'],['calm','平静'],['tired','疲惫']];
const primaryArchiveReveals=new Set();
function renderPostMoodPick(){
  const el=$('post-mood-pick');if(!el)return;
  const primary=isPrimaryStudent(DB.currentUser()),moods=primary?PRIMARY_POST_MOODS:STANDARD_POST_MOODS,prompt=primary?'<b class="mood-prompt">此刻情绪</b>':'<span style="font-size:12px;color:var(--muted);">此刻情绪：</span>';el.innerHTML=prompt+moods.map(m=>{const cfg=moodConfig(m[0]);return `<span data-m="${m[0]}" class="${postMood===m[0]?'sel':''}" onclick="pickPostMood('${m[0]}')">${primary&&cfg?moodIconHTML(cfg):''} ${m[1]}</span>`;}).join('');
}
function pickPostMood(m){postMood=(postMood===m?'':m);renderPostMoodPick();}
function setVentMode(m){ventMode=m;$('mode-public').classList.toggle('sel',m==='public');$('mode-private').classList.toggle('sel',m==='private');}
function getVents(){return DB.getData('vents',[]);}
function saveVents(v){DB.setData('vents',v);}
function renderVents(){
  const box=$('vent-box'),list=$('vent-list');if(!box||!list)return;
  const v=getVents();
  box.style.display=v.length?'block':'none';
  list.innerHTML=v.slice().reverse().map((x,i)=>{const idx=v.length-1-i,hidden=x.archived&&!primaryArchiveReveals.has('vent:'+x.id),cfg=moodConfig(x.mood);return `<div class="vent-item"><div class="v-head"><span>${fmtDay(x.date)} ${cfg?moodIconHTML(cfg)+' '+esc(cfg.name):(x.mood?esc(x.mood):'')}${x.voice?' · 🎤 语音倾诉':''}</span><span><button class="v-archive" onclick="toggleVentArchive(${idx})">${x.archived?'取消封存':'封存心事'}</button><button class="v-del" onclick="deleteVent(${idx})">删除</button></span></div>${hidden?`<div class="primary-archive-note"><b>这条心事已封存</b><span>内容默认折叠，这不是密码加密。</span><button onclick="revealPrimaryArchive('vent','${esc(x.id)}')">暂时查看</button></div>`:`<div>${esc(x.text)}</div>${x.aiReply?`<div class="ai-analysis" style="margin-top:8px;"><div class="aa-head">🤖 AI 回应</div>${esc(x.aiReply)}</div>`:''}${x.analysis?aiAnalysisHTML(x.analysis):''}`}</div>`;}).join('')||'<div class="empty">还没有私密倾诉，写给自己一段话吧</div>';
}
function revealPrimaryArchive(type,id){primaryArchiveReveals.add(type+':'+id);type==='post'?renderPosts():renderVents();}
function toggleVentArchive(idx){const v=getVents();if(!v[idx])return;v[idx].archived=!v[idx].archived;primaryArchiveReveals.delete('vent:'+v[idx].id);saveVents(v);renderVents();toast(v[idx].archived?'这条心事已封存':'已取消封存');}
function togglePostArchive(idx){const p=getPosts(),u=DB.currentUser();if(!p[idx]||p[idx].authorId!==(u||{}).username)return;p[idx].archived=!p[idx].archived;primaryArchiveReveals.delete('post:'+p[idx].id);savePosts(p);renderPosts();toast(p[idx].archived?'这条心事已封存':'已取消封存');}
function deleteVent(idx){const v=getVents();v.splice(idx,1);saveVents(v);renderVents();toast('已删除这条倾诉');}
document.addEventListener('click',e=>{
  const t=e.target.closest('#post-tag-pick span');
  if(t){postTag=t.dataset.tag;document.querySelectorAll('#post-tag-pick span').forEach(s=>s.classList.toggle('sel',s===t));}
});
let postLock=false;
function setPostBusy(busy){postLock=busy;const btn=$('post-submit');if(btn){btn.disabled=busy;btn.textContent=busy?'投递中…':'发布';}}
function playTreeLetter(mode,mood,done){
  if(!isPrimaryStudent(DB.currentUser())){done();return;}
  const scene=$('primary-tree-scene'),letter=$('flying-letter');if(!scene||!letter){done();return;}
  scene.classList.toggle('private-letter',mode==='private');scene.classList.remove('letter-flying','letter-landed','comfort');
  void scene.offsetWidth;scene.classList.add('letter-flying');
  if(['unhappy','anxious','tired'].includes(mood))scene.classList.add('comfort');
  const finish=()=>{scene.classList.add('letter-landed');setTimeout(()=>{scene.classList.remove('letter-flying','letter-landed','comfort');done();},650);};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setTimeout(finish,600);return;}
  setTimeout(finish,2850);
}
function addPost(){
  if(postLock)return;
  setPostBusy(true);
  const text=$('post-input').value.trim();
  if(!text){setPostBusy(false);toast('写点什么再发布吧');return;}
  const bad=FILTER_WORDS.find(w=>text.includes(w));
  if(bad){setPostBusy(false);toast('⚠️ 内容包含敏感词「'+bad+'」，暂时不能保存或发布。');const hit={word:bad,cat:'敏感表达'},ev=sensitiveTrigger(text,'心屿树洞（提交拦截）');setTimeout(()=>openSensitiveModal(hit,ev),400);return;}
  if(ventMode==='private'){
    const v=getVents();
    const mood=postMood,record={id:'vent-'+Date.now(),text,mood,date:Date.now(),archived:false,rewarded:false};v.push(record);
    saveVents(v);
    $('post-input').value='';postMood='';renderPostMoodPick();
    playTreeLetter('private',mood,()=>{renderVents();toast('信已经收进你的私密树洞，只留给自己看。');if(isPrimaryStudent(DB.currentUser())&&completePrimaryTask('treehole',record.id,'心屿树洞')){record.rewarded=true;record.rewardedAt=Date.now();saveVents(v);}else if(!isPrimaryStudent(DB.currentUser()))awardPetForTask('心屿树洞');setPostBusy(false);});
    return;
  }
  const u=DB.currentUser();
  const posts=getPosts();
  const aiA=aiAnalyzePost(text);
  const mood=postMood,record={id:'u'+Date.now(),author:'匿名同学',authorId:u?u.username:'',text,tag:postTag,mood,date:Date.now(),likes:0,liked:false,reposts:0,reposted:false,replies:[],reported:0,archived:false,rewarded:false,aiAnalysis:aiA,warm:{heard:false,with:false,helped:false},warmCounts:{heard:0,with:0,helped:0}};posts.unshift(record);
  savePosts(posts);
  $('post-input').value='';postMood='';renderPostMoodPick();
  if(u){u.postCount=(u.postCount||0)+1;DB.saveUser(u);syncRoster(u);}
  if(aiA.risk==='high'){
    const ev=sensitiveTrigger(text,'心屿树洞（AI 分析高风险）');
    setTimeout(()=>openSensitiveModal({word:aiA.word||'高风险表达',cat:'树洞高风险表达'},ev),700);
  }else if(aiA.risk==='mid'){
    addRiskEvent({type:'risk-grade',trigger:'【树洞】AI 分析出中风险表达：「'+text.slice(0,30)+'…」',level:'mid',action:'AI 即时回应 + 持续关注',notes:[{ts:Date.now(),text:'情绪:'+aiA.emo.join('/')+' 压力来源:'+aiA.pressure.join('/')}]});
  }
  playTreeLetter('public',mood,()=>{renderPosts();toast('信已经飞进心屿树洞啦，会有人温柔地读到它。');if(isPrimaryStudent(u)&&completePrimaryTask('treehole',record.id,'心屿树洞')){record.rewarded=true;record.rewardedAt=Date.now();savePosts(posts);}else if(!isPrimaryStudent(u))awardPetForTask('心屿树洞');setPostBusy(false);});
}
function likePost(i){const p=getPosts();if(!p[i])return;p[i].liked=!p[i].liked;p[i].likes=(p[i].likes||0)+(p[i].liked?1:-1);savePosts(p);renderPosts();}
function addReply(i){
  const input=$('reply-'+i),text=input.value.trim();
  if(!text)return;
  const p=getPosts();
  const bad=FILTER_WORDS.find(w=>text.includes(w));
  if(bad){toast('⚠️ 回应包含不当内容，请友善发言');return;}
  const u=DB.currentUser();
  p[i].replies=p[i].replies||[];
  p[i].replies.push({from:'我',authorId:u?u.username:'',text,date:Date.now()});
  savePosts(p);input.value='';renderPosts();
  if(u){u.replyCount=(u.replyCount||0)+1;DB.saveUser(u);syncRoster(u);}
  toast('✅ 已回应');
}
function repostPost(i){
  const p=getPosts();if(!p[i])return;
  p[i].reposted=!p[i].reposted;
  p[i].reposts=(p[i].reposts||0)+(p[i].reposted?1:-1);
  savePosts(p);renderPosts();
  const u=DB.currentUser();
  if(u){u.repostCount=(u.repostCount||0)+(p[i].reposted?1:-1);DB.saveUser(u);syncRoster(u);}
  toast(p[i].reposted?'✅ 已转发（演示记录，互动结果已保存）':'已取消转发');
}
function focusReply(i){const el=$('reply-'+i);if(el)el.focus();}
function reportPost(i){
  const p=getPosts();
  p[i].reported=(p[i].reported||0)+1;
  savePosts(p);
  toast('🚩 已举报，管理员会尽快处理（演示版仅记录）');
}
/* ═══════════════ 信息管理（v2.1，仅管理员） ═══════════════ */
function normOrg(s){return String(s||'').trim().toLowerCase().replace(/[\uFF01-\uFF5E]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).replace(/[（）()]/g,'').replace(/\s+/g,'');}
function orgMatches(admin,person){
  if(!admin||!person)return false;
  if(!person.orgName)return false;
  const an=normOrg(admin.orgName),pn=normOrg(person.orgName);
  if(!an||!pn)return false;
  if(admin.role==='school_admin')return person.orgType==='school'&&pn===an;
  if(admin.role==='community_admin')return (person.orgType==='community'||person.orgType==='street')&&pn===an;
  return false;
}
function managePersons(){
  const u=DB.currentUser();if(!u)return[];
  const roster=getRoster();
  return Object.values(roster).filter(p=>p.username!==u.username&&p.role!=='school_admin'&&p.role!=='community_admin'&&orgMatches(u,p)).sort((a,b)=>(b.lastActive||0)-(a.lastActive||0));
}
function latestRecord(p){return (p.records||[]).slice().sort((a,b)=>b.date-a.date)[0]||null;}
function renderManage(){
  const u=DB.currentUser();
  if(!u)return;
  if(!isAdminUser(u)){toast('信息管理仅对管理人员开放');go('home');return;}
  renderNavAdmin();
  const isSchool=u.role==='school_admin';
  $('mg-title').textContent=isSchool?'🏫 学校心理健康趋势分析':'🏘️ 区域心理健康概览';
  const orgLabel=isSchool?('学校 · '+u.orgName):((u.orgType==='street'?'街道':'社区')+' · '+u.orgName);
  $('mg-sub').innerHTML='数据范围：<b>'+esc(orgLabel)+'</b>'+(u.region?'（'+esc(u.region)+'）':'')+' · <b>脱敏聚合数据</b>，来自选择同一归属的'+(isSchool?'学生':'居民')+'/普通用户，实时同步、刷新不丢失。'+'<br><span style="color:var(--muted);">🔒 隐私口径：管理人员无法查看任何人的私人聊天与树洞内容。</span>';
  renderMgOverview();
}
function renderMgOverview(){
  const persons=managePersons();
  const ledger=ledgerForAdmin(DB.currentUser());
  const view=$('mg-view');
  const totalRec=persons.reduce((s,p)=>s+(p.records||[]).length,0);
  const totalTrain=persons.reduce((s,p)=>s+(p.trainings||[]).length,0);
  const risk=persons.filter(p=>{const l=latestRecord(p);return l&&(l.cls==='severe'||l.cls==='moderate');});
  const dist={mild:0,moderate:0,severe:0,none:0};
  persons.forEach(p=>{const l=latestRecord(p);if(!l){dist.none++;return;}dist[l.cls]=(dist[l.cls]||0)+1;});
  const distBars=[['平稳（良好/轻度）',dist.mild,'#14b8a6'],['中度关注',dist.moderate,'#d97706'],['高度关注',dist.severe,'#dc2626'],['未测评',dist.none,'#94a3b8']];
  const distBarsHtml=distBars.map(b=>`
    <div class="mg-bar-row"><span class="lb">${b[0]}</span><div class="bar"><i style="width:${persons.length?Math.round(b[1]/persons.length*100):0}%;background:${b[2]};min-width:${b[1]?6:0}px;"></i></div><span class="num">${b[1]} 人</span></div>`).join('')
    +'<p style="font-size:12px;color:var(--muted);margin-top:8px;">按每个人最近一次测评的等级归类（PHQ-9/GAD-7/PSS-10/ISI/RSES 任一套最近得分）</p>';
  // 各量表平均分（全部记录，相对满分）
  const scaleAgg={};
  SCALES.forEach(s=>{scaleAgg[s.id]={sum:0,n:0,max:s.max};});
  persons.forEach(p=>(p.records||[]).forEach(r=>{if(scaleAgg[r.scaleId]){scaleAgg[r.scaleId].sum+=r.total;scaleAgg[r.scaleId].n++;}}));
  const avgBars=SCALES.map(s=>{const a=scaleAgg[s.id];const avg=a.n?a.sum/a.n:0;return {name:s.name,avg,max:s.max,n:a.n};}).filter(b=>b.n>0);
  const avgBarsHtml=avgBars.length?avgBars.map(b=>{
    const pct=b.avg/b.max*100;
    const col=pct>66?'#dc2626':pct>33?'#d97706':'#0e7490';
    return `<div class="mg-bar-row"><span class="lb">${esc(b.name)}</span><div class="bar"><i style="width:${Math.round(pct)}%;background:${col};"></i></div><span class="num">${b.n?b.avg.toFixed(1):'—'} / ${b.max}</span></div>`;
  }).join(''):'<div class="empty">暂无测评数据</div>';
  // 年级维度（学校）与重点关注方向
  const isSchool=DB.currentUser().role==='school_admin';
  const gradeAgg={};
  persons.forEach(p=>{const g=p.grade||'未填写';gradeAgg[g]=gradeAgg[g]||{n:0,risk:0};gradeAgg[g].n++;const l=latestRecord(p);if(l&&(l.cls==='moderate'||l.cls==='severe'))gradeAgg[g].risk++;});
  const gradeHtml=Object.keys(gradeAgg).length?Object.entries(gradeAgg).map(([g,d])=>`<div class="mg-bar-row"><span class="lb">${esc(g)}</span><div class="bar"><i style="width:${d.n?Math.round(d.risk/d.n*100):0}%;background:${d.risk?'#d97706':'#14b8a6'};min-width:${d.risk?6:0}px;"></i></div><span class="num">${d.risk}/${d.n} 人</span></div>`).join(''):'<div class="empty">暂无数据</div>';
  const focus=avgBars.filter(b=>b.avg/b.max>0.4);
  const focusHtml=focus.length?focus.map(f=>`<div class="mg-bar-row"><span class="lb">${esc(f.name)}</span><span class="num" style="width:auto;">平均 ${f.avg.toFixed(1)}/${f.max}（${Math.round(f.avg/f.max*100)}%）</span></div>`).join('')+'<p style="font-size:12px;color:var(--muted);margin-top:6px;">建议：优先安排相关人群的心理科普与团体辅导，必要时启动专业转介。</p>':'<div class="empty">当前各维度平均分均在关注阈值内</div>';
  const mgGrid2=`<div class="mg-grid"><div class="panel" style="margin:0;"><div class="panel-title">${isSchool?'🎓 年级维度 · 需关注人数占比':'🗂️ 区域口径说明'}</div>${isSchool?gradeHtml:'<div style="font-size:13px;color:var(--muted);padding:4px 2px;">社区管理人员按「社区/街道」聚合查看脱敏数据（覆盖人数、状态分布、量表平均分、重点关注方向），暂不区分年级维度。<br><br>💡 资源下沉：从「资源连接」登记心理老师/机构/公益服务，对需关注人员发起转介，形成闭环。</div>'}</div><div class="panel" style="margin:0;"><div class="panel-title">🧭 重点关注方向</div>${focusHtml}</div></div>`;
  // 最近测评动态
  const recents=[];
  persons.forEach(p=>(p.records||[]).forEach(r=>recents.push(Object.assign({who:p.nickname,uname:p.username,avatar:p.avatar},r))));
  recents.sort((a,b)=>b.date-a.date);
  const recentHtml=recents.slice(0,6).map(r=>{
    const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';
    const cls=r.cls==='mild'?'good':r.cls==='moderate'?'mid':'bad';
    return `<div class="history-item"><span>${r.avatar?`<img class="u-ava" style="width:22px;height:22px;border-radius:50%;vertical-align:-5px;margin-right:6px;" src="${esc(r.avatar)}">`:''}${esc(r.who)} · ${esc(s.name)}</span><span class="h-score ${cls}">${r.total}/${s.max} · ${esc(r.level)}</span><span style="font-size:11.5px;color:#94a3b8;">${fmtDay(r.date)}</span></div>`;
  }).join('')||'<div class="empty">暂无测评动态。让学生/普通用户选择同一归属并完成测评后，这里会实时更新。</div>';
  view.innerHTML=`
  <div class="mg-metrics">
    <div class="mg-metric"><div class="m-num">${persons.length}</div><div class="m-label">覆盖人数</div></div>
    <div class="mg-metric"><div class="m-num">${totalRec}</div><div class="m-label">测评总次数</div></div>
    <div class="mg-metric warn"><div class="m-num">${risk.length}</div><div class="m-label">需关注人数（最近一次测评中度及以上）</div></div>
    <div class="mg-metric"><div class="m-num">${totalTrain}</div><div class="m-label">自助训练总次数</div></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;">
      <div class="panel-title">🧭 最近状态分布</div>
      ${distBarsHtml}
    </div>
    <div class="panel" style="margin:0;">
      <div class="panel-title">📈 各量表平均分（相对满分）</div>
      ${avgBarsHtml}
    </div>
  </div>
  ${mgGrid2}
  <div class="panel" style="margin:0 0 16px;">
    <div class="panel-title">🕐 最近测评动态</div>
    ${recentHtml}
  </div>
  <div class="panel" style="margin:0;">
    <div class="panel-title">👥 人员列表（点击「详情」下钻查看完整指标）</div>
    <div class="mg-toolbar">
      <input id="mg-search" placeholder="搜索昵称 / 用户名…" oninput="renderMgList()">
      <select id="mg-filter" onchange="renderMgList()">
        <option value="">全部状态</option><option value="mild">平稳</option><option value="moderate">中度关注</option><option value="severe">高度关注</option><option value="none">未测评</option>
      </select>
      <button class="btn btn-soft" style="padding:8px 14px;font-size:12.5px;" onclick="fillDemoData()">填充演示数据</button>
    </div>
    <div id="mg-list"></div>
  </div>
  <div class="panel" style="margin:0;">
    <div class="panel-title">📒 风险事件台账（${ledger.length} 条）<button class="t-btn" style="margin-left:auto;font-size:12px;padding:4px 12px;" onclick="exportLedger()">⬇️ 导出 JSON</button></div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:8px;">风险分级判定、敏感词触发与人工支持启动均自动记录（分级支持闭环），可查询可导出。</p>
    ${ledgerItemsHtml(ledger.slice(0,20),false)}
  </div>`;
  renderMgList();
}
function renderMgList(){
  const listEl=$('mg-list');if(!listEl)return;
  const kw=($('mg-search')?$('mg-search').value:'').trim().toLowerCase();
  const f=$('mg-filter')?$('mg-filter').value:'';
  let persons=managePersons();
  if(kw)persons=persons.filter(p=>(p.nickname||'').toLowerCase().includes(kw)||(p.username||'').toLowerCase().includes(kw));
  if(f)persons=persons.filter(p=>{const l=latestRecord(p);if(f==='none')return !l;return l&&l.cls===f;});
  if(!persons.length){listEl.innerHTML='<div class="empty">该范围内还没有用户数据。让学生/普通用户选择同一归属并完成测评后，这里会自动汇总。也可点击上方「填充演示数据」快速查看效果。</div>';return;}
  listEl.innerHTML=`<div style="overflow-x:auto;"><table class="mg-table"><thead><tr><th></th><th>昵称</th><th>身份</th><th>最近测评</th><th>最近状态</th><th>测评次数</th><th>最近活跃</th><th></th></tr></thead><tbody>`+persons.map(p=>{
    const l=latestRecord(p);
    const s=l?SCALES.find(x=>x.id===l.scaleId):null;
    const roleLabel=p.role==='student'?'学生':p.role==='normal'?'普通用户':'—';
    return `<tr>
      <td>${p.avatar?`<img class="u-ava" src="${esc(p.avatar)}">`:`<span class="avatar" style="width:30px;height:30px;font-size:12px;">${esc((p.nickname||'?')[0])}</span>`}</td>
      <td><b>${esc(p.nickname)}</b><br><span style="font-size:11px;color:#94a3b8;">@${esc(p.username)}</span></td>
      <td><span class="role-badge">${roleLabel}</span></td>
      <td>${l&&s?esc(s.name):'—'}</td>
      <td>${l?`<span class="h-score ${l.cls==='mild'?'good':l.cls==='moderate'?'mid':'bad'}">${esc(l.level)}</span>`:'<span style="color:#94a3b8;">未测评</span>'}${p.referred?'<span class="ref-status done">已转介</span>':''}</td>
      <td>${(p.records||[]).length}</td>
      <td>${p.lastActive?fmtDay(p.lastActive):'—'}</td>
      <td><button class="back-btn" style="color:var(--teal);border-color:var(--teal);" onclick="showPerson('${esc(p.username)}')">详情 →</button></td>
    </tr>`;
  }).join('')+`</tbody></table></div>`;
}
function answerLabels(scale,rec){
  return scale.questions.map((q,i)=>{
    const v=rec.answers&&rec.answers[i];
    const opt=scale.options.find(o=>o[1]===v);
    return {q:q,label:opt?opt[0]:(v==null?'未作答':'值'+v)};
  });
}
function showPerson(username){
  const roster=getRoster();
  const p=roster[username];if(!p){toast('未找到该用户数据');return;}
  const u=DB.currentUser();
  const view=$('mg-view');
  const roleLabel=p.role==='student'?'学生':p.role==='normal'?'普通用户':'—';
  const leftTag=(p.tags&&p.tags.includes('leftbehind'));
  let html=`<button class="back-btn" onclick="renderMgOverview()">← 返回概览</button>
  <div class="mg-detail-head">
    ${p.avatar?`<img class="avatar-lg" src="${esc(p.avatar)}">`:`<span class="avatar" style="width:64px;height:64px;font-size:26px;">${esc((p.nickname||'?')[0])}</span>`}
    <div class="who">
      <b>${esc(p.nickname)}</b> <span class="role-badge">${roleLabel}</span>${leftTag?'<span class="ref-status pending">🏷️ 留守儿童</span>':''}
      <br><span>@${esc(p.username)} · 归属：${esc(p.orgName||'—')}${p.region?' · '+esc(p.region):''} · 加入 ${fmtDay(p.joinedAt)}</span>
      <br><span>最近活跃：${p.lastActive?fmtDay(p.lastActive):'—'} · 测评 ${(p.records||[]).length} 次 · 训练 ${(p.trainings||[]).length} 次 · 发帖 ${p.postCount||0} · 回应 ${p.replyCount||0} · 转发 ${p.repostCount||0} · 聊天 ${p.chatCount||0}</span>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
      ${u&&u.role==='school_admin'?`<button class="btn btn-soft" style="padding:8px 16px;font-size:13px;" onclick="openReferral('${esc(p.username)}')">🧭 转介建议</button>`:''}
      ${isAdminUser(u)?`<button class="btn btn-soft" style="padding:8px 16px;font-size:13px;" onclick="toggleLeftBehindTag('${esc(p.username)}')">${leftTag?'🏷️ 取消留守儿童标注':'🏷️ 标注为留守儿童'}</button>`:''}
    </div>
  </div>`;
  const latest={};
  (p.records||[]).forEach(r=>{if(!latest[r.scaleId]||r.date>latest[r.scaleId].date)latest[r.scaleId]=r;});
  const scaleCards=SCALES.filter(s=>latest[s.id]).map(s=>{
    const r=latest[s.id];
    const col=r.cls==='mild'?'var(--teal)':r.cls==='moderate'?'#b45309':'var(--danger)';
    return `<div class="mg-scale-card"><div class="sc-head"><span>${esc(s.name)}</span><span class="sc-time">${fmtDay(r.date)}</span></div><div class="sc-score" style="color:${col};">${r.total}<span style="font-size:13px;color:var(--muted);">/${s.max}</span></div><div style="font-size:12.5px;color:var(--muted);">${esc(r.level)}</div></div>`;
  }).join('');
  html+=`<div class="panel"><div class="panel-title">🧠 心理状态与测试结果（最近一次各量表）</div>
    ${scaleCards?`<div class="mg-scale-cards">${scaleCards}</div>`:'<div class="empty">该用户还没有测评记录</div>'}
  </div>`;
  // 逐题反应（题目级指标，敏感数据默认折叠）
  const qSec=SCALES.filter(s=>latest[s.id]&&latest[s.id].answers&&latest[s.id].answers.length).map(s=>{
    const r=latest[s.id];
    const rows=answerLabels(s,r);
    const hot=s.id==='phq9'?[8]:[];
    return `<div class="panel"><div class="panel-title">🔬 ${esc(s.name)} · 逐题反应（${fmtDay(r.date)}）</div>
      ${rows.map((x,i)=>`<div class="mg-scale-card" style="margin-bottom:8px;${hot.includes(i)?'border-color:#fca5a5;background:#fef2f2;':''}">
        <div style="font-size:12.5px;color:var(--muted);">第${i+1}题${hot.includes(i)?' <span class="p-sys" style="color:#b91c1c;background:#fee2e2;border-color:#fecaca;">⚠ 需重点关注</span>':''}</div>
        <div style="font-size:13px;margin-top:2px;">${esc(x.q)}</div>
        <div style="font-size:12.5px;color:var(--teal-dark);margin-top:4px;"><b>作答：</b>${esc(x.label)}</div>
      </div>`).join('')}
    </div>`;
  }).join('');
  html+=`<div class="panel"><div class="panel-title">🔬 逐题反应（敏感数据）</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:10px;">🔒 逐题作答属于敏感个人数据，默认折叠，仅经学生本人知情同意后由授权人员查看。</p>
    <button class="t-btn" onclick="toggleQSec(this)">展开逐题反应（敏感数据）</button>
    <div class="q-sec" style="display:none;margin-top:10px;">${qSec||'<div class="empty">该用户无逐题作答记录</div>'}</div>
  </div>`;
  const history=(p.records||[]).slice().sort((a,b)=>b.date-a.date).map(r=>{
    const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';
    return `<div class="history-item"><span>${esc(s.name)} · ${fmtDay(r.date)}</span><span class="h-score ${r.cls==='mild'?'good':r.cls==='moderate'?'mid':'bad'}">${r.total}/${s.max} · ${esc(r.level)}</span></div>`;
  }).join('');
  html+=`<div class="panel"><div class="panel-title">📋 全部测评历史（${(p.records||[]).length}）</div>${history||'<div class="empty">暂无记录</div>'}</div>`;
  const trains=(p.trainings||[]).slice().sort((a,b)=>b.date-a.date).slice(0,20).map(t=>`<div class="history-item"><span>🧘 ${esc(t.type)}</span><span style="font-size:11.5px;color:#94a3b8;">${fmtDay(t.date)}</span></div>`).join('');
  html+=`<div class="panel"><div class="panel-title">📝 自助训练记录（${(p.trainings||[]).length}）</div>${trains||'<div class="empty">暂无记录</div>'}</div>`;
  view.innerHTML=html;
  window.scrollTo({top:0,behavior:'smooth'});
}
function toggleQSec(btn){
  const sec=btn.closest('.panel').querySelector('.q-sec');
  const show=sec.style.display!=='block';
  sec.style.display=show?'block':'none';
  btn.textContent=show?'收起逐题反应':'展开逐题反应（敏感数据）';
}
async function fillDemoData(){
  const admin=DB.currentUser();if(!admin||!isAdminUser(admin))return;
  const users=DB.users;
  const roster=getRoster();
  const isSchool=admin.role==='school_admin';
  const demoUsers=[
    {name:'demo-stu1',nick:'小雨同学',role:isSchool?'student':'normal',recs:[['phq9',6],['gad7',8],['pss10',19]],trains:['情绪日记','4-7-8呼吸']},
    {name:'demo-stu2',nick:'晨光同学',role:isSchool?'student':'normal',recs:[['phq9',15],['gad7',13],['isi7',16],['pss10',28]],trains:['认知重构','睡前引导','情绪日记']},
    {name:'demo-stu3',nick:'晚风同学',role:isSchool?'student':'normal',recs:[['phq9',2],['gad7',3]],trains:[]},
    {name:'demo-user1',nick:'林间用户',role:'normal',recs:[['phq9',10],['gad7',11]],trains:['接地练习']}
  ];
  const demoOrgType=isSchool?'school':(admin.orgType==='street'?'street':'community');
  let added=0,rebound=0;
  for(const d of demoUsers){
    if(users[d.name]){
      users[d.name].orgType=demoOrgType;
      users[d.name].orgName=admin.orgName;
      users[d.name].region=admin.region||users[d.name].region;
      if(!users[d.name].role)users[d.name].role=d.role;
      DB.saveUsers(users);
      syncRoster(users[d.name]);
      rebound++;
      continue;
    }
    const createdAt=Date.now()-86400000*20;
    users[d.name]={
      username:d.name,nickname:d.nick,password:await sha256('demo123456'),createdAt,records:[],trainings:[],chatCount:0,
      role:d.role,orgType:demoOrgType,orgName:admin.orgName,region:admin.region||'示例地区',
      grade:d.role==='student'?['大一','大二','大三'][d.name.slice(-1)-1]||'大二':'',major:'示例专业',roleSetAt:createdAt
    };
    d.recs.forEach(([sid,total],ri)=>{users[d.name].records.push({scaleId:sid,total,date:createdAt+86400000*(18-ri*3)});});
    d.trains.forEach((t,ti)=>{users[d.name].trainings.push({type:t,date:createdAt+86400000*(15-ti*2)});});
    DB.saveUsers(users);
    syncRoster(users[d.name]);
    added++;
  }
  toast('✅ 演示数据就绪：新增 '+added+' 个、归属到本机构 '+rebound+' 个（用户名 demo-stu1~3 / demo-user1，密码 demo123456，可在登录页直接登录体验）');
  renderMgOverview();
}
/* ═══════════════ 心理知识科普（v2.2 学生/普通用户首页） ═══════════════ */
const KNOW_CARDS=[
 {t:'焦虑不全是坏事',sum:'适度焦虑是身体的警报器',body:'考前紧张、面试心跳加速，都是身体在准备“战斗”。把焦虑当信号而非敌人：写下来、拆小目标、做几次深呼吸，警报就会降级。'},
 {t:'情绪没有对错',sum:'难过、愤怒都是真实信号',body:'情绪不是“矫情”，是身体在告诉你需求：难过需要被安慰、愤怒说明边界被触碰。先命名情绪（“我在焦虑”），命名本身就能降噪。'},
 {t:'失眠的 3-3-3 法则',sum:'睡不着别硬躺',body:'躺下 30 分钟睡不着就起来，做点无聊的事，困了再回床；白天固定起床时间；睡前 1 小时远离屏幕。失眠怕的不是醒着，是“怕失眠”的焦虑。'},
 {t:'拖延不是懒',sum:'是任务太模糊或怕做不好',body:'把“写论文”拆成“打开文档写 100 字”，用 5 分钟启动法骗过大脑。完成比完美重要——烂初稿好过没初稿。'},
 {t:'什么时候该求助',sum:'求助是勇气，不是软弱',body:'当情绪低落持续 2 周以上、影响睡眠饮食、或出现伤害自己的想法时，请立即联系学校心理咨询中心或拨打 12356。你的感受值得被认真对待。'}
];
function renderKnowledge(){
  const grid=$('know-grid');if(!grid)return;
  grid.innerHTML=KNOW_CARDS.map((c,i)=>`<div class="know-card" onclick="this.classList.toggle('open')"><h4>${i+1}. ${c.t}</h4><div class="k-sum">${c.sum}</div><div class="k-body">${c.body}</div></div>`).join('');
}
/* ═══════════════ 演示账号与角色演示入口（v2.2） ═══════════════ */
async function ensureDemoAccounts(){
  const users=DB.users;
  const mk=async(name,nick,role,extra)=>{
    if(users[name])return;
    const createdAt=Date.now()-86400000*30;
    users[name]=Object.assign({username:name,nickname:nick,password:await sha256('demo123456'),createdAt,records:[],trainings:[],chatCount:0,role,roleSetAt:createdAt},extra);
    DB.saveUsers(users);
    syncRoster(users[name]);
  };
  await mk('demo-stu1','小雨同学','student',{orgType:'school',orgName:'示范大学',region:'北京市海淀区',grade:'大二',major:'心理学'});
  await mk('demo-user1','林间用户','normal',{orgType:'',orgName:'',region:''});
  await mk('demo-admin1','张老师','school_admin',{orgType:'school',orgName:'示范大学',region:'北京市海淀区',title:'心理老师'});
  await mk('demo-parent1','李妈妈','parent',{childUsername:'demo-stu1',region:'北京市海淀区'});
  await mk('demo-com1','王主任','community_admin',{orgType:'community',orgName:'阳光社区',region:'上海市徐汇区',title:'社区工作者'});
  /* v3.0:演示账号同步默认风格(幂等:只补缺,不覆盖用户已选主题) */
  let demoCh=false;
  DEMO_ACCOUNT_NAMES.forEach(n=>{const du=users[n];if(!du)return;if(!du.isDemo){du.isDemo=true;demoCh=true;}if(!du.theme){du.theme=DEFAULT_THEME;demoCh=true;}});
  if(demoCh)DB.saveUsers(users);
  const stu=users['demo-stu1'];
  if(stu&&!(stu.records||[]).length){
    stu.records.push({scaleId:'phq9',total:6,date:Date.now()-86400000*12,answers:[0,0,0,0,1,0,0,0,0]});
    stu.records.push({scaleId:'gad7',total:8,date:Date.now()-86400000*4,answers:[1,1,0,1,1,0,0]});
    stu.records.push({scaleId:'phq9',total:5,date:Date.now()-86400000*1,answers:[0,0,0,0,1,0,0,0,0]});
    stu.trainings.push({type:'情绪日记',date:Date.now()-86400000*2});
    stu.trainings.push({type:'4-7-8呼吸',date:Date.now()-86400000*1});
    DB.saveUsers(users);
    syncRoster(stu);
  }
}
function renderDemoAccounts(){
  const box=$('demo-accounts');if(!box)return;
  const defs=[['demo-stu1','学生','小雨同学'],['demo-user1','普通用户','林间用户'],['demo-admin1','学校管理人员','张老师'],['demo-parent1','家长','李妈妈（绑定小雨）'],['demo-com1','社区管理人员','王主任']];
  box.innerHTML=defs.map(([n,r,d])=>`<button class="da-btn" onclick="doLoginAs('${n}')"><b>${r}</b><span>${d} · ${n}</span></button>`).join('');
}
async function doLoginAs(name){
  const users=DB.users;
  const u=users[name];
  if(!u){toast('演示账号不存在，请刷新页面');return;}
  if(u.password!==await sha256('demo123456')){toast('该用户名已被真实账号占用，无法作为演示账号登录（请注册其他用户名）');return;}
  DB.setSession({username:name,loginAt:Date.now()});
  toast('已登录演示账号：'+u.nickname+'（'+getRoleName(u.role)+'）');
  afterLogin();
}
function openPrivacyModal(){
  openModal(`<h3>🔒 隐私与数据口径</h3><p>本模块展示的是<b>脱敏后的聚合数据</b>：整体状态分布、量表平均分、年级趋势与重点关注方向。</p><p>学校/社区管理人员<b>无法查看</b>学生与居民的私人聊天内容、树洞倾诉内容，保护个人隐私。</p><p>人员列表仅展示测评与训练相关状态，用于识别需要专业支持的个体，不包含任何私人表达内容。</p><div class="modal-foot"><button class="btn btn-teal" onclick="closeModal()">知道了</button></div>`);
}
function childNickOf(uname){
  const users=DB.users;
  if(users[uname])return users[uname].nickname;
  const r=getRoster();
  return r[uname]?r[uname].nickname:uname;
}
/* ═══════════════ 转介建议（学校管理人员，v2.2） ═══════════════ */
function openReferral(username){
  const roster=getRoster();const p=roster[username];if(!p)return;
  const l=latestRecord(p);
  const s=l?SCALES.find(x=>x.id===l.scaleId):null;
  const risk=l&&(l.cls==='moderate'||l.cls==='severe');
  const text=risk
    ?'建议尽快转介学校心理咨询中心做专业评估。参考流程：① 由辅导员/心理老师联系学生本人，说明转介原因；② 预约学校心理咨询中心，或拨打全国心理援助热线 12356；③ 转介后 1-2 周内跟进一次。'
    :'该同学当前状态平稳，暂无需紧急转介。建议：① 保持每月一次测评追踪；② 如出现状态变化，及时联系心理中心。';
  openModal(`<h3>🧭 转介建议 · ${esc(p.nickname)}</h3>
    <p>最近测评：${l?(esc(s?s.name:'')+' '+l.total+'/'+(s?s.max:'—')+' · '+esc(l.level)):'未测评'}${p.referred?'<span class="ref-status done">已转介</span>':''}</p>
    <div class="scale-info" style="white-space:pre-wrap;">${esc(text)}</div>
    <div class="modal-foot">
      <button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">关闭</button>
      <button class="btn btn-teal" onclick="markReferred('${esc(p.username)}')">标记已转介</button>
    </div>`);
}
function markReferred(username){
  const roster=getRoster();
  if(!roster[username]){toast('未找到该用户');return;}
  roster[username].referred=true;roster[username].referredAt=Date.now();
  saveRoster(roster);
  const us=DB.users;if(us[username]){us[username].referred=true;us[username].referredAt=Date.now();DB.saveUsers(us);}
  closeModal();
  toast('✅ 已标记转介，建议按流程跟进');
  renderMgOverview();
}
/* ═══════════════ 家长端（v2.2，按介绍书家庭端） ═══════════════ */
function requireParent(){const u=DB.currentUser();return u&&u.role==='parent';}
function boundChild(){
  const u=DB.currentUser();if(!u||!u.childUsername)return null;
  const roster=getRoster();return roster[u.childUsername]||null;
}
function renderChild(){
  if(!requireParent()){toast('该页面仅家长角色可用');go('home');return;}
  const view=$('child-view');if(!view)return;
  const u=DB.currentUser();
  const child=boundChild();
  $('child-sub').innerHTML=child?`已绑定孩子：<b>${esc(child.nickname)}</b>（@${esc(child.username)}）· 数据为测评与训练记录，聊天与树洞内容对家长不可见`:'尚未绑定孩子账号';
  if(!child){
    view.innerHTML=`<div class="empty">还没有绑定孩子。<br><br><button class="btn btn-teal" onclick="openBindChild()">去绑定孩子</button></div>`;
    return;
  }
  let childPet=null;try{childPet=JSON.parse(localStorage.getItem('xinyu-primaryPet-'+child.username)||'null');}catch(e){}
  const recs=(child.records||[]).slice().sort((a,b)=>b.date-a.date);
  const latest={};
  recs.forEach(r=>{if(!latest[r.scaleId]||r.date>latest[r.scaleId].date)latest[r.scaleId]=r;});
  const scaleCards=SCALES.filter(s=>latest[s.id]).map(s=>{const r=latest[s.id];const col=r.cls==='mild'?'var(--teal)':r.cls==='moderate'?'#b45309':'var(--danger)';return `<div class="mg-scale-card"><div class="sc-head"><span>${esc(s.name)}</span><span class="sc-time">${fmtDay(r.date)}</span></div><div class="sc-score" style="color:${col};">${r.total}<span style="font-size:13px;color:var(--muted);">/${s.max}</span></div><div style="font-size:12.5px;color:var(--muted);">${esc(r.level)}</div></div>`;}).join('');
  const latestLv=recs[0]||null;
  const latestScale=latestLv?(SCALES.find(s=>s.id===latestLv.scaleId)||{}).name:'';
  const statusHtml=latestLv?`<div class="child-card"><div class="cc-ava">${child.avatar?`<img src="${esc(child.avatar)}">`:esc((child.nickname||'?')[0])}</div><div class="cc-info"><b>${esc(child.nickname)}</b><br><span>${esc(child.orgName||'未填写学校')}${child.grade?' · '+esc(child.grade):''} · 最近测评 ${fmtDay(latestLv.date)}</span></div><div class="cc-status"><div class="h-score ${latestLv.cls==='mild'?'good':latestLv.cls==='moderate'?'mid':'bad'}">${esc(latestLv.level)}</div><span style="font-size:11.5px;color:var(--muted);">${esc(latestScale)}</span></div></div>`:'';
  const phq=recs.filter(r=>r.scaleId==='phq9');
  let trend='';
  if(phq.length>=2){
    const W=460,H=180,pad=30;
    const vals=phq.map(r=>r.total);
    const maxV=Math.max(27,...vals),minV=Math.min(...vals);
    const x=i=>pad+(W-2*pad)*(phq.length===1?0.5:i/(phq.length-1));
    const y=v=>H-pad-((v-minV)/(maxV-minV||1))*(H-2*pad);
    const pts=vals.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
    const dots=vals.map((v,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="${v>=15?'#dc2626':v>=10?'#d97706':'#0e7490'}"/>`).join('');
    trend=`<div class="panel" style="margin:0 0 14px;"><div class="panel-title">📈 情绪趋势（PHQ-9 抑郁自评分数）</div><div class="chart-box"><svg class="svg-chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;">
      <line x1="${pad}" y1="${y(15)}" x2="${W-pad}" y2="${y(15)}" stroke="#fca5a5" stroke-dasharray="4 4"/><text x="${W-pad}" y="${y(15)-6}" font-size="11" fill="#dc2626">转介线 15</text>
      <polyline points="${pts}" fill="none" stroke="#0e7490" stroke-width="2"/>${dots}
      ${vals.map((v,i)=>`<text x="${x(i)}" y="${y(v)-10}" text-anchor="middle" font-size="11" fill="#475569">${v}</text>`).join('')}
      ${vals.map((v,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="#94a3b8">${fmtDay(phq[i].date).slice(5)}</text>`).join('')}
    </svg></div><p style="font-size:12px;color:var(--muted);text-align:center;">分数越高表示困扰越明显；超过红线建议联系专业帮助。数据来自孩子本人测评，仅用于了解变化趋势。</p></div>`;
  }
  const history=recs.slice(0,15).map(r=>{const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';return `<div class="history-item"><span>${esc(s.name)} · ${fmtDay(r.date)}</span><span class="h-score ${r.cls==='mild'?'good':r.cls==='moderate'?'mid':'bad'}">${r.total}/${s.max} · ${esc(r.level)}</span></div>`;}).join('');
  /* v4：长建议（详细、有说服力、不说教） */
  const lv=latestLv?(latestLv.cls==='severe'?'需要重点关注':latestLv.cls==='moderate'?'需要多些关注':'整体平稳'):'暂无测评数据';
  const advice=`<div class="suggest-long">
    <b>💌 给家长的建议 · 关于 ${esc(child.nickname)} 的近期状态</b><br><br>
    最近孩子的整体状态属于「${lv}」。这个判断来自孩子自己完成的标准化测评（如 PHQ-9/GAD-7），它反映的是孩子最近两周的真实感受，而不是“标签”或“评价”。
    ${latestLv&&(latestLv.cls==='moderate'||latestLv.cls==='severe')?'<br><br>当孩子处于这样的状态时，他（她）最需要的往往不是建议和道理，而是“被看见”的感觉。你可以试着这样做：<br>① <b>每天留出 15 分钟只属于你们的时间</b>——不聊学习、不聊成绩，只是散步、做饭或安静地待在一起；<br>② <b>用“我注意到…”代替“你怎么又…”</b>，比如“我注意到你这周睡得有点晚，是不是最近压力比较大？”；<br>③ <b>先别急着解决问题</b>，孩子说出来的时候，先回应感受（“听起来真的很难熬”），再问“需要我帮你做点什么吗”；<br>④ 如果这样的状态持续超过两周，或孩子提到任何伤害自己的想法，请<b>一定不要独自承担</b>——及时联系学校心理老师，或拨打 12356 心理援助热线。':'<br><br>虽然目前整体平稳，但平稳的状态也需要用心维护：<br>① 每周至少安排一次全家一起的活动，让家成为可以放松的地方；<br>② 多留意孩子愿意主动分享的时刻，那是信任的信号；<br>③ 如果某天孩子突然沉默、情绪明显变化，多问一句“今天怎么样”，可能比任何道理都重要。'}
    <br><br>请记得：孩子愿意在平台完成测评，本身就是对你们关系的信任。你的耐心与陪伴，是任何技术都无法替代的。
  </div>`;
  /* v4：家庭照片墙（上传孩子最近的照片/情绪记录） */
  const photos=getFamilyPhotos();
  const famPhotoItems=photos.map((p,i)=>`<img class="fam-photo" src="${p.data}" alt="家庭照片" onclick="viewFamilyPhoto(${i})">`).join('');
  const photoHtml=`<div class="panel" style="margin:0 0 14px;"><div class="panel-title">📸 家的相册（${photos.length}）</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:8px;">上传孩子最近的照片、画作或一起的回忆，让这里成为你们的家庭时光机（仅保存在本浏览器）。</p>
    <div class="fam-photos">${famPhotoItems}<label class="fam-photo-add" for="fam-photo-file">＋<br>上传照片</label></div>
    <input type="file" id="fam-photo-file" accept="image/*" style="display:none;" onchange="uploadFamilyPhoto(this)">
  </div>`;
  const petSummary=childPet?`<div class="panel parent-pet-summary" style="margin:0 0 14px;"><div class="panel-title">🐾 小伙伴的温馨小卡片</div><div class="pet-summary-grid"><span>🍪 本月饱腹度 <b>${Math.min(100,childPet.hunger||0)}%</b></span><span>✨ 完成测评 <b>${childPet.interactions||0}</b> 次</span><span>💬 轻松互动 <b>${(childPet.questions||[]).length}</b> 次</span><span>🎁 已解锁零食 <b>${(childPet.snacks||[]).length}</b> 款</span></div><p>这些是轻松的陪伴记录，不包含孩子的私密回答内容。</p></div>`:'';
  view.innerHTML=statusHtml+petSummary+advice+photoHtml+trend+`<div class="panel" style="margin:0 0 14px;"><div class="panel-title">🧠 最近一次各量表结果</div>${scaleCards?`<div class="mg-scale-cards">${scaleCards}</div>`:'<div class="empty">孩子还没有测评记录</div>'}</div>
  <div class="panel" style="margin:0;"><div class="panel-title">📋 最近测评记录</div>${history||'<div class="empty">暂无记录</div>'}</div>
  <div class="assist-box">
    <b>🤖 AI 亲子沟通助手</b>
    <p style="font-size:12.5px;color:var(--muted);margin-top:4px;">不知道怎么开口？输入你的困惑，心屿会给出沟通方式、表达建议与注意事项。例如：“孩子不愿意讲话怎么办？”</p>
    <div class="ab-row"><input id="pa-input" placeholder="例如：孩子最近总是顶嘴，我该怎么办？"><button class="btn btn-teal" onclick="askParenting()">问心屿</button></div>
    <div class="ab-row" style="gap:6px;margin-top:6px;"><button class="suggest" onclick="quickParentAsk('孩子不愿意讲话怎么办')">孩子不愿意讲话</button><button class="suggest" onclick="quickParentAsk('孩子考试没考好怎么沟通')">考试没考好</button><button class="suggest" onclick="quickParentAsk('孩子天天玩手机怎么办')">沉迷手机</button></div>
    <div class="assist-reply" id="pa-reply" style="display:none;"></div>
  </div>
  <p style="font-size:12px;color:var(--muted);margin-top:10px;">🔒 隐私说明：家长仅可查看绑定孩子（经同意）的测评与训练数据，无法查看孩子的树洞内容与 AI 聊天记录。</p>`;
}
function quickParentAsk(q){$('pa-input').value=q;askParenting();}
function getFamilyPhotos(){return DB.getData('familyPhotos',[]);}
function saveFamilyPhotos(v){DB.setData('familyPhotos',v);}
function uploadFamilyPhoto(input){
  const f=input.files&&input.files[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const max=320;
      let w=img.width,h=img.height;
      const scale=Math.min(1,max/Math.max(w,h));
      w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      const data=c.toDataURL('image/jpeg',0.8);
      const photos=getFamilyPhotos();
      if(photos.length>=9){toast('相册最多 9 张，可先删除旧照片');return;}
      photos.push({data,note:'孩子的回忆',ts:Date.now()});
      saveFamilyPhotos(photos);
      renderChild();
      toast('📸 已上传到家的相册');
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(f);
}
function delFamilyPhoto(i){
  const photos=getFamilyPhotos();
  photos.splice(i,1);
  saveFamilyPhotos(photos);
  closeModal();renderChild();
  toast('已删除这张照片');
}
function viewFamilyPhoto(i){
  const photos=getFamilyPhotos();
  const p=photos[i];if(!p)return;
  openModal(`<h3>📸 家庭回忆</h3><img src="${p.data}" style="width:100%;border-radius:14px;"><p style="font-size:12px;color:var(--muted);margin-top:8px;">${esc(p.note||'')} · ${fmtDay(p.ts)}</p><div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">关闭</button><button class="btn" style="background:var(--danger-bg);color:var(--danger);" onclick="delFamilyPhoto(${i})">删除</button></div>`);
}
function openBindChild(){
  const u=DB.currentUser();if(!u)return;
  openModal(`<h3>👨‍👩‍👧 绑定孩子</h3>
    <div class="scale-info">🔗 <b>方式一：邀请码绑定（推荐）</b>——让孩子在自己的「个人中心/首页」查看家庭邀请码，输入后即可绑定。</div>
    <div class="field"><label>孩子的家庭邀请码（6 位）</label><input id="bind-code" placeholder="例如：A7K2Q9" style="letter-spacing:4px;text-transform:uppercase;"></div>
    <button class="btn btn-teal" style="width:100%;" onclick="bindByFamilyCode()">通过邀请码绑定</button>
    <div class="section-deco">或者</div>
    <div class="scale-info">👤 <b>方式二：用户名绑定</b>——输入孩子的账号用户名（需孩子已注册）。</div>
    <div class="field"><label>孩子用户名</label><input id="bind-child" placeholder="输入孩子的账号用户名"></div>
    <div class="field"><label>或从演示账号选择</label><select id="bind-quick" onchange="if(this.value){document.querySelector('#bind-child').value=this.value;}"><option value="">— 选择 —</option><option value="demo-stu1">demo-stu1 小雨同学（学生）</option><option value="demo-user1">demo-user1 林间用户（普通用户）</option></select></div>
    <p style="font-size:12px;color:var(--muted);">绑定后：家长可查看孩子的测评与训练数据；孩子的聊天与树洞内容对家长不可见。</p>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button><button class="btn btn-teal" onclick="saveBindChild()">用户名绑定</button></div>`);
}
function saveBindChild(){
  const u=DB.currentUser();if(!u)return;
  const name=($('bind-child')?$('bind-child').value:'').trim();
  if(!name){toast('请输入孩子用户名，或使用上方的邀请码绑定');return;}
  const c=DB.users[name];
  if(!c){toast('未找到该用户名，请确认孩子已注册');return;}
  if(c.role!=='student'&&c.role!=='normal'){toast('该账号不是学生/普通用户，无法绑定');return;}
  if(name===u.username){toast('不能绑定自己');return;}
  u.childUsername=name;
  c.boundParent=u.username;
  DB.saveUser(u);DB.saveUsers(DB.users);
  syncRoster(u);syncRoster(c);
  closeModal();renderProfile();renderChild();renderHome();
  toast('✅ 已绑定孩子：'+c.nickname);
}
function unbindChild(){
  const u=DB.currentUser();if(!u)return;
  u.childUsername='';DB.saveUser(u);syncRoster(u);
  toast('已解绑孩子账号');
  renderProfile();renderChild();renderHome();
}
const EDU_CARDS=[
 {t:'先倾听，再建议',sum:'孩子倾诉时，先听完，别急着给方案',body:'当孩子说“我压力好大”，先别回答“这有什么好压力的”。先复述感受：“听起来最近真的很难熬。” 被听见，比被解决更重要。'},
 {t:'「我信息」表达法',sum:'用“我感到…”代替“你总是…”',body:'指责会让孩子关闭心门。换成：“看到你最近很晚睡，我有点担心你的身体。” 描述事实+表达感受，而不是贴标签。'},
 {t:'情绪温度计',sum:'每天问一句“今天的心情几度？”',body:'把情绪量化成 1-10 度，孩子更容易开口。家长先分享自己的：“我今天 6 度，工作有点累。” 示范比要求更有用。'},
 {t:'非暴力沟通四步',sum:'观察—感受—需要—请求',body:'①我看到你最近很少和我们吃饭（观察）②我有点失落（感受）③我希望多了解你的近况（需要）④周末一起吃饭好吗（请求）。'},
 {t:'给空间，也给边界',sum:'尊重隐私，但危险信号要干预',body:'青春期的孩子需要私人空间，但若出现：持续情绪低落、失眠、自伤言论、成绩骤降，请及时联系学校心理中心或拨打 12356。'},
 {t:'危机信号识别',sum:'这些信号需要立刻行动',body:'频繁提到“没意思”“不想活”、整理物品送人、突然平静、自我伤害痕迹——不要犹豫，立即求助：学校心理中心 / 12356 / 就近精神卫生机构。'}
];
function renderEdu(){
  if(!requireParent()){toast('该页面仅家长角色可用');go('home');return;}
  const grid=$('edu-grid');if(!grid)return;
  grid.innerHTML=EDU_CARDS.map((c,i)=>`<div class="edu-card" onclick="openEduDetail(${i})"><h4>${i+1}. ${c.t}</h4><div class="k-sum">${c.sum}</div><div class="k-body">${c.body}</div></div>`).join('');
  renderParentChat();
}
function openEduDetail(i){
  const c=EDU_CARDS[i];if(!c)return;
  const related=EDU_CARDS.filter((x,j)=>j!==i&&x.t!==c.t).slice(0,2);
  openModal(`<div style="max-width:640px;">
    <h3 style="font-size:19px;">${i+1}. ${c.t}</h3>
    <div class="scale-info">${c.sum}</div>
    <div style="font-size:14.5px;line-height:2;color:#374151;">${c.body}</div>
    <div class="section-deco">可以这样开始</div>
    <div class="advice-box" style="margin-top:6px;"><div class="ab-title">💡 三步实践</div>
      · 今天先做其中一条，不必全部做到；<br>
      · 把感受说给孩子听，而不是评价给孩子听；<br>
      · 每周回顾一次：这周我们有没有一次“好好说话”的时刻？</div>
    <div class="section-deco">相关课程</div>
    ${related.map(r=>`<div class="edu-card" style="margin-bottom:8px;cursor:pointer;" onclick="closeModal();openEduDetail(${EDU_CARDS.indexOf(r)})"><h4>${EDU_CARDS.indexOf(r)+1}. ${r.t}</h4><div class="k-sum">${r.sum}</div></div>`).join('')}
    <div class="ai-notice" style="margin-top:12px;">📌 沟通方法参考自心理健康教育通用框架；如孩子出现持续情绪低落等信号，请及时联系学校心理中心或拨打 12356。</div>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">关闭</button><button class="btn btn-teal" onclick="closeModal();askEduAssistant('${esc(c.t)}')">问心屿：具体怎么做</button></div>
  </div>`);
}
function askEduAssistant(q){openModal(`<h3>🤖 AI 亲子沟通助手</h3><p class="sub">关于「${esc(q)}」的沟通方式、表达建议与注意事项：</p><div id="pa-in-modal"></div><div class="modal-foot"><button class="btn btn-teal" onclick="closeModal()">知道了</button></div>`);const r=parentingReply(q);$('pa-in-modal').innerHTML=r.sections.map(s=>{const m=s.match(/^(.+?)：/);const head=m?m[1]:'';const body=head?s.slice(head.length+1):s;return `<div class="ar-sec"><b>${esc(head)}</b><br>${esc(body)}</div>`;}).join('');}
const FAMILY_ACTIONS=[
 {ico:'🍽️',t:'一起做一顿饭或点一次外卖分享',tip:'边吃边聊，不谈学习，只聊近况'},
 {ico:'☀️',t:'早餐时互相说一件今天期待的事',tip:'让家从积极的期待开始'},
 {ico:'📵',t:'晚餐后 30 分钟全家放下手机',tip:'屏幕之外，才是真实对话发生的地方'},
 {ico:'💬',t:'睡前互道一句“今天辛苦啦”',tip:'一句看见，胜过千言万语'},
 {ico:'🌳',t:'周末一起散步或户外 30 分钟',tip:'并肩走路比面对面更易开口'},
 {ico:'🏆',t:'发现孩子的一个进步并当面表扬',tip:'表扬具体行为，而不是泛泛而谈'}
];
function getFamilyLog(){return DB.getData('family',[]);}
function saveFamilyLog(v){DB.setData('family',v);}
function renderFamily(){
  if(!requireParent()){toast('该页面仅家长角色可用');go('home');return;}
  const logs=getFamilyLog();
  const view=$('family-view');if(!view)return;
  const doneMap={};logs.forEach(l=>{doneMap[l.idx]=fmtDay(l.date);});
  const today=fmtDay(Date.now());
  view.innerHTML=`<div class="mg-metrics" style="grid-template-columns:repeat(3,1fr);">
    <div class="mg-metric"><div class="m-num">${logs.length}</div><div class="m-label">累计打卡</div></div>
    <div class="mg-metric"><div class="m-num">${Object.values(doneMap).filter(d=>d===today).length}</div><div class="m-label">今日打卡</div></div>
    <div class="mg-metric"><div class="m-num">${FAMILY_ACTIONS.length+getFamilyCustom().length}</div><div class="m-label">行动清单</div></div>
  </div>
  <div class="panel-title">今日行动清单（${FAMILY_ACTIONS.length+getFamilyCustom().length}）</div>
  ${[...FAMILY_ACTIONS.map((a,i)=>({...a,idx:i})),...getFamilyCustom().map((a,i)=>({...a,idx:'c'+i}))].map(a=>{const di=doneMap[a.idx];return `<div class="fam-item ${di?'done':''}"><span class="fi-ico">${a.ico}</span><div><b>${a.t}</b><br><span style="font-size:12px;color:var(--muted);">${a.tip}</span></div><button class="fi-act" onclick="toggleFamily('${a.idx}')">${di?(di===today?'✅ 今日已完成':'已打卡'):'打卡'}</button>${typeof a.idx==='string'?`<button class="v-del" title="删除这个行动" onclick="delFamilyCustom('${a.idx}')">✕</button>`:''}</div>`;}).join('')}
  <div class="api-form" style="background:#fff;margin-top:10px;">
    <div class="api-row"><input id="fam-new" placeholder="添加一个属于你们家的互动行动，例如：一起拼一次乐高"><button class="btn btn-teal" style="padding:9px 18px;font-size:13px;" onclick="addFamilyCustom()">＋ 添加</button></div>
  </div>
  <div class="panel-title" style="margin-top:16px;">🕐 打卡记录</div>
  ${logs.slice().reverse().slice(0,10).map(l=>{const act=[...FAMILY_ACTIONS.map((a,i)=>({...a,idx:i})),...getFamilyCustom().map((a,i)=>({...a,idx:'c'+i}))].find(x=>String(x.idx)===String(l.idx));return `<div class="history-item"><span>${act?act.ico+' '+act.t:'—'}</span><span style="font-size:11.5px;color:#94a3b8;">${fmtDay(l.date)}</span></div>`;}).join('')||'<div class="empty">还没有打卡，从今天的小行动开始吧</div>'}
  <p style="font-size:12px;color:var(--muted);margin-top:10px;">💡 演示说明：打卡为家长侧记录；正式版将支持孩子侧确认与反馈，形成双向互动。</p>`;
}
function getFamilyCustom(){return DB.getData('familyCustom',[]);}
function saveFamilyCustom(v){DB.setData('familyCustom',v);}
function addFamilyCustom(){
  const t=$('fam-new').value.trim();
  if(!t){toast('写一个行动再添加吧');return;}
  const v=getFamilyCustom();
  v.push({ico:'💛',t,tip:'你们家专属的互动时刻'});
  saveFamilyCustom(v);
  $('fam-new').value='';
  renderFamily();
  toast('✅ 已添加家庭行动');
}
function delFamilyCustom(idx){
  const v=getFamilyCustom();
  v.splice(parseInt(idx.slice(1),10),1);
  saveFamilyCustom(v);
  const logs=getFamilyLog().filter(l=>String(l.idx)!==String(idx));
  saveFamilyLog(logs);
  renderFamily();
  toast('已删除该行动');
}
function toggleFamily(idx){
  const logs=getFamilyLog();
  const li=logs.findIndex(l=>String(l.idx)===String(idx)&&fmtDay(l.date)===fmtDay(Date.now()));
  if(li>=0){logs.splice(li,1);toast('已取消今日打卡');}
  else{logs.push({idx,date:Date.now()});toast('✅ 打卡成功，坚持就是最好的陪伴');}
  saveFamilyLog(logs);renderFamily();
  refreshHomeIfActive();
}
/* ═══════════════ 社区资源连接与转介记录（v2.2） ═══════════════ */
const DEFAULT_RESOURCES=[
 {type:'心理老师',name:'示范中学 刘老师',contact:'校内心理咨询室 · 每周一三五下午',scope:'青少年心理辅导'},
 {type:'心理老师',name:'阳光小学 陈老师',contact:'校内 · 需提前预约',scope:'儿童情绪与行为问题'},
 {type:'专业机构',name:'安心心理咨询中心',contact:'0571-8xxx-xxxx（示例）',scope:'青少年/成人心理咨询'},
 {type:'专业机构',name:'心晴心理工作室',contact:'线上预约 · 视频咨询',scope:'焦虑、抑郁、家庭关系'},
 {type:'公益服务',name:'12356 心理援助热线',contact:'24 小时免费',scope:'全国心理危机干预'},
 {type:'公益服务',name:'社区心灵驿站',contact:'每周六 9:00-12:00 · 社区活动中心',scope:'免费心理科普与一对一倾听'}
];
function getResources(){return DB.getData('resources',[]);}
function saveResources(r){DB.setData('resources',r);}
let refResIdx=0;
function renderResources(){
  const u=DB.currentUser();if(!u||u.role!=='community_admin'){toast('该页面仅社区管理人员可用');go('home');return;}
  const list=getResources();
  const view=$('res-view');if(!view)return;
  const all=[...DEFAULT_RESOURCES,...list];
  view.innerHTML=`<div class="panel" style="margin:0 0 14px;background:#f0fdfa;border-color:#99f6e4;">
    <div class="panel-title">💡 资源下沉</div>
    <p style="font-size:13px;color:var(--muted);">把心理老师、专业机构与公益服务连接到基层：找到合适资源后，可从「区域概览」人员详情或下方资源卡发起转介，转介记录可在「转介记录」页跟进。</p>
  </div>
  <div class="panel" style="margin:0 0 14px;">
    <div class="panel-title">📇 资源目录（${all.length}）</div>
    <div class="res-grid">${all.map((r,i)=>`<div class="res-card"><span class="r-type">${esc(r.type)}</span><h4>${esc(r.name)}</h4><p>${esc(r.contact)}<br>${esc(r.scope)}</p><div class="r-actions"><button onclick="referToResource(${i})">📤 从此资源发起转介</button>${i>=DEFAULT_RESOURCES.length?`<button onclick="deleteResource(${i})">删除</button>`:''}</div></div>`).join('')}</div>
  </div>
  <div class="panel" style="margin:0;">
    <div class="panel-title">➕ 登记新资源</div>
    <div class="api-form" style="background:#fff;">
      <div class="api-row"><select id="res-type"><option value="心理老师">心理老师</option><option value="专业机构">专业机构</option><option value="公益服务">公益服务</option></select><input id="res-name" placeholder="名称，如：XX 心理咨询中心"><input id="res-contact" placeholder="联系方式/地址"></div>
      <div class="api-row"><input id="res-scope" placeholder="服务范围，如：青少年心理咨询"><button class="btn btn-teal" style="padding:9px 18px;font-size:13.5px;" onclick="addResource()">保存</button></div>
    </div>
  </div>`;
}
function addResource(){
  const name=$('res-name').value.trim(),contact=$('res-contact').value.trim(),scope=$('res-scope').value.trim();
  if(!name||!contact){toast('请至少填写名称与联系方式');return;}
  const list=getResources();
  list.push({type:$('res-type').value,name,contact,scope});
  saveResources(list);
  ['res-name','res-contact','res-scope'].forEach(id=>$(id).value='');
  toast('✅ 资源已登记');
  renderResources();
}
function deleteResource(i){const list=getResources();const idx=i-DEFAULT_RESOURCES.length;if(idx<0||idx>=list.length)return;list.splice(idx,1);saveResources(list);renderResources();toast('已删除该资源');}
function referToResource(idx){
  const u=DB.currentUser();if(!u)return;
  const list=getResources();
  const all=[...DEFAULT_RESOURCES,...list];
  const r=all[idx];if(!r)return;
  const persons=managePersons();
  if(!persons.length){toast('当前区域还没有可转介的人员数据');return;}
  refResIdx=idx;
  const opts=persons.map(p=>{const l=latestRecord(p);return {u:p.username,n:p.nickname,o:p.orgName||'未填归属',s:l?l.level:'未测评'};});
  openModal(`<h3>📤 发起转介</h3>
    <p>资源：<b>${esc(r.name)}</b>（${esc(r.type)}）</p>
    <div class="field"><label>转介对象（含最近状态）</label><select id="ref-person">${opts.map(o=>`<option value="${esc(o.u)}">${esc(o.n)}（${esc(o.o)} · 最近：${esc(o.s)}）</option>`).join('')}</select></div>
    <p style="font-size:12px;color:var(--muted);">转介前请确认该人员最近状态，必要时先联系本人或其监护人。</p>
    <div class="field"><label>转介说明（选填）</label><input id="ref-note" placeholder="如：最近一次测评中度，建议专业评估"></div>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button><button class="btn btn-teal" onclick="saveReferral()">确认转介</button></div>`);
}
function saveReferral(){
  const u=DB.currentUser();if(!u)return;
  const uname=$('ref-person').value;
  const roster=getRoster();const p=roster[uname];
  if(!p){toast('未找到该人员');return;}
  const list=getResources();
  const all=[...DEFAULT_RESOURCES,...list];
  const r=all[refResIdx]||all[0];
  const refs=getReferrals();
  refs.unshift({person:uname,nickname:p.nickname,resource:r?r.name:'—',rtype:r?r.type:'—',note:$('ref-note')?$('ref-note').value.trim():'',date:Date.now(),status:'pending'});
  saveReferrals(refs);
  roster[uname].referred=true;roster[uname].referredAt=Date.now();
  saveRoster(roster);
  const us=DB.users;if(us[uname]){us[uname].referred=true;us[uname].referredAt=Date.now();DB.saveUsers(us);}
  closeModal();toast('✅ 已发起转介，可在「转介记录」跟进');
}
function getReferrals(){return DB.getData('referrals',[]);}
function saveReferrals(r){DB.setData('referrals',r);}
function renderReferrals(){
  const u=DB.currentUser();if(!u||u.role!=='community_admin'){toast('该页面仅社区管理人员可用');go('home');return;}
  const refs=getReferrals();
  const view=$('ref-view');if(!view)return;
  const statusMap={pending:['待跟进','pending'],contacted:['已联系','contacted'],done:['已完成','done']};
  view.innerHTML=refs.length?refs.map((r,i)=>`<div class="ref-item"><div class="r-head"><span>${esc(r.nickname)} → ${esc(r.resource)}<span class="ref-status ${statusMap[r.status]?statusMap[r.status][1]:'pending'}">${statusMap[r.status]?statusMap[r.status][0]:'待跟进'}</span></span><span>${fmtDay(r.date)}</span></div><div>${esc(r.note||'无备注')}</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">${['pending','contacted','done'].map(s=>`<button class="back-btn" style="${r.status===s?'color:var(--teal);border-color:var(--teal);':''}" onclick="setRefStatus(${i},'${s}')">${statusMap[s][0]}</button>`).join('')}<button class="back-btn" style="color:var(--danger);border-color:#fecaca;" onclick="deleteReferral(${i})">删除</button></div></div>`).join('')
  :'<div class="empty">还没有转介记录。从「资源连接」或人员详情发起转介后，这里会形成跟进闭环。</div>';
}
function setRefStatus(i,s){const refs=getReferrals();if(refs[i]){refs[i].status=s;saveReferrals(refs);renderReferrals();toast('状态已更新');refreshHomeIfActive();}}
function deleteReferral(i){const refs=getReferrals();refs.splice(i,1);saveReferrals(refs);renderReferrals();toast('已删除');}
/* __PROFILE_PART__ */
/* ═══════════════ 个人中心 ═══════════════ */
function renderProfile(){
  const u=DB.currentUser();if(!u)return;
  const records=u.records||[],trainings=u.trainings||[];
  const isAIUser=(u.role==='student'||u.role==='normal'||!u.role);
  /* 侧边统计与测评历史区：按角色显示各自维度（v4.2） */
  const pfSub=$('pf-sub');
  if(pfSub)pfSub.textContent=isAIUser?'账号信息、测评历史与 AI 配置':(u.role==='parent'?'账号信息、绑定孩子与家庭数据':'账号信息与管辖数据概览');
  if(isAIUser){
    $('pf-count').textContent=records.length;
    $('pf-days').textContent=Math.max(1,Math.ceil((Date.now()-u.createdAt)/86400000));
    $('pf-count-label').textContent='测评次数';
    $('pf-days-label').textContent='使用天数';
  }else if(u.role==='parent'){
    $('pf-count').textContent=u.childUsername?1:0;
    $('pf-days').textContent=getFamilyLog().length;
    $('pf-count-label').textContent='绑定孩子';
    $('pf-days-label').textContent='累计打卡';
  }else{
    const persons=managePersons();
    $('pf-count').textContent=persons.length;
    $('pf-days').textContent=ledgerForAdmin(u).length;
    $('pf-count-label').textContent='覆盖人数';
    $('pf-days-label').textContent='台账事件';
  }
  const contactsBtn=$('pf-contacts-btn');
  if(contactsBtn)contactsBtn.style.display=isAIUser?'':'none';
  const histTitle=$('pf-history-title');
  const chartBox=$('trend-chart-box');
  if(histTitle)histTitle.style.display=isAIUser?'':'none';
  if(chartBox)chartBox.style.display=isAIUser?'':'none';
  if(!isAIUser){const hl=$('history-list');if(hl)hl.style.display='none';}
  $('pf-avatar').outerHTML='<div id="pf-avatar">'+avatarHTML(u,64,'avatar-lg')+'</div>';
  $('pf-name').textContent=u.nickname;
  $('pf-uid').textContent='@'+esc(u.username)+' · 注册于 '+fmtDay(u.createdAt);
  // 历史列表（仅学生/用户渲染）
  const list=$('history-list');
  if(!records.length){list.innerHTML='<div class="empty">还没有测评记录，去测评中心测一次吧</div>';}
  else{
    list.innerHTML='<div class="panel-title">全部测评记录</div>'+records.slice().reverse().map((r,i)=>{
      const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';
      const lv=getLevel(s,r.total);
      const cls=lv.cls==='mild'?'good':lv.cls==='moderate'?'mid':'bad';
      return `<div class="history-item"><span>${s.name} · ${fmtDay(r.date)}</span><span class="h-score ${cls}">${r.total}/${s.max} · ${lv.label}</span><button onclick="viewHistory(${records.length-1-i})">查看</button></div>`;
    }).join('');
  }
  // 趋势图（PHQ-9 分数折线）
  const phq=records.filter(r=>r.scaleId==='phq9');
  const box=$('trend-chart-box');
  if(phq.length>=2){
    const W=460,H=180,pad=30;
    const vals=phq.map(r=>r.total);
    const maxV=Math.max(27,...vals),minV=Math.min(...vals);
    const x=i=>pad+(W-2*pad)*(phq.length===1?0.5:i/(phq.length-1));
    const y=v=>H-pad-((v-minV)/(maxV-minV||1))*(H-2*pad);
    let pts=vals.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
    let dots=vals.map((v,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="${v>=15?'#dc2626':v>=10?'#d97706':'#0e7490'}"/>`).join('');
    box.innerHTML=`<svg class="svg-chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;">
      <line x1="${pad}" y1="${y(15)}" x2="${W-pad}" y2="${y(15)}" stroke="#fca5a5" stroke-dasharray="4 4"/>
      <text x="${W-pad}" y="${y(15)-6}" font-size="11" fill="#dc2626">转介线 15</text>
      <polyline points="${pts}" fill="none" stroke="#0e7490" stroke-width="2"/>
      ${dots}
      ${vals.map((v,i)=>`<text x="${x(i)}" y="${y(v)-10}" text-anchor="middle" font-size="11" fill="#475569">${v}</text>`).join('')}
      ${vals.map((v,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="#94a3b8">${fmtDay(phq[i].date).slice(5)}</text>`).join('')}
    </svg><p style="font-size:12px;color:var(--muted);text-align:center;">PHQ-9 抑郁自评分数趋势（超过红线建议寻求专业帮助）</p>`;
  }else{box.innerHTML='';}
  // 行为维度·使用轨迹（v4.2：按角色显示各自维度，不展示无关功能）
  const trail=$('pf-trail');
  if(trail){
    if(u.role==='student'||u.role==='normal'||!u.role){
      const days=Math.max(1,Math.ceil((Date.now()-u.createdAt)/86400000));
      const recs=(u.records||[]);
      const lastRec=recs.length?recs.slice().sort((a,b)=>b.date-a.date)[0]:null;
      const lastScale=lastRec?SCALES.find(s=>s.id===lastRec.scaleId):null;
      trail.innerHTML=`<div class="mg-metrics" style="grid-template-columns:repeat(2,1fr);margin-top:4px;">
        <div class="mg-metric"><div class="m-num">${days}</div><div class="m-label">使用天数</div></div>
        <div class="mg-metric"><div class="m-num">${recs.length}</div><div class="m-label">测评次数</div></div>
        <div class="mg-metric"><div class="m-num">${(u.trainings||[]).length}</div><div class="m-label">训练次数</div></div>
        <div class="mg-metric"><div class="m-num">${(u.postCount||0)+(u.replyCount||0)+(u.chatCount||0)}</div><div class="m-label">表达/互动次数</div></div>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:8px;">🧭 使用轨迹即「行为变化」维度的演示实现：频率与活跃度的变化是心理状态的重要信号。${lastRec&&lastScale?'上次测评（'+esc(lastScale.name)+'）：'+fmtDay(lastRec.date)+'，建议 2-4 周后复测追踪变化。':'完成首次测评后可在此追踪变化趋势。'}</p>`;
    }else if(u.role==='parent'){
      const child=boundChild();
      const logs=getFamilyLog();
      const today=fmtDay(Date.now());
      const todayCount=logs.filter(l=>fmtDay(l.date)===today).length;
      trail.innerHTML=`<div class="mg-metrics" style="grid-template-columns:repeat(2,1fr);margin-top:4px;">
        <div class="mg-metric"><div class="m-num">${child?(child.records||[]).length:'—'}</div><div class="m-label">孩子测评次数</div></div>
        <div class="mg-metric"><div class="m-num">${child?(child.trainings||[]).length:'—'}</div><div class="m-label">孩子训练次数</div></div>
        <div class="mg-metric"><div class="m-num">${logs.length}</div><div class="m-label">累计打卡</div></div>
        <div class="mg-metric"><div class="m-num">${todayCount}</div><div class="m-label">今日打卡</div></div>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:8px;">👨‍👩‍👧 家庭端概览：孩子的测评与训练数据经绑定后可见，聊天与树洞内容对家长不可见。${child?'当前绑定：'+esc(child.nickname)+'。':'尚未绑定孩子，可前往首页或「孩子心理变化」页用邀请码绑定。'}</p>`;
    }else{
      const persons=isAdminUser(u)?managePersons():[];
      const ledger=ledgerForAdmin(u);
      const risk=persons.filter(p=>{const l=latestRecord(p);return l&&(l.cls==='moderate'||l.cls==='severe');}).length;
      const refCount=u.role==='community_admin'?getReferrals().length:0;
      trail.innerHTML=`<div class="mg-metrics" style="grid-template-columns:repeat(2,1fr);margin-top:4px;">
        <div class="mg-metric"><div class="m-num">${persons.length}</div><div class="m-label">覆盖人数</div></div>
        <div class="mg-metric warn"><div class="m-num">${risk}</div><div class="m-label">需关注人数</div></div>
        <div class="mg-metric"><div class="m-num">${ledger.length}</div><div class="m-label">风险台账事件</div></div>
        <div class="mg-metric"><div class="m-num">${u.role==='community_admin'?refCount:persons.reduce((s,p)=>s+(p.trainings||[]).length,0)}</div><div class="m-label">${u.role==='community_admin'?'转介记录':'训练总次数'}</div></div>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:8px;">🛡️ ${u.role==='school_admin'?'学校端':'社区端'}概览：脱敏聚合数据，用于分级支持闭环；无法查看任何人的私人聊天与树洞内容。</p>`;
    }
  }
  // 身份与归属
  const role=u.role&&ROLE_DEFS[u.role]?ROLE_DEFS[u.role].name:'未设置';
  let org='—';
  if(u.role==='student')org=u.orgName+(u.grade?' · '+u.grade:'');
  else if(u.role==='normal')org=u.orgName||'未填写（数据不进入管理员台账）';
  else if(u.role==='school_admin')org=u.orgName;
  else if(u.role==='community_admin')org=u.orgName;
  else if(u.role==='parent')org=u.childUsername?('已绑定孩子：'+childNickOf(u.childUsername)):'未绑定孩子';
  const parentBtns=u.role==='parent'?`<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;"><button class="t-btn" style="font-size:12px;padding:4px 12px;" onclick="openBindChild()">绑定/更换孩子</button>${u.childUsername?`<button class="t-btn" style="font-size:12px;padding:4px 12px;border-color:var(--muted);color:var(--muted);" onclick="unbindChild()">解绑</button>`:''}</div>`:'';
  const extraMeta=[];
  if(u.age)extraMeta.push('年龄 '+u.age);
  if(u.gender)extraMeta.push(u.gender);
  if(u.contacts&&Object.values(u.contacts).some(v=>v))extraMeta.push('已设置紧急联系人');
  if(u.tags&&u.tags.includes('leftbehind'))extraMeta.push('🏷️ 留守儿童（老师/社区标注）');
  $('pf-identity').innerHTML=`<div class="history-item" style="margin-bottom:0;"><div style="flex:1;"><div>身份：<b>${esc(role)}</b>${u.role&&ROLE_DEFS[u.role]?`<span class="role-badge">${esc(ROLE_DEFS[u.role].short)}</span>`:''}</div><div style="font-size:12px;color:var(--muted);margin-top:2px;">归属：${esc(org)}${u.region?' · '+esc(u.region):''}${extraMeta.length?'<br>'+esc(extraMeta.join(' · ')):''}</div>${parentBtns}</div><button onclick="openIdentityModal()">修改</button></div>`;
  /* 家庭连接（学生/普通用户）：邀请码 */
  const fbox=$('pf-familycode');
  if(fbox){
    if(u.role==='student'||u.role==='normal'){
      fbox.innerHTML='<div class="panel-title">🔗 家庭连接</div><div id="family-code-profile"></div>';
      renderFamilyCodeBox('family-code-profile');
    }else{fbox.innerHTML='';}
  }
  // API 状态（仅学生/普通用户有 AI 疏导功能，其他角色不展示该配置）
  const apiBox=$('pf-api-form');
  const apiTitle=$('pf-api-title');
  if(apiBox)apiBox.style.display=isAIUser?'':'none';
  if(apiTitle)apiTitle.style.display=isAIUser?'':'none';
  if(isAIUser)renderApiStatus();
}
function viewHistory(idx){
  const u=DB.currentUser();if(!u)return;
  const r=u.records[idx];if(!r)return;
  const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return;
  showResult(s,r.total);go('result');
}
function renderApiStatus(){
  const s=getApiSettings();
  $('api-status').innerHTML=s
    ?'<span style="color:var(--green);">✅ 已配置：'+AI_PROVIDERS[s.provider].name+'（Key 仅保存在本浏览器）</span>'
    :'<span style="color:var(--muted);">未配置。获取免费 Key：<a href="https://open.bigmodel.cn/" target="_blank" style="color:var(--teal);">智谱开放平台 open.bigmodel.cn</a> → 注册 → API Keys → 创建（推荐设置额度上限）。</span>';
}
function saveApiKey(){
  const key=$('api-key').value.trim();
  const provider=$('api-provider').value;
  if(!key){toast('请先粘贴 API Key');return;}
  const u=DB.currentUser();if(!u)return;
  u.settings={provider,apiKey:key};
  DB.saveUser(u);
  $('api-key').value='';
  toast('✅ API Key 已保存，AI 疏导已切换为真实大模型对话');
  renderApiStatus();updateChatModeUI();
}
function clearApiKey(){
  const u=DB.currentUser();if(!u)return;
  if(u.settings)delete u.settings;
  DB.saveUser(u);
  toast('已清除 API Key，AI 疏导回到演示模式');
  renderApiStatus();updateChatModeUI();
}
function exportData(){
  const u=DB.currentUser();if(!u)return;
  const blob=new Blob([JSON.stringify({user:u.username,nickname:u.nickname,records:u.records,trainings:u.trainings,posts:getPosts(),vents:getVents(),family:getFamilyLog(),resources:getResources(),referrals:getReferrals(),familyPhotos:getFamilyPhotos(),parentChat:getParentChat(),chat:DB.getData('chat',[]),moodDiary:DB.getData('moodDiary',{}),moodRewardDays:DB.getData('moodRewardDays',[]),courseVisits:DB.getData('courseVisits',[]),riskLedger:getLedger().filter(e=>e.username===u.username),profile:{age:u.age,gender:u.gender,grade:u.grade,className:u.className,tags:u.tags,aiPersona:u.aiPersona},exportAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='xinyu-data-'+u.username+'.json';
  a.click();
  toast('✅ 数据已导出为 JSON 文件');
}
function clearAllData(){
  openModal(`<h3>⚠️ 清除全部本地数据</h3><p>将删除本浏览器中你的账号、测评记录、训练记录、聊天记录与社区帖子。<b>此操作不可恢复</b>，建议先导出数据。</p><div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button><button class="btn" style="background:var(--danger);color:#fff;" onclick="doClearAll()">确认清除</button></div>`);
}
function doClearAll(){
  const u=DB.currentUser();
  const users=DB.users;
  if(u)delete users[u.username];
  delete users['undefined'];
  DB.saveUsers(users);
  Object.keys(localStorage).forEach(k=>{if(k.startsWith('xinyu-'))localStorage.removeItem(k);});
  closeModal();
  toast('已清除全部本地数据');
  showAuth();
}
/* ═══════════════ 初始化 ═══════════════ */
/* ================= v4 新增模块（欢迎弹窗 / 年级班级 / 分级干预 / 台账 / 画像 / 语音 / 家庭 / 学校） ================= */
/* ── 青少年专项测评（v4 新增三套） ── */
SCALES.push(
  {id:'loneliness',name:'孤独感测评',en:'ULS-8 · 孤独感简版（UCLA 思路）',time:'约2分钟',items:8,
   intro:'下面的描述与你的感受有多符合？本测评改编自国际通用的 UCLA 孤独量表简版（ULS-8，含第 3、6 题反向计分），特别关注情感陪伴与社交关系，总分 8-32 分，分数越高表示孤独感越强。',
   options:[['从不',1],['很少',2],['有时',3],['常常',4]],
   questions:['你多久会感到缺少陪伴？','你多久会感到没人可以倾诉？','你多久会感到自己和周围人一样合群？（反向）','你多久会感到自己被冷落？','你多久会感到和周围人疏远？','你多久会感到有人真正了解你？（反向）','你多久会感到想找人说说话却找不到人？','你多久会感到被人理解是一件很难的事？'],
   reverse:[2,5],
   max:32,
   levels:[
     {min:8,max:15,label:'孤独感较低',cls:'mild',desc:'你的社交连接整体良好，能感受到来自他人的支持与陪伴。',recs:[['保持连接','定期和朋友见面或联系，维系关系'],['主动分享','在心屿树洞分享心情，收获同频回应']]},
     {min:16,max:23,label:'中度孤独感',cls:'moderate',desc:'你有时会感到孤独，尤其是需要情感陪伴的时刻。这是很常见的感受，可以通过主动连接来改善。',recs:[['AI 疏导','和心屿聊聊孤独的来源'],['主动连接','给家人/朋友发一条消息，哪怕只是问候'],['树洞倾诉','匿名说出来，就会被接住']]},
     {min:24,max:32,label:'高度孤独感 · 需要关注',cls:'severe',desc:'你的孤独感比较强烈，可能长期缺少情感陪伴（如留守儿童、独居等）。请一定不要独自硬扛，平台已为你开启分级支持。',recs:[['AI 分级支持','系统已为你建立风险追踪，AI 会持续陪伴'],['联系老师','把你的感受告诉信任的老师/社区工作者'],['专业热线','需要时拨打 12356 心理援助热线']]}],
   ref:'改编自 UCLA Loneliness Scale（Russell DW, 1996）中文简版思路：8 题 Likert 4 点计分（从不1-常常4），总分 8-32。参考分界：≤15 低，16-23 中，≥24 高（简版切分，供自我筛查参考）。'},
  {id:'family',name:'家庭关系测评',en:'家庭沟通与亲子连接（简版）',time:'约2分钟',items:8,
   intro:'请回忆最近两周你与家人的相处情况。本测评关注家庭沟通与亲子连接，总分 0-24 分，分数越高表示家庭连接越紧密。',
   options:[['从不',0],['偶尔',1],['经常',2],['总是',3]],
   questions:['家人会主动关心我的心情和近况','我能比较自然地跟家人说出我的烦恼','家里吃饭或相处时气氛是轻松愉快的','家人愿意听我把话说完，不急着打断或批评','遇到困难时，我能感觉到家人的支持','家人会用语言或行动让我感到被爱','我愿意主动和家人分享我的生活','我信任家人对我的关心是真诚的'],
   max:24,
   levels:[
     {min:17,max:24,label:'家庭连接良好',cls:'mild',desc:'你与家人之间有较好的沟通与连接，这是很重要的心理支持资源。',recs:[['保持频率','继续保持与家人的沟通习惯'],['分享成长','把平台学到的情绪知识分享给家人']]},
     {min:9,max:16,label:'家庭沟通中等',cls:'moderate',desc:'你与家人有连接，但沟通深度或频率还有提升空间，值得慢慢经营。',recs:[['沟通课堂','家长端有科学沟通课程，也可建议家人学习'],['主动开口','从小事开始，比如分享今天发生的一件事'],['AI 建议','在 AI 疏导里聊聊你和家人的相处模式']]},
     {min:0,max:8,label:'家庭连接偏弱 · 需要关注',cls:'severe',desc:'你与家人之间的连接比较薄弱，可能长期缺少家庭支持（如留守、父母忙碌等）。家庭支持不是你的错，平台会为你提供其他支持渠道。',recs:[['AI 分级支持','已为你开启持续陪伴与追踪'],['信任他人','把支持来源扩展到老师、朋友、社区'],['亲子沟通建议','查看 AI 亲子沟通助手中的表达方法']]}],
   ref:'参考家庭功能评定量表 FAD（Epstein et al., 1983）沟通/情感卷入维度与亲子关系量表思路简化为 8 题：从不0-总是3，总分 0-24。≥17 良好，9-16 中等，≤8 偏弱（简版切分，供筛查参考）。'},
  {id:'sleep',name:'睡眠质量测评',en:'PSQI-7 · 睡眠质量简版',time:'约2分钟',items:7,
   intro:'请回顾你最近两周的睡眠情况。本测评关注睡眠时间与睡眠问题，总分 0-21 分，分数越高表示睡眠困扰越明显。',
   options:[['没有',0],['每周1-2次',1],['每周3-4次',2],['几乎每晚',3]],
   questions:['入睡困难（躺下超过 30 分钟睡不着）','夜里容易醒，醒来后难以再入睡','早上醒得过早，且无法继续睡','白天感到困倦、注意力难以集中','因睡眠问题而情绪烦躁或低落','担心自己睡不好，越想越睡不着','睡前脑子里事情停不下来（思维反刍）'],
   max:21,
   levels:[
     {min:0,max:5,label:'睡眠质量良好',cls:'mild',desc:'你的睡眠整体不错，继续保持规律作息。',recs:[['保持作息','固定起床时间，周末也别差太多'],['睡前放松','可用 4-7-8 呼吸巩固']]},
     {min:6,max:10,label:'轻度睡眠困扰',cls:'moderate',desc:'存在轻度睡眠问题，常见于压力期，多数可通过睡眠卫生改善。',recs:[['睡眠卫生','睡前一小时远离屏幕'],['睡前引导','使用「睡前放松引导」训练'],['4-7-8 呼吸','睡前做一组帮助放松']]},
     {min:11,max:15,label:'中度睡眠困扰',cls:'severe',desc:'睡眠问题比较明显，可能已经影响白天状态，建议积极干预。',recs:[['坚持训练','每天完成睡前引导与呼吸练习'],['减少刺激','下午后不喝咖啡因饮品'],['寻求帮助','持续两周以上建议预约学校心理中心']]},
     {min:16,max:21,label:'重度睡眠困扰 · 建议就医',cls:'severe',desc:'睡眠困扰比较严重，强烈建议尽快寻求专业帮助（如睡眠门诊）。',recs:[['尽快就医','前往睡眠门诊或精神科评估'],['告知家人','寻求家人陪伴与支持'],['避免自行用药','不要自行服用安眠药']]}],
   ref:'参考匹兹堡睡眠质量指数 PSQI（Buysse DJ et al., 1989）思路简化为 7 题：没有0-几乎每晚3，总分 0-21。≤5 良好，6-10 轻度，11-15 中度，≥16 重度（简版切分，供筛查参考）。'}
);
/* ── AI 心理危机动态分级（测评→AI分析→国际标准分层→诱导支持→敏感词紧急联系→反馈追踪） ── */
const RISK_LABEL={low:{name:'低风险',cls:'low',tip:'继续陪伴：保持日常关注与定期复测'},mid:{name:'中风险',cls:'mid',tip:'推荐帮助：建议预约学校心理中心，平台持续陪伴'},high:{name:'高风险',cls:'high',tip:'启动人工支持流程：立即联系相关负责人'}};
const SENSITIVE_CATS=[
  {cat:'自伤自残',words:['自残','割腕','划手','伤害自己','伤害我','弄伤自己','流血','自伤','拿刀','吞药','吃药自杀','过量服药','割手','划伤自己','用刀划','烫自己','撞墙','咬自己','拔头发']},
  {cat:'自杀意念',words:['自杀','不想活','不想活了','想死','轻生','结束生命','一了百了','跳楼','跳河','卧轨','上吊','烧炭','喝农药','安眠药','遗书','活不下去','了结','离开这个世界','解脱','消失算了','死了一了百了','不如死了','好想死','去死','人间不值得','永别了','再见世界','最后的话','我先走了','不用找我','下辈子']},
  {cat:'极端孤独',words:['没有人爱我','没人关心我','谁都不在乎我','被全世界抛弃','孤立无援','没有人理解我','好孤独','特别孤独','非常孤独','孤独得要命','被所有人讨厌','多余的人','没人要','没人懂我','我是多余的','累赘','没人会在乎','像空气','融不进去','没有未来']},
  {cat:'无望感',words:['没有希望','看不到希望','没有意义','活着没意思','一切都没有意义','不会好了','永远好不了','没救了','没用的人','废物','什么都做不好','彻底失败','失败者','烂人','撑不下去了','坚持不住了','熬不过去','受不了了','快疯掉']},
  {cat:'暴力伤害',words:['想打人','想杀人','报复社会','伤害别人','弄死他','打死','杀了他们','砸东西']}
];
function checkSensitive(text){
  for(const c of SENSITIVE_CATS){
    for(const w of c.words){if(text.includes(w))return {word:w,cat:c.cat};}
  }
  return null;
}
/* 量表得分 → 风险分层（国际分界标准映射） */
function riskOfScale(scaleId,total){
  const s=SCALES.find(x=>x.id===scaleId);if(!s)return 'low';
  const lv=getLevel(s,total);
  if(lv.cls==='severe')return 'high';
  if(lv.cls==='moderate')return 'mid';
  return 'low';
}
/* 综合风险评估：结合最近测评 + 聊天情绪信号 */
function overallRisk(u){
  if(!u)return {level:'low',reasons:[]};
  const reasons=[];
  let worst='low';
  const recs=(u.records||[]).slice().sort((a,b)=>b.date-a.date);
  const seen={};
  recs.forEach(r=>{if(!seen[r.scaleId]){seen[r.scaleId]=r;}});
  Object.values(seen).forEach(r=>{
    const rk=riskOfScale(r.scaleId,r.total);
    if(rk==='high'&&worst!=='high'){worst='high';reasons.push('『'+(SCALES.find(s=>s.id===r.scaleId)||{}).name+'』最近得分达到高风险区间');}
    else if(rk==='mid'&&worst==='low'){worst='mid';reasons.push('『'+(SCALES.find(s=>s.id===r.scaleId)||{}).name+'』最近得分处于中风险区间');}
  });
  /* 长期低落：过去 30 天 ≥3 次中等及以上情绪困扰记录 */
  const cutoff=Date.now()-30*86400000;
  const neg=recs.filter(r=>r.date>=cutoff&&['phq9','gad7'].includes(r.scaleId)&&riskOfScale(r.scaleId,r.total)!=='low');
  if(neg.length>=3&&worst==='low'){worst='mid';reasons.push('近 30 天多次出现情绪困扰信号，提示长期低落倾向');}
  return {level:worst,reasons};
}
/* 风险台账（全局可查，管理员可导出） */
function getLedger(){try{return JSON.parse(localStorage.getItem('xinyu-risk-ledger')||'[]');}catch(e){return [];}}
function saveLedger(l){localStorage.setItem('xinyu-risk-ledger',JSON.stringify(l));}
function addRiskEvent(ev){
  const u=DB.currentUser();if(!u)return null;
  const e={
    id:'lg'+Date.now()+Math.floor(Math.random()*999),
    ts:Date.now(),username:u.username,nickname:u.nickname,avatar:u.avatar||'',
    role:u.role||'',orgType:u.orgType||'',orgName:u.orgName||'',region:u.region||'',
    type:ev.type||'risk-grade',trigger:ev.trigger||'',level:ev.level||'low',
    action:ev.action||'',status:'tracking',notes:ev.notes||[],grade:u.grade||''
  };
  const l=getLedger();l.unshift(e);saveLedger(l);
  return e;
}
function ledgerForAdmin(admin){
  const l=getLedger();
  if(!admin)return [];
  if(admin.role==='school_admin')return l.filter(e=>e.orgType==='school'&&normOrg(e.orgName)===normOrg(admin.orgName));
  if(admin.role==='community_admin')return l.filter(e=>(e.orgType==='community'||e.orgType==='street')&&normOrg(e.orgName)===normOrg(admin.orgName));
  return [];
}
/* 反馈追踪：复测/聊天回暖 → 台账状态更新 */
function trackFollowUp(u){
  if(!u)return;
  const l=getLedger();
  let changed=false;
  l.forEach(e=>{
    if(e.username!==u.username||e.status!=='tracking')return;
    const evRecs=(u.records||[]).filter(r=>r.date>=e.ts);
    if(evRecs.length){
      const cur=overallRisk(u);
      if(cur.level==='low'&&e.level!=='low'){
        e.status='improving';e.notes.push({ts:Date.now(),text:'用户复测后风险降至低水平，状态好转，建议继续保持定期复测'});changed=true;
      }else{
        e.notes.push({ts:Date.now(),text:'用户完成新测评，当前综合风险：'+RISK_LABEL[cur.level].name});changed=true;
      }
    }
  });
  if(changed)saveLedger(l);
}
/* 测评后触发：分级判定 + 诱导支持 + 台账 */
function afterQuizRiskFlow(scale,total){
  const u=DB.currentUser();if(!u)return;
  const lv=getLevel(scale,total);
  const rk=riskOfScale(scale.id,total);
  trackFollowUp(u);
  if(rk==='low'){
    addRiskEvent({type:'risk-grade',trigger:scale.name+' 得分 '+total+'/'+scale.max+'（'+lv.label+'）',level:'low',action:'AI 继续陪伴：给出巩固建议，建议 2-4 周后复测'});
    return;
  }
  /* 诱导支持：先由 AI 引导表达，再按层级给支持 */
  const supportMsg=rk==='high'
    ?'AI 分析：你最近一次「'+scale.name+'」得分 '+total+'/'+scale.max+'（'+lv.label+'），按国际分界标准已进入<b>高风险区间</b>。心屿不会让你独自面对——请先别急着做任何决定，跟 AI 聊聊你最近最真实的感受，平台已同步启动人工支持流程，会有负责老师关注到你。'
    :'AI 分析：你最近一次「'+scale.name+'」得分 '+total+'/'+scale.max+'（'+lv.label+'），按国际分界标准处于<b>中风险区间</b>。这并不代表你“有问题”，只说明你最近承受得比较多。建议：① 到 AI 疏导和伙伴聊聊；② 预约学校心理中心做一次专业评估；③ 坚持每天一项自助训练。';
  const ev=addRiskEvent({type:'risk-grade',trigger:scale.name+' 得分 '+total+'/'+scale.max+'（'+lv.label+'）',level:rk,action:rk==='high'?'启动人工支持流程：通知负责老师关注并跟进':'推荐专业帮助：建议预约心理中心 + 平台持续陪伴',notes:[{ts:Date.now(),text:rk==='high'?'高风险触发，已提示用户联系负责人并告知信任的人':'中风险触发，已给出专业帮助建议'}]});
  if(rk==='high'){
    setTimeout(()=>{openCrisisSupportModal(scale.name+' 得分 '+total+'/'+scale.max+'（'+lv.label+'）',ev);},600);
  }else{
    toast('🧭 AI 分级：'+RISK_LABEL[rk].name+' · 已写入风险台账，持续追踪');
  }
}
/* 紧急联系弹窗（高风险 / 敏感词触发） */
function openCrisisSupportModal(reason,ev){
  const u=DB.currentUser();
  const c=(u&&u.contacts)||{};
  const contactRow=(label,val)=>val?`<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px dashed var(--line);font-size:13.5px;"><span style="color:var(--muted);">${label}</span><b>${esc(val)}</b></div>`:'';
  openModal(`<h3 style="color:var(--danger);">🆘 心屿紧急支持通道已启动</h3>
    <div class="warn-box" style="margin-top:0;">${reason}<br><br>按照分级支持流程，<b>高风险信号需要联系相关负责人员</b>。请选择以下方式获得支持：</div>
    <div style="border:1px solid var(--line);border-radius:12px;margin:12px 0;overflow:hidden;">
      ${contactRow('🏫 心理老师 / 辅导员',c.teacher||'可到个人中心「紧急联系人」补充')}
      ${contactRow('👥 信任的家人朋友',c.family||'请告诉身边信任的人')}
      ${contactRow('📞 全国心理援助热线','12356（24小时免费）')}
      ${contactRow('🏥 最近精神卫生机构',c.hospital||'可前往就近精神卫生中心')}
    </div>
    <p style="font-size:12.5px;color:var(--muted);">🤖 AI 不是医生，AI 仅提供辅助心理支持。你的安全是第一位的。本次触发已写入平台风险台账，相关负责人员将跟进你的情况。</p>
    <div class="modal-foot">
      <button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">我知道了</button>
      <button class="btn" style="background:var(--danger);color:#fff;" onclick="confirmCrisisContacted('${esc(ev?ev.id:'')}')">✅ 我已联系负责人 / 拨打热线</button>
    </div>`);
}
function confirmCrisisContacted(evId){
  const l=getLedger();
  const e=l.find(x=>x.id===evId);
  if(e){e.status='tracking';e.notes.push({ts:Date.now(),text:'用户确认已联系负责人/热线，进入人工跟进状态'});saveLedger(l);}
  const u=DB.currentUser();if(u){u.manualSupport=true;u.manualSupportAt=Date.now();DB.saveUser(u);syncRoster(u);}
  closeModal();
  toast('💙 谢谢你愿意求助。负责老师会关注你的情况，心屿也一直在。');
}
/* 敏感词触发（聊天/树洞/语音树洞共用） */
function sensitiveTrigger(text,source){
  const hit=checkSensitive(text);
  if(!hit)return null;
  const ev=addRiskEvent({type:'sensitive',trigger:'【'+source+'】检测到敏感表达：「'+hit.word+'」（'+hit.cat+'）',level:'high',action:'启动人工支持流程：弹窗提供紧急联系渠道，通知相关负责人',notes:[{ts:Date.now(),text:'命中敏感词 '+hit.cat+' 类别'}]});
  return ev;
}
function openSensitiveModal(hit,ev){
  openModal(`<h3 style="color:var(--danger);">⚠️ 我们很担心你</h3>
    <div class="warn-box" style="margin-top:0;">你刚才的表达中出现了与<b>「${esc(hit.cat)}」</b>相关的内容（「${esc(hit.word)}」）。心屿非常重视你的安全，按分级支持流程需要<b>立即联系相关负责人员</b>。</div>
    <div style="border:1px solid var(--line);border-radius:12px;margin:12px 0;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px dashed var(--line);font-size:13.5px;"><span style="color:var(--muted);">📞 全国心理援助热线</span><b>12356（24小时）</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px dashed var(--line);font-size:13.5px;"><span style="color:var(--muted);">🏫 学校心理咨询中心</span><b>预约校内咨询</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:13.5px;"><span style="color:var(--muted);">👥 信任的人</span><b>请立即告诉身边信任的人</b></div>
    </div>
    <p style="font-size:12.5px;color:var(--muted);">触发已记录到风险台账，负责老师会跟进。AI 不是医生，AI 仅为辅助心理支持。</p>
    <div class="modal-foot">
      <button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">我知道了</button>
      <button class="btn" style="background:var(--danger);color:#fff;" onclick="confirmCrisisContacted('${esc(ev?ev.id:'')}')">✅ 我已联系 / 拨打热线</button>
    </div>`);
}

/* ================= v4 新增模块（欢迎弹窗 / 年级班级 / 分级干预 / 台账 / 画像 / 语音 / 家庭 / 学校） ================= */
/* ── 年级体系（小学一年级 ~ 博士研究生） ── */
const GRADE_STAGES=[
  {key:'primary',name:'小学',icon:'🎒',pill:'g-primary',grades:['一年级','二年级','三年级','四年级','五年级','六年级'],courses:['认识情绪','情绪管理','同伴交往']},
  {key:'junior',name:'初中',icon:'📖',pill:'g-junior',grades:['初一','初二','初三'],courses:['青春期成长','人际交往','自我认知']},
  {key:'senior',name:'高中',icon:'✏️',pill:'g-senior',grades:['高一','高二','高三'],courses:['压力管理','考试焦虑','生涯规划']},
  {key:'college',name:'大学本科',icon:'🎓',pill:'g-college',grades:['大一','大二','大三','大四'],courses:['大学生心理健康','情绪调节','学业与职业压力']},
  {key:'master',name:'硕士研究生',icon:'🔬',pill:'g-grad',grades:['研一','研二','研三'],courses:['科研压力调适','导师关系','职业发展']},
  {key:'doctor',name:'博士研究生',icon:'🛡️',pill:'g-grad',grades:['博一','博二','博三','博四'],courses:['科研心理韧性','学术焦虑','长期规划']}
];
function gradeStageOf(grade){return GRADE_STAGES.find(s=>s.grades.includes(grade))||null;}
/* ═══════════════ v3.0 焕彩主题系统(新增,不改动既有逻辑) ═══════════════ */
const THEMES=[
  {id:'zhiyu',name:'治愈校园',icon:'🌿',desc:'奶油底 + 鼠尾草绿,像午后的校园草地'},
  {id:'tianmei',name:'甜美风',icon:'🌸',desc:'粉彩糖霜质感,柔软不腻'},
  {id:'tianku',name:'甜酷风',icon:'🖤',desc:'粉 × 黑,甜里带一点飒'},
  {id:'jianyue',name:'简约清新',icon:'🍃',desc:'白与浅绿,清爽呼吸感'},
  {id:'keji',name:'科技风',icon:'🔬',desc:'冷静蓝灰,理性又轻快'},
  {id:'mengqu',name:'萌趣卡通',icon:'🐻',desc:'明黄暖橙,大圆角萌系'},
  {id:'yuanqi',name:'元气校园',icon:'⚡',desc:'珊瑚橙活力满满'},
  {id:'jingmi',name:'静谧蓝调',icon:'🌊',desc:'雾蓝灰调,安静专注'},
  {id:'fugu',name:'轻复古胶片',icon:'🎞️',desc:'米棕胶片质感,怀旧温度'},
  {id:'saibo',name:'轻量赛博',icon:'🌐',desc:'浅色网格 + 青品点缀,轻科幻'},
  {id:'makalong',name:'马卡龙柔和',icon:'🍬',desc:'淡紫淡粉淡绿,软糯马卡龙'},
  {id:'jijian',name:'极简黑白',icon:'◼️',desc:'黑白灰,利落克制'}
];
const DEFAULT_THEME='zhiyu';
const DEMO_ACCOUNT_NAMES=['demo-stu1','demo-user1','demo-admin1','demo-parent1','demo-com1'];
/* 主题资格:仅学段为初中/高中的学生 + 演示账号(要求三);小学端/本科及以上/其他角色保持原样 */
function isThemeEligible(u){
  if(!u)return false;
  if(u.isDemo)return true;
  if(u.role!=='student')return false;
  const s=gradeStageOf(u.grade||'');
  return !!s&&(s.key==='junior'||s.key==='senior');
}
function currentThemeOf(u){
  if(!isThemeEligible(u))return null;
  const id=(u&&u.theme)||DEFAULT_THEME;
  return THEMES.some(t=>t.id===id)?id:DEFAULT_THEME;
}
function applyTheme(u){
  const t=currentThemeOf(u);
  if(t){document.body.dataset.theme=t;}else{delete document.body.dataset.theme;}
}
function openThemePanel(){
  const u=DB.currentUser();
  if(!isThemeEligible(u)){toast('风格设置面向初中/高中学生与演示账号');return;}
  const cur=currentThemeOf(u);
  const cards=THEMES.map(t=>`<button class="theme-card ${t.id===cur?'sel':''}" onclick="pickTheme('${t.id}')"><span class="t-ico">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small></button>`).join('');
  openModal(`<h3>🎨 风格设置</h3><p class="sub">12 套全局风格,选中即全站即时切换(首页 / 成长档案 / 测评中心 / AI 疏导 / 自助训练 / 心屿 树洞 / 课程库 / 个人中心统一套用),选择保存在你的账号里,下次登录自动恢复。</p><div class="theme-grid">${cards}</div>`);
}
function pickTheme(id){
  const u=DB.currentUser();
  if(!isThemeEligible(u)){toast('当前账号不支持切换风格');return;}
  const t=THEMES.find(x=>x.id===id);
  if(!t)return;
  u.theme=id;DB.saveUser(u);
  applyTheme(u);
  closeModal();
  toast('已切换为「'+t.name+'」风格 🎨');
}
function gradePillHtml(grade){const st=gradeStageOf(grade);return st?`<span class="grade-pill ${st.pill}">${st.icon} ${esc(st.name)}</span>`:'';}
function gradeOptionsHtml(selGrade){
  return GRADE_STAGES.map(st=>`<optgroup label="${st.icon} ${st.name}">${st.grades.map(g=>`<option value="${g}" ${g===selGrade?'selected':''}>${g}</option>`).join('')}</optgroup>`).join('');
}
/* 按年级匹配测评、课程与推荐内容 */
function gradeMatch(grade){
  const st=gradeStageOf(grade)||GRADE_STAGES[0];
  return {
    stage:st,
    scales:gradeRecommendScales(st.key),
    courses:st.courses,
    greeting:gradeGreeting(st.key)
  };
}
function gradeRecommendScales(stageKey){
  if(stageKey==='primary'||stageKey==='junior')return ['loneliness','family','sleep'];
  if(stageKey==='senior')return ['gad7','sleep','phq9','pss10'];
  if(stageKey==='college')return ['phq9','gad7','pss10','isi7','rses'];
  return ['phq9','gad7','pss10','rses','sleep'];
}
function gradeGreeting(stageKey){
  const m={
    primary:'小学是情绪启蒙的黄金期，学会说出“我现在有点难过”，就是最了不起的本领 🍀',
    junior:'青春期身体和情绪都在快速变化，这些变化都很正常，你不是一个人 🌱',
    senior:'升学压力很大，但你的价值从来不只由一场考试定义 ✨',
    college:'大学是探索自我的阶段，允许自己慢一点，也是一种成长 🌊',
    master:'科研路上难免起伏，照顾好自己才能走得更远 🔬',
    doctor:'博士之路漫长而孤独，你的坚持本身就很了不起 🛡️'
  };
  return m[stageKey]||'';
}
/* ── 首页 Hero CTA：按角色显示该角色自己的功能入口（v4.2） ── */
const HERO_CTAS={
  student:[["go('scales')",'开始心理测评','btn-primary'],["go('chat')",'找 AI 聊聊','btn-ghost']],
  normal:[["go('scales')",'开始心理测评','btn-primary'],["go('chat')",'找 AI 聊聊','btn-ghost']],
  parent:[["go('child')",'📈 查看孩子状态','btn-primary'],["go('family')",'🏡 家庭互动打卡','btn-ghost']],
  school_admin:[["go('school-trend')",'📈 趋势分析','btn-primary'],["go('school-focus')",'🧭 重点关注与转介','btn-ghost']],
  community_admin:[["go('manage')",'📊 区域概览','btn-primary'],["go('resources')",'🤝 资源连接','btn-ghost']]
};
function renderHeroCta(role){
  const row=document.querySelector('#page-home .hero .cta-row');
  if(!row)return;
  const ctas=HERO_CTAS[role];
  if(!ctas)return;
  row.innerHTML=ctas.map(c=>`<button class="btn ${c[2]}" onclick="${c[0]}">${c[1]}</button>`).join('');
}
/* ── 欢迎弹窗贴士：按角色显示该角色的贴士（v4.2） ── */
const WELCOME_TIPS_BY_ROLE={
  student:['完成一次测评，AI 会为你生成专属分级支持方案','在「AI 疏导」里可以挑选你喜欢的 AI 伙伴人格','心情不好的时候，试试树洞里的「语音倾诉」——说出来就会轻一点','每天来看看「今日状态卡」，它会提醒你照顾自己'],
  normal:['完成一次测评，AI 会为你生成专属分级支持方案','在「AI 疏导」里可以挑选你喜欢的 AI 伙伴人格','心情不好的时候，试试树洞里的「语音倾诉」','每天来看看「今日状态卡」，它会提醒你照顾自己'],
  parent:['用孩子发给你的家庭邀请码绑定账号，两边的状态就连在一起了','「AI 亲子沟通助手」可以帮你找到开口的方法','每天一个小互动打卡，让家成为情绪的避风港'],
  school_admin:['「趋势分析」查看整体状态分布与量表平均分','「重点关注」里有风险台账：可筛选、标记已闭环、导出','「课程资源库」为你准备了教师专属课程'],
  community_admin:['「区域概览」查看本区域脱敏心理数据','「资源连接」登记心理老师、机构与公益服务','「转介记录」从发现到跟进形成闭环']
};
function welcomeTipFor(role){
  const pool=WELCOME_TIPS_BY_ROLE[role]||WELCOME_TIPS;
  return pool[Math.floor(Math.random()*pool.length)];
}
/* ── 温馨欢迎弹窗 ── */
const WELCOME_QUOTES=[
  '欢迎回家。<b>心屿</b>会一直在这里，陪你度过每一个或晴或雨的日子。',
  '很高兴遇见你。在这里，<b>每一种情绪都值得被温柔接住</b>。',
  '愿你今天也能<b>好好照顾自己</b>——哪怕是喝一口热水这样的小事。',
  '慢慢来，比较快。<b>成长从来不是一场竞赛</b>。',
  '你不需要很完美才值得被爱。<b>此刻的你，已经足够好</b>。',
  '把心里的雨说出来，<b>天就会慢慢晴</b>。'
];
const WELCOME_TIPS=[
  '💡 小贴士：完成一次测评，AI 会为你生成专属分级支持方案。',
  '💡 小贴士：在「AI 疏导」里可以挑选你喜欢的 AI 伙伴人格。',
  '💡 小贴士：心情不好的时候，试试树洞里的「语音倾诉」——说出来就会轻一点。',
  '💡 小贴士：家庭端的邀请码可以让你和孩子的心屿账号连接在一起。',
  '💡 小贴士：每天来看看「今日状态卡」，它会提醒你照顾自己。',
  '💡 小贴士：遇到任何困难，都可以随时找 AI 伙伴聊聊，或者拨打 12356。'
];
function welcomeKey(){const u=DB.currentUser();return 'xinyu-welcomed-'+((u&&u.username)||'anon')+'-'+((u&&u.role)||'norole');}
function showWelcomePopup(){
  const u=DB.currentUser();
  if(!u||!u.role)return;
  if(localStorage.getItem(welcomeKey()))return; // 每个身份只弹一次，不阻断后续操作
  localStorage.setItem(welcomeKey(),'1');
  const roleName=(ROLE_DEFS[u.role]||{}).name||'';
  const quote=WELCOME_QUOTES[Math.floor(Math.random()*WELCOME_QUOTES.length)];
  const tip=welcomeTipFor(u.role);
  const emojis=['💙','🌊','🌸','⭐','🌙','🍀','🫧','☀️'];
  const hearts=Array.from({length:8},(_,i)=>`<i style="left:${6+i*12}%;animation-delay:${(i*0.7).toFixed(1)}s;font-size:${14+i*3}px;">${emojis[i%emojis.length]}</i>`).join('');
  const orb=u.role==='student'?'🎓':u.role==='normal'?'👤':u.role==='parent'?'👨‍👩‍👧':u.role==='school_admin'?'🏫':'🏘️';
  $('welcome-card').innerHTML=`
    <div class="w-hearts">${hearts}</div>
    <div class="w-orb">${orb}</div>
    <h3>你好呀，${esc(u.nickname)}</h3>
    <span class="w-role">${esc(roleName)} · 心屿欢迎你</span>
    <div class="w-quote">${quote}</div>
    <div class="w-tip">${tip}</div>
    <button class="btn btn-teal" style="background:var(--v4-grad-teal);box-shadow:0 8px 20px rgba(14,116,144,.3);" onclick="closeWelcome()">收下这份祝福，开始心屿之旅 💌</button>`;
  $('welcome-mask').classList.add('show');
}
function closeWelcome(){$('welcome-mask').classList.remove('show');}
/* ── 底部导航（学校端上下可达） ── */
const BOTTOM_NAV_SCHOOL=[['school-trend','趋势分析','📈'],['school-grade','年级分析','🎓'],['school-focus','重点关注','🧭'],['school-privacy','隐私说明','🔒'],['courses','课程库','📚']];
function renderBottomNav(){
  const nav=$('bottom-nav');if(!nav)return;
  const u=DB.currentUser();
  const items=u&&u.role==='school_admin'?BOTTOM_NAV_SCHOOL:null;
  if(!items){nav.style.display='none';document.body.classList.remove('has-bottomnav');return;}
  nav.style.display='flex';
  document.body.classList.add('has-bottomnav');
  const cur=document.querySelector('.page.active');
  const curId=cur?cur.id.replace('page-',''):'';
  nav.innerHTML=items.map(([p,l,ico])=>`<button class="${p===curId?'on':''}" onclick="go('${p}')"><span class="bn-ico">${ico}</span>${l}</button>`).join('');
}

/* ── 今日心理状态卡（学生/普通用户，每日自动更新） ── */
function latestRecOf(u,id){const rs=(u.records||[]).filter(r=>r.scaleId===id).sort((a,b)=>b.date-a.date);return rs[0]||null;}
function computeDailyState(u){
  const phq=latestRecOf(u,'phq9'),gad=latestRecOf(u,'gad7'),pss=latestRecOf(u,'pss10'),isi=latestRecOf(u,'isi7'),slp=latestRecOf(u,'sleep'),lon=latestRecOf(u,'loneliness'),fam=latestRecOf(u,'family');
  const moodRec=phq||gad;
  let mood='稳定',moodEmo='😊',moodNote='继续保持好状态';
  if(moodRec){const lv=getLevel(SCALES.find(s=>s.id===moodRec.scaleId),moodRec.total);
    if(lv.cls==='severe'){mood='需要关注';moodEmo='😟';moodNote='建议尽快找专业帮助或和 AI 聊聊';}
    else if(lv.cls==='moderate'){mood='略有波动';moodEmo='😐';moodNote='多关注自己，做点放松练习';}
    else{mood='稳定';moodEmo='😊';moodNote='整体平稳，记得定期复测';}}
  let pressure='适中',pressureNote='状态不错';
  if(pss){const lv=getLevel(SCALES.find(s=>s.id==='pss10'),pss.total);
    if(lv.cls==='severe'){pressure='偏高';pressureNote='建议做时间管理训练减压';}
    else if(lv.cls==='moderate'){pressure='略高';pressureNote='可以试试呼吸练习';}
    else{pressure='轻松';pressureNote='压力管理做得不错';}}
  let sleep='良好',sleepNote='睡得不错';
  const sleepRec=slp||isi;
  if(sleepRec){const lv=getLevel(SCALES.find(s=>s.id===sleepRec.scaleId),sleepRec.total);
    if(lv.cls==='severe'){sleep='需要关注';sleepNote='试试睡前放松引导';}
    else if(lv.cls==='moderate'){sleep='一般';sleepNote='注意睡前一小时远离屏幕';}
    else{sleep='良好';sleepNote='规律作息继续保持';}}
  const recs=[];
  if(mood==='需要关注'||mood==='略有波动')recs.push('和 AI 伙伴聊聊');
  if(pressure==='偏高')recs.push('完成一次压力训练');
  if(sleep==='需要关注'||sleep==='一般')recs.push('睡前放松引导');
  if(lon&&getLevel(SCALES.find(s=>s.id==='loneliness'),lon.total).cls==='moderate')recs.push('去树洞说说话');
  if(fam&&getLevel(SCALES.find(s=>s.id==='family'),fam.total).cls==='severe')recs.push('看看家庭连接建议');
  if(recs.length<2)recs.push('完成一次情绪训练','和 AI 伙伴聊聊');
  if(recs.length<2)recs.push('三件好事练习');
  const tips=['记得多喝水','晒晒太阳补补维生素 D','给朋友发条问候消息','今晚早点睡','写一件今天的小确幸'];
  return {mood,moodEmo,moodNote,pressure,pressureNote,sleep,sleepNote,recs:recs.slice(0,3),tip:tips[new Date().getDate()%tips.length],date:fmtDay(Date.now())};
}
function renderStatusCard(){
  const box=$('home-status-card');if(!box)return;
  const u=DB.currentUser();if(!u)return;
  const st=computeDailyState(u);
  const recBtns=st.recs.map(r=>{
    const map={'和 AI 伙伴聊聊':['chat','💬'],'完成一次情绪训练':['train','🧘'],'完成一次压力训练':['train','🌿'],'睡前放松引导':['train','🌙'],'去树洞说说话':['community','🫧'],'看看家庭连接建议':['portrait','🌱'],'三件好事练习':['train','📝']};
    const [pg,ico]=map[r]||['train','✨'];
    return `<button class="sc-rec" onclick="go('${pg}')">${ico} ${r}</button>`;
  }).join('');
  box.innerHTML=`<div class="status-card">
    <span class="sc-emoji">${st.moodEmo}</span>
    <div class="sc-greet">你好，${esc(u.nickname)}<small>${u.grade?esc(u.grade)+' · ':''}${fmtDay(Date.now())}</small></div>
    <div class="sc-date">💌 今日状态 · ${st.tip}</div>
    <div class="sc-body">
      <div class="sc-item"><div class="si-label">😊 情绪</div><div class="si-value">${st.mood}</div><div class="si-note">${st.moodNote}</div></div>
      <div class="sc-item"><div class="si-label">📚 学习压力</div><div class="si-value">${st.pressure}</div><div class="si-note">${st.pressureNote}</div></div>
      <div class="sc-item"><div class="si-label">🌙 睡眠</div><div class="si-value">${st.sleep}</div><div class="si-note">${st.sleepNote}</div></div>
    </div>
    <div class="sc-recs">${recBtns}</div>
  </div>`;
}
/* ── 可翻转移动式导航（四个入口，翻转切换，点击进入） ── */
const FLIP_MODULES=[
  {page:'scales',ico:'📋',title:'测评中心',desc:'用国际标准量表，看见自己的心理状态',back:'8 套测评 · 含青少年专项',go:'去测评 →'},
  {page:'chat',ico:'💬',title:'AI 疏导',desc:'选择你的 AI 伙伴人格，随时开聊',back:'4 种人格 · 记得你的心事',go:'找 AI 聊聊 →'},
  {page:'train',ico:'🧠',title:'自助训练',desc:'呼吸、日记、认知重构，7 个循证练习',back:'每天 10 分钟，照顾自己',go:'开始训练 →'},
  {page:'community',ico:'🫧',title:'心屿 树洞',desc:'匿名倾诉，有人接住你',back:'支持语音倾诉 · AI 即时回应',go:'去树洞 →'}
];
let flipIdx=0,flipTimer=null,flipped=false;
function renderFlipNav(){
  const wrap=$('flip-nav');if(!wrap)return;
  const m=FLIP_MODULES[flipIdx];
  wrap.innerHTML=`<div class="flip-nav">
    <span class="fn-badge">✨ 轻轻一点，翻到下一站</span>
    <div class="flip-stage" id="flip-stage">
      <div class="flip-face front" onclick="flipTo('${m.page}')">
        <div class="fn-ico">${m.ico}</div>
        <h3>${m.title}</h3><p>${m.desc}</p>
        <div class="fn-go">${m.go}</div>
      </div>
      <div class="flip-face back" onclick="go('${m.page}')">
        <div class="fn-ico">🎈</div>
        <h3>${m.title} · ${m.back}</h3>
        <p>点击进入「${m.title}」${m.ico}</p>
        <div class="fn-go">${m.go}</div>
      </div>
    </div>
    <div class="fn-ctrl">
      <button onclick="flipNav(-1)">‹</button>
      <div class="fn-dots">${FLIP_MODULES.map((x,i)=>`<i class="${i===flipIdx?'on':''}" onclick="flipNavTo(${i})"></i>`).join('')}</div>
      <button onclick="flipNav(1)">›</button>
    </div>
  </div>`;
  const stage=$('flip-stage');
  stage.onclick=e=>{if(!e.target.closest('.flip-face'))return;stage.classList.toggle('flip');};
  resetFlipTimer();
}
function flipNav(dir){flipIdx=(flipIdx+dir+FLIP_MODULES.length)%FLIP_MODULES.length;renderFlipNav();}
function flipNavTo(i){flipIdx=i;renderFlipNav();}
function flipTo(page){$('flip-stage').classList.add('flip');resetFlipTimer();setTimeout(()=>go(page),420);}
function resetFlipTimer(){clearInterval(flipTimer);flipTimer=setInterval(()=>{flipIdx=(flipIdx+1)%FLIP_MODULES.length;renderFlipNav();},7000);}
/* ── 心理成长档案（v4 核心模块） ── */
function dimStars(u,key){
  const recs=u.records||[];
  function norm(scaleId,invert){
    const r=latestRecOf(u,scaleId);if(!r)return null;
    const s=SCALES.find(x=>x.id===scaleId);
    let val=r.total/s.max*100;
    if(invert)val=100-val;
    return val;
  }
  let val=null;
  if(key==='mood')val=norm('phq9',true);
  if(val==null&&key==='mood')val=norm('gad7',true);
  if(key==='stress')val=norm('pss10',true);
  if(key==='social')val=norm('loneliness',true);
  if(key==='family')val=norm('family',false);
  if(val==null)return 2; /* 无数据默认 */
  return Math.max(1,Math.min(5,Math.round(1+val/100*4)));
}
function changePct(u,scaleId,invert){
  const cutoff=Date.now()-30*86400000;
  const rs=(u.records||[]).filter(r=>r.scaleId===scaleId&&r.date>=cutoff).sort((a,b)=>a.date-b.date);
  if(rs.length<2)return null;
  const s=SCALES.find(x=>x.id===scaleId);
  const oldV=rs[0].total/s.max*100,newV=rs[rs.length-1].total/s.max*100;
  let delta=oldV>0?((newV-oldV)/oldV)*100:0;
  if(!isFinite(delta)||isNaN(delta))delta=0;
  if(invert)delta=-delta; /* invert：分数降=好转 → delta 为负=好转 */
  return Math.round(delta); /* 带符号返回 */
}
function trendChip(label,delta,invertGood){
  if(delta==null)return `<span class="trend-chip flat">${label} —</span>`;
  /* invertGood=true：数值下降=好转（焦虑分数）；false：数值上升=好转（睡眠质量） */
  const improved=invertGood?(delta<0):(delta>0);
  const dir=delta>0?'↑':'↓';
  return `<span class="trend-chip ${improved?'up':'down'}">${label} ${dir}${Math.abs(delta)}%</span>`;
}
function portraitAdvice(u,dims){
  const p=[];
  const weak=dims.filter(d=>d.stars<=2).map(d=>d.name);
  const mid=dims.filter(d=>d.stars===3).map(d=>d.name);
  if(weak.length){
    p.push('我看到你在「'+weak.join('」「')+'」这些方面最近有些辛苦。想先和你说：这不是你的错，也不是你“不够好”，它更像是身体在提醒你——最近需要多一点对自己的照顾。就像累了要休息、饿了要吃饭一样，心里的电量低了，也值得被认真对待。');
  }
  if(mid.length){
    p.push('在「'+mid.join('」「')+'」方面，你已经走在不错的位置上，只是还有一点点可以变得更舒服的空间。慢慢来就好，不需要一次性做到满分。');
  }
  if(!weak.length&&!mid.length){
    p.push('从你的档案看，最近的你在情绪、压力、社交和家庭连接上都保持着挺不错的状态，真为你高兴。好的状态也需要用心维护，就像花园需要常常浇水一样。');
  }
  p.push('如果愿意，可以试着从这些很小的事情开始：① 每天睡前写下 3 件今天让你觉得不错的小事，哪怕只是“今天喝到了一杯热牛奶”；② 当感觉压力变大时，先做 3 次 4-7-8 呼吸，再决定下一步做什么；③ 每周挑一个晚上，和信任的人（家人、朋友，或者 AI 伙伴）说说这一周的心情——表达本身就有疗愈的力量。');
  if(dims.some(d=>d.key==='family'&&d.stars<=3)){
    p.push('关于家庭连接，我知道有些话可能很难当面说出口。或许可以先从一句简单的“我今天有点累”开始，让家人有机会走近你；如果觉得直接说很难，也可以把想说的话写下来给家人看。亲子沟通的练习，在沟通课堂里也有一些方法可以参考。');
  }
  p.push('最后想提醒你：成长档案里的所有建议都只是温柔的引导，不是任务，更不是评判。你可以按自己的节奏来，哪怕只是做到其中一件，都已经是很好的开始。心屿会一直陪着你，下次测评后，我们再来看看你的变化。💙');
  return p.join('');
}
let primaryPortraitDim='all';
const PRIMARY_PORTRAIT_META={
  mood:{name:'情绪管理',color:'#f2a6b5',scales:['phq9','gad7'],invert:true},
  stress:{name:'压力管理',color:'#efc36f',scales:['pss10'],invert:true},
  social:{name:'社交能力',color:'#79bfa8',scales:['loneliness'],invert:true},
  family:{name:'家庭链接',color:'#82b8da',scales:['family'],invert:false}
};
function primaryPortraitSeries(u,key){
  const m=PRIMARY_PORTRAIT_META[key],cut=Date.now()-30*86400000;
  return (u.records||[]).filter(r=>m.scales.includes(r.scaleId)&&r.date>=cut).sort((a,b)=>a.date-b.date).map(r=>{
    const s=SCALES.find(x=>x.id===r.scaleId);let value=s?Math.round(r.total/s.max*100):50;if(m.invert)value=100-value;
    return {date:r.date,value:Math.max(0,Math.min(100,value))};
  });
}
function primaryPortraitChart(u,keys){
  const W=680,H=280,L=42,R=20,T=24,B=38,now=Date.now(),cut=now-30*86400000;
  const x=t=>L+(W-L-R)*((t-cut)/(now-cut)),y=v=>T+(H-T-B)*(1-v/100);
  const grid=[0,25,50,75,100].map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}"/><text x="${L-9}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
  const paths=keys.map(key=>{const m=PRIMARY_PORTRAIT_META[key],pts=primaryPortraitSeries(u,key);if(!pts.length)return '';
    const p=pts.map(d=>`${x(d.date).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
    return `<polyline points="${p}" style="stroke:${m.color}"/>${pts.map(d=>`<circle cx="${x(d.date)}" cy="${y(d.value)}" r="5" style="fill:${m.color}"/><g class="pp-data-label"><rect x="${x(d.date)-15}" y="${y(d.value)-27}" width="30" height="19" rx="9"/><text x="${x(d.date)}" y="${y(d.value)-14}" text-anchor="middle">${d.value}</text></g>`).join('')}`;
  }).join('');
  const has=keys.some(k=>primaryPortraitSeries(u,k).length);
  return `<div class="pp-chart-wrap"><svg class="pp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="近30天心灵状态折线图"><g class="pp-grid">${grid}</g>${paths}<text x="${L}" y="${H-9}" class="pp-axis-date">30天前</text><text x="${W-R}" y="${H-9}" text-anchor="end" class="pp-axis-date">今天</text></svg>${has?'':'<div class="pp-chart-empty">完成对应测评后，这里会出现温柔的成长曲线</div>'}</div>`;
}
function setPrimaryPortraitDim(key){primaryPortraitDim=primaryPortraitDim===key?'all':key;renderPortrait();}
function togglePrimaryLetter(){const el=$('primary-growth-letter');if(!el)return;el.classList.toggle('open');const b=el.querySelector('.pp-letter-btn');if(b)b.textContent=el.classList.contains('open')?'收好信件':'开启信件';}
function renderPrimaryPortrait(view,u){
  const dims=[
    {key:'mood',name:'情绪管理',stars:dimStars(u,'mood')},{key:'stress',name:'压力管理',stars:dimStars(u,'stress')},
    {key:'social',name:'社交能力',stars:dimStars(u,'social')},{key:'family',name:'家庭链接',stars:dimStars(u,'family')}
  ];
  const keys=primaryPortraitDim==='all'?dims.map(d=>d.key):[primaryPortraitDim];
  const best=dims.slice().sort((a,b)=>b.stars-a.stars)[0],weak=dims.slice().sort((a,b)=>a.stars-b.stars)[0];
  const avg=(dims.reduce((n,d)=>n+d.stars,0)/dims.length).toFixed(1);
  const observed=dims.filter(d=>primaryPortraitSeries(u,d.key).length).map(d=>d.name);
  const dataIntro=observed.length?`我认真看过你近30天在${observed.join('、')}方面留下的记录。当前四维平均状态是${avg}星，其中${best.name}是你的闪光力量，${weak.name}值得我们多照顾一点。`:'近30天还没有足够的四维测评记录，这封信先根据你目前留下的成长足迹陪你整理心情。';
  const advice=dataIntro+portraitAdvice(u,dims),recs=(u.records||[]).length,trains=(u.trainings||[]).length,vents=getVents().length;
  const anx=changePct(u,'gad7',true)??changePct(u,'phq9',true),slpRaw=changePct(u,'sleep',false)??changePct(u,'isi7',false),slp=slpRaw==null?null:-slpRaw;
  $('page-portrait').classList.add('kid-portrait');
  view.innerHTML=`<div class="pp-shell">
    <button class="pp-back" onclick="go('home')">← 返回首页</button>
    <div class="pp-profile">${avatarHTML(u,64,'avatar-lg')}<div><span>我的心灵成长册</span><h2>${esc(u.nickname)}同学，看看最近的自己吧</h2><p>已测评 ${recs} 次 · 训练 ${trains} 次 · 倾诉 ${vents} 次</p></div></div>
    <section class="pp-section"><div class="pp-title"><div><span>四维心灵星图</span><h3>近30天心灵变化</h3></div><p>点击维度单独查看，再次点击恢复全部</p></div>
      <div class="pp-dim-buttons">${dims.map(d=>`<button class="${primaryPortraitDim===d.key?'on':''}" onclick="setPrimaryPortraitDim('${d.key}')"><i style="background:${PRIMARY_PORTRAIT_META[d.key].color}"></i>${d.name}<small>${d.stars}/5</small></button>`).join('')}</div>
      <div class="pp-chart-grid"><div>${primaryPortraitChart(u,keys)}<div class="pp-legend">${keys.map(k=>`<span><i style="background:${PRIMARY_PORTRAIT_META[k].color}"></i>${PRIMARY_PORTRAIT_META[k].name}</span>`).join('')}</div></div>
      <aside class="pp-review"><span>综合评定</span><h4>整体心灵状态 ${avg}/5</h4><div><b>闪光优势</b><p>${best.name}是你目前较稳定的力量，继续保持自己的节奏。</p></div><div><b>成长方向</b><p>${weak.name}还有一些提升空间，小小练习也会带来变化。</p></div><div><b>温柔寄语</b><p>${Number(avg)>=4?'最近状态很不错，记得好好珍惜这份轻松。':Number(avg)>=3?'整体状态平稳，偶尔的小波动也很正常。':'最近可能有些辛苦，慢一点并主动求助都没有关系。'}</p></div></aside></div>
    </section>
    <section class="pp-section pp-compare"><div class="pp-title"><div><span>固定记录</span><h3>近30天变化对比</h3></div></div><div class="pp-trends">${trendChip('焦虑',anx,true)}${trendChip('睡眠',slp,false)}<span class="pp-trend-note">数据会随新测评自动更新</span></div></section>
    <section class="pp-section pp-letter-section"><div class="pp-title"><div><span>AI成长寄语</span><h3>一封只写给你的信</h3></div></div><div class="pp-letter" id="primary-growth-letter"><div class="pp-envelope"><div class="pp-envelope-back"></div><div class="pp-paper"><h4>写给【${esc(u.username)}】同学的一封信</h4><p>${advice}</p></div><div class="pp-envelope-front"></div><div class="pp-envelope-flap"></div></div><button class="pp-letter-btn" onclick="togglePrimaryLetter()">开启信件</button></div></section>
    <section class="pp-section pp-footprints"><div class="pp-title"><div><span>成长足迹</span><h3>每一步都值得被看见</h3></div></div><div class="pp-stats"><div><b>${recs}</b><span>测评次数</span></div><div><b>${trains}</b><span>训练次数</span></div><div><b>${vents}</b><span>私密倾诉</span></div></div></section>
  </div>`;
}
function renderPortrait(){
  const view=$('portrait-view');if(!view)return;
  const u=DB.currentUser();if(!u){toast('请先登录');go('login');return;}
  if(isPrimaryStudent(u)){renderPrimaryPortrait(view,u);return;}
  $('page-portrait').classList.remove('kid-portrait');
  const dims=[
    {key:'mood',name:'情绪稳定',stars:dimStars(u,'mood'),hint:'由 PHQ-9 / GAD-7 最近测评换算'},
    {key:'stress',name:'压力管理',stars:dimStars(u,'stress'),hint:'由 PSS-10 最近测评换算'},
    {key:'social',name:'社交能力',stars:dimStars(u,'social'),hint:'由孤独感测评换算'},
    {key:'family',name:'家庭连接',stars:dimStars(u,'family'),hint:'由家庭关系测评换算'}
  ];
  const starHtml=n=>Array.from({length:5},(_,i)=>`<span style="${i<n?'color:#f59e0b;':'color:#e2e8f0;'}">★</span>`).join('');
  const anx=changePct(u,'gad7',true)??changePct(u,'phq9',true);
  const slpRaw=changePct(u,'sleep',false)??changePct(u,'isi7',false);
  const slp=slpRaw==null?null:-slpRaw; /* 睡眠质量：分数降=质量升 → 取反后正=↑ */
  const trendHtml=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px;">
    ${trendChip('焦虑',anx,true)} ${trendChip('睡眠',slp,false)}</div>`;
  const advice=portraitAdvice(u,dims);
  const gradeTip=gradeMatch(u.grade||'');
  const recs=(u.records||[]).length;
  const trains=(u.trainings||[]).length;
  const vents=getVents().length;
  view.innerHTML=`
    <div class="mg-detail-head" style="margin-bottom:14px;">
      ${avatarHTML(u,64,'avatar-lg')}
      <div class="who"><b>${esc(u.nickname)} 的心理画像</b> <span class="role-badge">${esc(ROLE_DEFS[u.role]?ROLE_DEFS[u.role].name:'')}</span>
      <br><span>${u.grade?esc(u.grade)+gradePillHtml(u.grade)+' · ':''}已测评 ${recs} 次 · 训练 ${trains} 次 · 倾诉 ${vents} 次</span></div>
    </div>
    <div class="panel" style="margin:0 0 14px;">
      <div class="panel-title">⭐ 四维心灵星图</div>
      ${dims.map(d=>`<div class="star-row"><span class="sr-name">${d.name}</span><span class="sr-stars">${starHtml(d.stars)}</span><div class="sr-bar"><i style="width:${d.stars/5*100}%"></i></div><span style="font-size:11px;color:#94a3b8;width:170px;">${d.hint}</span></div>`).join('')}
      <p style="font-size:11.5px;color:#94a3b8;margin-top:10px;">星级由最近一次相关测评按国际分界标准换算（5 星=非常健康）。完成对应测评后自动更新。</p>
    </div>
    <div class="panel" style="margin:0 0 14px;">
      <div class="panel-title">📆 近 30 天变化</div>
      ${trendHtml}
      <div style="font-size:13px;color:var(--muted);margin-top:6px;">对比近 30 天内的两次测评：↓ 表示焦虑/睡眠困扰减轻（好转，绿色），↑ 表示加重（需关注）。${gradeTip.greeting}</div>
    </div>
    <div class="panel" style="margin:0 0 14px;">
      <div class="panel-title">💌 AI 成长建议（引导式 · 不评判）</div>
      <div class="advice-box"><div class="ab-title">写给 ${esc(u.nickname)} 的一封信</div>${advice}</div>
    </div>
    <div class="panel" style="margin:0;">
      <div class="panel-title">🌱 我的成长足迹</div>
      <div class="mg-metrics" style="grid-template-columns:repeat(3,1fr);">
        <div class="mg-metric"><div class="m-num">${recs}</div><div class="m-label">测评次数</div></div>
        <div class="mg-metric"><div class="m-num">${trains}</div><div class="m-label">训练次数</div></div>
        <div class="mg-metric"><div class="m-num">${vents}</div><div class="m-label">私密倾诉</div></div>
      </div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:8px;">💡 每完成一次测评或训练，档案都会悄悄更新。建议每 2-4 周复测一次，看着自己的变化，也是一种力量。</div>
    </div>`;
}

let primaryKnowledgeTimer=null;
let primaryKnowledgeIndex=0;
let primaryPointerX=null;
let primaryPetActionTimer=null, primaryPetQuestionTimer=null, primaryPetNibbleTimer=null, primaryPetPlateTimer=null;
let primaryPetPickerPending=false;
const PRIMARY_SNACK_IMAGES=['assets/snack-sausage.png','assets/snack-beef.png','assets/snack-cookie.png'];
const PRIMARY_PET_QUESTIONS=['今天课间最喜欢玩什么游戏？','今天喝了几杯温水？','书包上挂着什么可爱挂件？','中午吃的米饭还是面条？','最喜欢的颜色是哪一种？','放学路上看到了什么小花？','今天有没有给绿植浇水？','最喜欢的水果是草莓还是芒果？','上一节体育课玩了什么项目？','铅笔盒里最常用的笔是什么颜色？','今天有没有帮老师递东西？','窗外飞过几只小鸟？','喜欢晴天还是多云天气？','书包里装了几本课外书？','最喜欢的课间零食是什么？','今天有没有画一幅小画？','同桌借了你什么文具？','风把树叶吹得晃得厉害吗？','最喜欢的卡通角色是谁？','洗手的时候用了香香的肥皂吗？','今天听到了什么好听的声音？','想不想去操场追着泡泡跑？','桌上的小摆件是什么造型？','最喜欢的课间小游戏是跳房子还是踢毽子？','今天的橡皮擦得干净吗？','最喜欢的饮料是橘子水还是柠檬水？','窗外的树叶是什么形状的？','有没有捡到好看的小石子？','上一节美术课画了什么主题？','想不想带着小宠物去楼下草坪逛一圈？'];
function isPrimaryStudent(u){const s=u&&gradeStageOf(u.grade||'');return !!(u&&u.role==='student'&&s&&(s.key==='primary'||s.key==='junior'));}
/* 小学/初中心情日记：演示版封存为本地折叠，不代表内容已加密。 */
let moodCalendarDate=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const moodRevealedDays=new Set();
function moodRecords(){return DB.getData('moodDiary',{});}
function saveMoodRecords(records){DB.setData('moodDiary',records);}
function moodDateKey(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function changeMoodMonth(delta){moodCalendarDate=new Date(moodCalendarDate.getFullYear(),moodCalendarDate.getMonth()+delta,1);renderMoodDiary();}
function renderMoodDiary(){
  const u=DB.currentUser();if(!isPrimaryStudent(u)){go('home');return;}
  const y=moodCalendarDate.getFullYear(),m=moodCalendarDate.getMonth(),records=moodRecords(),today=fmtDay(Date.now());
  $('mood-month-title').textContent=y+' 年 '+(m+1)+' 月';
  const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let html='';
  for(let i=0;i<first;i++)html+='<span class="mood-day spacer"></span>';
  for(let d=1;d<=days;d++){const key=moodDateKey(y,m,d),rec=records[key],cfg=rec&&moodConfig(rec.mood),future=key>today;html+=`<button class="mood-day ${key===today?'today':''} ${rec?'recorded':''}" ${future?'disabled':''} onclick="openMoodDay('${key}')"><b>${d}</b>${cfg?moodIconHTML(cfg)+`<small>${cfg.name}</small>`:''}</button>`;}
  $('mood-calendar').innerHTML=html;
  $('mood-legend').innerHTML=PRIMARY_MOODS.map(x=>`<span>${moodIconHTML(x)}${x.name}</span>`).join('');renderMoodStats(y,m,records);
}
function renderMoodStats(y,m,records){
  const prefix=y+'-'+String(m+1).padStart(2,'0'),list=Object.entries(records).filter(([k])=>k.startsWith(prefix)).map(([,v])=>v),total=list.length,counts=Object.fromEntries(PRIMARY_MOODS.map(x=>[x.id,list.filter(v=>v.mood===x.id).length]));
  $('mood-stats').innerHTML=`<p>本月记录了 <b>${total}</b> 天</p>`+PRIMARY_MOODS.map(x=>{const pct=total?Math.round(counts[x.id]*100/total):0;return `<div class="mood-stat-row"><span>${x.name}</span><div><i style="width:${pct}%;background:${x.color}"></i></div><b>${pct}%</b></div>`;}).join('');
  if(!total){$('mood-month-note').textContent='这个月还没有记录。想写的时候再写，不需要给自己规定任务。';return;}const ordered=PRIMARY_MOODS.slice().sort((a,b)=>counts[b.id]-counts[a.id]),top=ordered.filter(x=>counts[x.id]===counts[ordered[0].id]).slice(0,2).map(x=>'「'+x.name+'」').join('和');$('mood-month-note').textContent=total<4?`这个月你留下了 ${total} 次心情记录。每一次记录都很珍贵，因为你愿意停下来听听自己的感受。`:`这个月你一共记录了 ${total} 天的心情，出现较多的是${top}。每一种心情都值得被看见，谢谢你愿意为自己留下这些记录。`;
}
function dayChats(key){return DB.getData('chat',[]).filter(x=>(x.date||(x.ts?fmtDay(x.ts):''))===key);}
function moodReview(id,hasChat){const texts={happy:'今天你记录了「开心」。谢谢你把这份小快乐留下来，开心的时刻值得被好好收藏。',unhappy:'今天你有一点不开心。愿意把心情记下来，已经是在照顾自己了。明天也可以慢慢来。',anxious:'今天的心情有一点焦虑。你愿意停下来感受它、记录它，这已经是很勇敢的一步。',calm:'今天你感到比较平静。这样安静的时刻也很珍贵，可以把这份舒服收进日记里。',tired:'今天的你有一点疲惫。辛苦啦，休息不是偷懒，而是给自己充充电。'};return (texts[id]||'今天的心情值得被记下来。')+(hasChat?' 你今天愿意和心屿说说话，已经完成了一次温柔的自我照顾。':'');}
function openMoodDay(key,editing){
  const rec=moodRecords()[key],cfg=rec&&moodConfig(rec.mood);if(rec&&!editing){showMoodDetail(key,rec,cfg);return;}const selected=rec&&rec.mood||'';
  openModal(`<div class="mood-editor"><h2>${rec?'修改':'记录'} ${esc(key)} 的心情</h2><p>选一个最接近此刻感受的基础心情。</p><div class="mood-editor-options">${PRIMARY_MOODS.map(x=>`<button data-mood="${x.id}" class="${selected===x.id?'selected':''}" onclick="selectMoodOption(this)">${moodIconHTML(x)}<b>${x.name}</b></button>`).join('')}</div><label>想写下的小心事（可不填）<textarea id="mood-note" rows="4" maxlength="500" placeholder="你可以慢慢写，不用写得很完整。">${esc(rec&&rec.note||'')}</textarea></label><div class="modal-foot"><button class="btn btn-soft" onclick="closeModal()">取消</button><button class="btn btn-teal" onclick="saveMoodDay('${key}')">保存记录</button></div></div>`);
}
function selectMoodOption(btn){btn.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}
function saveMoodDay(key){const btn=document.querySelector('.mood-editor-options button.selected');if(!btn){toast('请先选择一种心情');return;}const records=moodRecords(),old=records[key];records[key]={mood:btn.dataset.mood,note:$('mood-note').value.trim(),createdAt:old&&old.createdAt||Date.now(),updatedAt:Date.now(),isBackfill:key!==fmtDay(Date.now()),archived:old&&old.archived||false};saveMoodRecords(records);closeModal();renderMoodDiary();triggerMoodPet(btn.dataset.mood);maybeAwardMoodTask();toast('今天的小心情已经收好啦');}
function showMoodDetail(key,rec,cfg){
  const chats=dayChats(key),hidden=rec.archived&&!moodRevealedDays.has(key),chatHtml=chats.length?chats.map(x=>`<div class="mood-chat ${x.role==='user'?'user':'bot'}">${esc(x.content)}</div>`).join(''):'<p class="empty">今天还没有留下 AI 疏导记录，想说说的话，可以去找心屿聊聊。</p>';
  openModal(`<div class="mood-detail"><div class="mood-detail-title">${moodIconHTML(cfg)}<span><small>${esc(key)}</small><h2>${cfg.name}</h2></span></div>${hidden?`<div class="mood-archive-box"><b>今天的心事已封存</b><p>演示版本会默认折叠内容；这不是密码加密。</p><button class="btn btn-soft" onclick="revealMoodDay('${key}')">查看已封存内容</button></div>`:`<section><h3>今天的心事</h3><p>${esc(rec.note||'今天没有写下心事。')}</p></section><section><h3>和心屿说过的话</h3><div class="mood-chat-list">${chatHtml}</div></section><section><h3>今日小复盘</h3><p>${esc(moodReview(rec.mood,chats.some(x=>x.role==='user')&&chats.some(x=>x.role==='assistant')))}</p></section>`}<div class="modal-foot"><button class="btn btn-soft" onclick="openMoodDay('${key}',true)">修改或补充</button><button class="btn btn-teal" onclick="toggleMoodArchive('${key}')">${rec.archived?'取消封存':'封存当日心事'}</button></div></div>`);
}
function revealMoodDay(key){const records=moodRecords();moodRevealedDays.add(key);showMoodDetail(key,records[key],moodConfig(records[key].mood));}
function toggleMoodArchive(key){const records=moodRecords();records[key].archived=!records[key].archived;moodRevealedDays.delete(key);saveMoodRecords(records);showMoodDetail(key,records[key],moodConfig(records[key].mood));}
function maybeAwardMoodTask(){const u=DB.currentUser();if(!isPrimaryStudent(u))return;const key=fmtDay(Date.now()),rec=moodRecords()[key],chats=dayChats(key),days=DB.getData('moodRewardDays',[]);if(!rec||days.includes(key)||!chats.some(x=>x.role==='user')||!chats.some(x=>x.role==='assistant'))return;days.push(key);DB.setData('moodRewardDays',days);awardPetForTask('今日心情任务');}
function triggerMoodPet(id){const root=$('primary-pet-widget'),cfg=moodConfig(id);if(!root||!cfg)return;root.classList.remove('mood-happy','mood-comfort','mood-calm','mood-rest');void root.offsetWidth;root.classList.add('mood-'+cfg.animation);setTimeout(()=>root.classList.remove('mood-'+cfg.animation),1800);}
function primaryPet(){
  const d=DB.getData('primaryPet',null);const now=new Date();const month=now.getFullYear()+'-'+now.getMonth();
  if(!d)return {type:'',hunger:0,month,interactions:0,questions:[],unlocked:[],plate:[],taskCount:0,lastQuiz:0};
  if(d.month!==month){d.hunger=0;d.month=month;d.unlocked=[];d.snacks=[];d.plate=[];d.taskCount=0;}
  if(!Array.isArray(d.unlocked))d.unlocked=Array.from({length:Math.min(3,(d.snacks||[]).length)},(_,i)=>i);
  d.plate=(d.plate||[]).map(x=>typeof x==='number'?{i:x,expiresAt:Date.now()+1800000}:x).filter(x=>x&&PRIMARY_SNACK_IMAGES[x.i]);
  const expired=d.plate.filter(x=>x.expiresAt<=Date.now()).length;
  if(expired){d.plate=d.plate.filter(x=>x.expiresAt>Date.now());d.hunger=Math.min(100,(d.hunger||0)+expired*50);}
  DB.setData('primaryPet',d);return d;
}
function savePrimaryPet(d){DB.setData('primaryPet',d);}
function openPrimaryPetPicker(){
  const d=primaryPet();
  openModal(`<div class="pet-picker"><span class="pet-spark">✦ 欢迎来到心灵小岛 ✦</span><h2>选一位小伙伴陪你吧</h2><p>它会住在屏幕角落，安静地陪你探索今天的心情。</p><div class="pet-choices"><button class="pet-choice ${d.type==='cat'?'selected':''}" onclick="choosePrimaryPet('cat')"><img class="pet-character pet-emoji" src="assets/pet-cat.png" alt="橘白三花小猫全身形象"><b>橘纹小猫</b><small>圆眼睛 · 喜欢晒太阳</small></button><button class="pet-choice ${d.type==='dog'?'selected':''}" onclick="choosePrimaryPet('dog')"><img class="pet-character pet-emoji" src="assets/pet-dog.png" alt="橘白柯基小狗全身形象"><b>垂耳小狗</b><small>软绒毛 · 喜欢摇尾巴</small></button></div><button class="btn btn-teal" style="width:100%;margin-top:16px;" onclick="confirmPrimaryPet()">带它回家</button></div>`);
}
function choosePrimaryPet(type){const d=primaryPet();d.type=type;savePrimaryPet(d);openPrimaryPetPicker();}
function confirmPrimaryPet(){if(!primaryPet().type){toast('请先选一位小伙伴');return;}closeModal();renderPrimaryPetWidget();}
function primaryPetSnack(){return ['迷你鸡肉香肠','欧芹牛肉干','奶味小饼干'][Math.floor(Math.random()*3)];}
function primarySnackImg(i,extraClass=''){return `<img class="pet-snack-img ${extraClass}" src="${PRIMARY_SNACK_IMAGES[i]}" alt="${['迷你鸡肉香肠','小块牛肉干','奶味小饼干'][i]}">`;}
function schedulePrimaryPetAction(root){
  clearTimeout(primaryPetActionTimer);
  primaryPetActionTimer=setTimeout(()=>{
    if(!root||!root.isConnected)return;
    const actions=['','', '', 'pet-look','pet-wave','pet-stretch','pet-yawn','pet-sway'];
    const action=actions[Math.floor(Math.random()*actions.length)];
    if(action)root.classList.add(action);
    setTimeout(()=>{if(root&&root.isConnected){if(action)root.classList.remove(action);schedulePrimaryPetAction(root);}},1200);
  },3000+Math.random()*3000);
}
function awardPetForTask(source){
  const u=DB.currentUser();if(!isPrimaryStudent(u))return;const d=primaryPet();if(!d.type)return;
  d.taskCount=(d.taskCount||0)+1;const locked=[0,1,2].filter(i=>!d.unlocked.includes(i));
  if(!locked.length){
    savePrimaryPet(d);renderPrimaryPetWidget();
    if(source==='测评中心')setTimeout(()=>openModal(`<div class="pet-unlock-modal"><span>测评完成</span><img class="quiz-happy-pet" src="assets/pet-${d.type}.png" alt="开心的小伙伴"><h2>谢谢你认真完成测评</h2><p class="quiz-kind-words">你愿意了解自己的心情，这本身就是很棒的成长。零食库存已经装满，投喂后再完成任务还能继续获得。</p><button class="btn btn-teal" onclick="showPrimaryPetPanel()">看看小伙伴</button></div>`),120);else toast('任务完成，零食库存已经装满，投喂后可继续获取');
    return;
  }
  const i=locked[Math.floor(Math.random()*locked.length)];d.unlocked.push(i);savePrimaryPet(d);renderPrimaryPetWidget();
  const quizHappy=source==='测评中心'?`<img class="quiz-happy-pet" src="assets/pet-${d.type}.png" alt="开心的小伙伴"><p class="quiz-kind-words">谢谢你认真听见自己的心情，完成测评就是一次很棒的自我照顾。</p>`:'';
  const moodTask=source==='今日心情任务';
  setTimeout(()=>openModal(`<div class="pet-unlock-modal"><span>${moodTask?'今日心情任务完成啦！':'任务完成 · '+source}</span>${quizHappy}${primarySnackImg(i,'unlock-snack')}<h2>${moodTask?'随机解锁一款小零食':'成功解锁一款零食'}</h2><p>${moodTask?'你记录了今天的心情，也愿意和 AI 伙伴说说话。谢谢你认真照顾自己的小情绪。':(['迷你鸡肉香肠','小块牛肉干','奶味小饼干'][i]+'已经放进零食柜，点击卡片就能投喂。')}</p><button class="btn btn-teal" onclick="showPrimaryPetPanel()">去投喂</button></div>`),120);
}
function awardPetForQuiz(){awardPetForTask('测评中心');}
function completePrimaryTask(type,taskId,source){
  const u=DB.currentUser();if(!isPrimaryStudent(u)||!taskId)return false;
  const ledger=DB.getData('primaryTaskRewards',{}),key=type+':'+taskId;
  if(ledger[key])return false;
  ledger[key]={type,taskId,source,completedAt:Date.now(),rewarded:true,rewardedAt:Date.now()};
  DB.setData('primaryTaskRewards',ledger);awardPetForTask(source);return true;
}
function consumePrimaryPlate(){
  const p=primaryPet();if(!p.plate.length)return;p.plate.shift();p.hunger=Math.min(100,(p.hunger||0)+50);savePrimaryPet(p);renderPrimaryPetWidget();
  if($('modal-mask').classList.contains('show'))showPrimaryPetPanel();
  toast(p.hunger>=100?'小伙伴吃下两份零食，已经完全吃饱啦':'小伙伴吃下一份零食，饱腹度达到一半');
  clearTimeout(primaryPetNibbleTimer);if(p.plate.length)primaryPetNibbleTimer=setTimeout(consumePrimaryPlate,6500);
}
function feedPrimarySnack(i){
  const d=primaryPet();if(!d.type||!d.unlocked.includes(i))return;
  if(d.plate.some(x=>x.i===i)){toast('餐盘里已经有这款零食啦，换一种试试吧');return;}
  d.unlocked=d.unlocked.filter(x=>x!==i);
  d.plate.push({i,expiresAt:Date.now()+1800000});savePrimaryPet(d);renderPrimaryPetWidget();showPrimaryPetPanel();toast('零食已放入餐盘并从库存消耗，30分钟内有效');
  clearTimeout(primaryPetNibbleTimer);primaryPetNibbleTimer=setTimeout(consumePrimaryPlate,6500);
}
function renderPrimaryPetWidget(){
  const root=$('primary-pet-widget');if(!root)return;const d=primaryPet();const hungry=d.hunger<30;const full=d.hunger>=100;const type=d.type==='dog'?'dog':'cat';
  root.className='primary-pet-widget '+type+' '+(hungry?'hungry ':'')+(full?'full ':'')+(d.plate.length?'eating':'');root.innerHTML=`<button class="pet-bubble" onclick="showPrimaryPetQuestion()">${hungry?'我有一点饿啦…':'和我聊个小问题吧'} <span>♥</span></button><div class="pet-body" onclick="showPrimaryPetPanel()"><img class="pet-character pet-face" src="assets/pet-${type}.png" alt="${type==='dog'?'橘白柯基小狗':'橘白三花小猫'}全身形象"><span class="pet-action-mark" aria-hidden="true">♪</span></div><div class="pet-pad"></div><div class="pet-plate">${d.plate.map(x=>primarySnackImg(x.i,'plate-snack')).join('')||'<span>空盘</span>'}</div><div class="pet-meter"><div class="pet-meter-top"><span>饱腹度 · 吃满2份</span><b>${full?'已吃饱':d.hunger+'%'}</b></div><div class="pet-meter-bar"><i style="width:${d.hunger}%"></i></div></div>`;
  if(d.type)schedulePrimaryPetAction(root);
  clearTimeout(primaryPetPlateTimer);if(d.plate.length)primaryPetPlateTimer=setTimeout(renderPrimaryPetWidget,Math.max(500,Math.min(...d.plate.map(x=>x.expiresAt-Date.now()))));
  clearTimeout(primaryPetQuestionTimer);primaryPetQuestionTimer=setTimeout(showPrimaryPetQuestion,20000+Math.random()*40000);
}
function showPrimaryPetQuestion(){const d=primaryPet();if(!d.type)return;const q=PRIMARY_PET_QUESTIONS[Math.floor(Math.random()*PRIMARY_PET_QUESTIONS.length)];d.questions=(d.questions||[]).concat({q,ts:Date.now()}).slice(-30);d.interactions=(d.interactions||0)+1;savePrimaryPet(d);const bubble=$('primary-pet-question');if(bubble){bubble.innerHTML=`<span>💭</span>${q}<button onclick="this.parentElement.remove()" aria-label="关闭">×</button>`;bubble.classList.add('show');setTimeout(()=>bubble.classList.remove('show'),10000);}renderPrimaryPetWidget();}
function showPrimaryPetPanel(){const d=primaryPet();openModal(`<div class="pet-panel"><h2>${d.type==='dog'?'🐶 橘白柯基小狗':'🐱 橘白三花小猫'}的小窝</h2><div class="pet-panel-meter"><b>饱腹度 ${d.hunger}% · ${d.hunger<100?'还需吃下'+(d.hunger?1:2)+'份':'已经完全吃饱'}</b><div class="pet-meter-bar"><i style="width:${d.hunger}%"></i></div></div><div class="pet-panel-plate"><b>专属小餐盘</b><span>${d.plate.map(x=>primarySnackImg(x.i,'panel-plate-snack')).join('')||'空盘子，等一份小零食'}</span></div><p>点击已解锁卡片即可放入餐盘。食物最多保留30分钟；吃完或到期后，每份增加50%饱腹度。</p><div class="pet-snacks">${['迷你鸡肉肠','小块牛肉干','奶味小饼干'].map((x,i)=>{const on=d.unlocked.includes(i);return `<button class="pet-snack-card ${on?'unlocked':'locked'}" ${on?'onclick="feedPrimarySnack('+i+')"':''}>${primarySnackImg(i,'snack-option')}<b>${x}</b><small>${on?'点击放入餐盘':'未解锁'}</small></button>`;}).join('')}</div><button class="btn btn-soft" onclick="openPrimaryPetPicker()">更换小伙伴</button></div>`);}
function openPrimaryFamily(){
  openModal('<h2 style="margin-bottom:12px;">家庭连接</h2><div id="primary-family-box"></div>');
  renderFamilyCodeBox('primary-family-box');
}
function primarySlideStart(e){stopPrimaryKnowledge();primaryPointerX=e.clientX;}
function primarySlideEnd(e){
  if(primaryPointerX==null)return;
  const dx=e.clientX-primaryPointerX;primaryPointerX=null;
  if(Math.abs(dx)>45)movePrimaryKnowledge(dx<0?1:-1,true);
}
function primaryFeatureArt(type){
  const arts={
    family:'<div class="ph-art ph-family"><span>🧑‍🧒</span><i>♥</i></div>',
    test:'<div class="ph-art ph-test"><span>📝</span><i>⭐✓</i></div>',
    chat:'<div class="ph-art ph-chat"><span>☁️</span><i>🏮</i></div>',
    train:'<div class="ph-art ph-train"><span>🌼</span><i>🪜</i></div>',
    tree:'<div class="ph-art ph-tree"><span>🌳</span><i>◌ ◌</i></div>'
  };
  return arts[type]||'';
}
function renderPrimaryHome(u){
  const root=$('primary-home');if(!root)return;
  const cards=[
    ['family','家庭连接','同步孩子的心情状态，和孩子一起守护小情绪',"openPrimaryFamily()",'去看看'],
    ['test','测评中心','完成趣味小测评，解锁简约新装扮或小份虚拟零食，收获今日心情小惊喜',"go('scales')",'开始小测评'],
    ['chat','AI 疏导','找你的专属伙伴说说心里话，轻轻倾诉，让不开心慢慢变轻松',"go('chat')",'找伙伴聊聊'],
    ['train','自助训练','跟着一步步小练习，慢慢攒起面对小情绪的超能力',"go('train')",'开始小练习'],
    ['tree','心屿树洞','把想说的话写成一封信，轻轻投进树洞里',"go('community')",'去投一封信']
  ];
  const knowledge=[
    ['alarm','焦虑不全是坏事','适度的焦虑是身体的报警器','⏰'],
    ['rainbow','情绪没有对错','开心、难过、生气和害怕，都在告诉我们心里发生了什么','🌈'],
    ['sleep','睡不着时试试 333 法则','看看 3 样东西，听听 3 种声音，再轻轻动动身体的 3 个地方','🛏️'],
    ['delay','拖延不是懒','有时候不是不想做，而是不知道从哪里开始。先完成最小的一步就好','📚'],
    ['help','什么时候该求救','如果难过、害怕或睡不好持续了很久，记得告诉家长、老师或信任的大人','🙋']
  ];
  root.innerHTML=`
    <section class="ph-hero">
      <div class="ph-hero-copy"><span class="ph-kicker">欢迎来到心灵小岛</span><h1>你好，${esc(u.nickname||'小伙伴')}，欢迎回到心屿</h1><p>今天的心情是什么颜色？一起走进心灵小岛看看吧。</p><div class="ph-actions"><button onclick="go('scales')">✨ 开始今天的心情探索</button><button class="soft" onclick="go('chat')">☁️ 找伙伴聊一聊</button></div></div>
      <div class="mind-island" aria-label="嫩绿色草地、野花、蘑菇和蓝色水波组成的心灵小岛插画"><span class="cloud c1">☁</span><span class="cloud c2">☁</span><span class="bubble b1"></span><span class="bubble b2"></span><div class="water"><div class="island"><span class="flower f1">✿</span><span class="flower f2">✿</span><span class="mushroom m1">🍄</span><span class="mushroom m2">🍄</span><span class="island-heart">♥</span></div></div></div>
    </section>
    <section class="ph-section"><div class="ph-heading"><div><span>探索小岛</span><h2>今天想先做什么？</h2></div><p>每一小步，都在认真照顾自己的心情。</p></div><div class="ph-feature-grid">${cards.map((c,i)=>`<article class="ph-feature ph-${c[0]}" tabindex="0" onclick="${c[3]}" onkeydown="if(event.key==='Enter')${c[3]}">${primaryFeatureArt(c[0])}<div class="ph-feature-copy"><span class="ph-number">0${i+1}</span><h3>${c[1]}</h3><p>${c[2]}</p><button onclick="event.stopPropagation();${c[3]}">${c[4]} →</button></div></article>`).join('')}</div></section>
    <section class="ph-section ph-knowledge"><div class="ph-heading"><div><span>心理科普知识</span><h2>心情小百科</h2></div><div class="ph-slider-controls"><button aria-label="上一张" onclick="movePrimaryKnowledge(-1,true)">‹</button><span id="ph-slide-count">1 / 5</span><button aria-label="下一张" onclick="movePrimaryKnowledge(1,true)">›</button></div></div><div class="ph-slider" id="ph-slider" onpointerdown="primarySlideStart(event)" onpointerup="primarySlideEnd(event)" onpointercancel="primaryPointerX=null"><div class="ph-track" id="ph-track">${knowledge.map((k,i)=>`<article class="ph-knowledge-card ${k[0]}"><div class="ph-knowledge-art"><span>${k[3]}</span>${k[0]==='sleep'?'<i>🌙　🥛</i>':k[0]==='delay'?'<i>🥐　🧸</i>':k[0]==='help'?'<i>❔　🤲</i>':''}</div><div><span class="ph-card-no">0${i+1}</span><h3>${k[1]}</h3><p>${k[2]}</p>${k[0]==='help'?'<button onclick="go(\'chat\')">告诉信任的大人</button>':''}</div></article>`).join('')}</div></div><div class="ph-dots" id="ph-dots">${knowledge.map((_,i)=>`<button aria-label="查看第 ${i+1} 张" onclick="setPrimaryKnowledge(${i},true)" class="${i===0?'on':''}"></button>`).join('')}</div></section>`;
  root.insertAdjacentHTML('beforeend','<div id="primary-pet-widget" class="primary-pet-widget"></div><div id="primary-pet-question" class="primary-pet-question"></div>');
  renderPrimaryPetWidget();
  if(!primaryPet().type&&!primaryPetPickerPending){primaryPetPickerPending=true;setTimeout(()=>{primaryPetPickerPending=false;if(!primaryPet().type)openPrimaryPetPicker();},180);}
  setPrimaryKnowledge(0,false);
  startPrimaryKnowledge();
}
function setPrimaryKnowledge(i,manual){
  const track=$('ph-track');if(!track)return;
  primaryKnowledgeIndex=Math.max(0,Math.min(4,i));
  track.style.transform='translateX(-'+(primaryKnowledgeIndex*100)+'%)';
  if($('ph-slide-count'))$('ph-slide-count').textContent=(primaryKnowledgeIndex+1)+' / 5';
  document.querySelectorAll('#ph-dots button').forEach((b,n)=>b.classList.toggle('on',n===primaryKnowledgeIndex));
  if(manual)stopPrimaryKnowledge();
}
function movePrimaryKnowledge(delta,manual){setPrimaryKnowledge(primaryKnowledgeIndex+delta,manual);}
function stopPrimaryKnowledge(){clearInterval(primaryKnowledgeTimer);primaryKnowledgeTimer=null;}
function startPrimaryKnowledge(){
  stopPrimaryKnowledge();
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  primaryKnowledgeTimer=setInterval(()=>{if(primaryKnowledgeIndex>=4){stopPrimaryKnowledge();return;}setPrimaryKnowledge(primaryKnowledgeIndex+1,false);},5000);
}
function renderHome(){
  const u=DB.currentUser();if(!u)return;
  const home=$('page-home');
  const stage=gradeStageOf(u.grade||'');
  const isKid=!!stage&&(stage.key==='primary'||stage.key==='junior')&&u.role==='student';
  document.body.classList.toggle('primary-theme',isKid);
  home.classList.toggle('kid-stage-home',isKid);
  $('primary-home').style.display=isKid?'block':'none';
  $('standard-home').style.display=isKid?'none':'block';
  if(isKid){renderPrimaryHome(u);return;}else stopPrimaryKnowledge();
  const role=u.role||'';
  const greet=$('home-greet');
  const heroP=document.querySelector('#page-home .hero p');
  const grid=document.querySelector('#page-home .grid4');
  const statusPanel=$('home-status');
  const knowPanel=$('home-knowledge');
  if(role==='student'||role==='normal'||!role){
    greet.textContent='你好，'+u.nickname+'，欢迎回到心屿'+(ROLE_DEFS[role]?' · '+ROLE_DEFS[role].name:'');
    if(heroP)heroP.textContent='你的 AI 心理守护平台：测一测 → AI 分级支持 → 专属训练 → 树洞倾诉。今天也要好好照顾自己。💙';
    renderHeroCta(role);
    const flip=$('flip-nav');
    if(flip){flip.style.display='';}
    renderStatusCard();
    renderFlipNav();
    if(grid)grid.style.display='none';
    if(knowPanel)knowPanel.style.display='';
    if($('home-family')){const hf=$('home-family');hf.style.display='';hf.innerHTML='<div id="family-code-home"></div>';renderFamilyCodeBox('family-code-home');}
    const recs=(u.records||[]).slice(-3).reverse();
    if(recs.length){
      statusPanel.style.display='block';
      $('home-status-body').innerHTML=recs.map(r=>{
        const s=SCALES.find(x=>x.id===r.scaleId);
        if(!s)return'';
        const lv=getLevel(s,r.total);
        return `<div class="history-item"><span>${s.name} · ${fmtDay(r.date)}</span><span class="h-score ${lv.cls==='mild'?'good':lv.cls==='moderate'?'mid':'bad'}">${r.total}/${s.max} · ${lv.label}</span></div>`;
      }).join('');
    }else{statusPanel.style.display='none';}
    return;
  }
  if(knowPanel)knowPanel.style.display='none';
  if(statusPanel)statusPanel.style.display='none';
  const roleCard={
    school_admin:{icon:'🏫',title:'学校心理健康趋势分析',desc:'查看本校学生整体心理状态、年级变化与重点关注方向（脱敏聚合，无法查看私人聊天与树洞内容）。',acts:[['go(\'school-trend\')','趋势分析','📈','整体状态分布与量表平均分'],['go(\'school-grade\')','年级分析','🎓','各年级需关注人数占比'],['go(\'school-focus\')','重点关注与转介','🧭','高危人群与风险台账'],['go(\'school-privacy\')','隐私说明','🔒','脱敏口径说明'],['go(\'courses\')','课程资源库','📚','互联网公开心理课程']]},
    parent:{icon:'👨‍👩‍👧',title:'和孩子一起成长',desc:'了解孩子的心理变化、学习科学沟通方式、每天一个小互动，让家成为情绪的避风港。',acts:[['go(\'child\')','孩子心理变化','📈','测评趋势与最近结果'],['go(\'edu\')','沟通课堂','📚','科学沟通课程与家长交流区'],['go(\'family\')','家庭互动','🏡','每日互动打卡'],['openBindChild()','绑定孩子','🔗','邀请码绑定或更换孩子'],['go(\'courses\')','课程资源库','📚','家庭教育公开资源']]},
    community_admin:{icon:'🏘️',title:'区域心理健康服务',desc:'查看本区域脱敏心理概览，连接心理老师、专业机构与公益服务，跟进转介闭环。',acts:[['go(\'manage\')','区域概览','📊','脱敏聚合概览与人员状态'],['go(\'resources\')','资源连接','🤝','资源目录与登记'],['go(\'referrals\')','转介记录','📋','转介跟进闭环'],['go(\'courses\')','课程资源库','📚','公开心理课程'],['openPrivacyModal()','隐私说明','🔒','脱敏口径说明']]}
  }[role];
  if(roleCard){
    greet.textContent='你好，'+u.nickname+'，欢迎回来'+(ROLE_DEFS[role]?' · '+ROLE_DEFS[role].name:'');
    if(heroP)heroP.textContent=roleCard.desc;
    renderHeroCta(role);
    if(grid){grid.style.display='';grid.innerHTML=roleCard.acts.map(a=>`<div class="feat-card" onclick="${a[0]}"><div class="ico i-comm">${a[2]}</div><h3>${a[1]}</h3><p>${a[3]}</p></div>`).join('');}
    if($('home-family'))$('home-family').style.display='none';
  }
  /* v4.1：家长/学校/社区管理员首页按各自模块铺开内容 */
  renderRoleHomeContent(role);
}
function renderRoleHomeContent(role){
  const old=$('role-home-content');if(old)old.remove();
  const wrap=document.createElement('div');wrap.id='role-home-content';
  let html='';
  if(role==='school_admin')html=schoolHomeHtml();
  else if(role==='parent')html=parentHomeHtml();
  else if(role==='community_admin')html=communityHomeHtml();
  if(!html)return;
  wrap.innerHTML=html;
  const anchor=document.querySelector('#page-home .hero');
  if(anchor)anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
}
/* 学校管理员首页：指标 + 重点关注 + 年级占比 + 台账动态 */
function schoolHomeHtml(){
  const persons=schoolPersons();
  const recsCount=persons.reduce((s,p)=>s+(p.records||[]).length,0);
  const trainCount=persons.reduce((s,p)=>s+(p.trainings||[]).length,0);
  const ledger=ledgerForAdmin(DB.currentUser());
  const dist={mild:0,moderate:0,severe:0,none:0};
  persons.forEach(p=>{const l=latestRecord(p);if(!l){dist.none++;return;}dist[l.cls]=(dist[l.cls]||0)+1;});
  const focus=persons.filter(p=>{const l=latestRecord(p);return l&&(l.cls==='moderate'||l.cls==='severe');});
  const focusHtml=focus.slice(0,3).map(p=>{const l=latestRecord(p);return `<div class="history-item"><span><b>${esc(p.nickname)}</b> <span style="font-size:11px;color:#94a3b8;">@${esc(p.username)}</span>${p.grade?gradePillHtml(p.grade):''}</span><span class="h-score ${l.cls==='mild'?'good':l.cls==='moderate'?'mid':'bad'}">${esc(l.level)}</span><button class="back-btn" style="color:var(--teal);border-color:var(--teal);" onclick="go('school-focus')">处理</button></div>`;}).join('')||'<div class="empty">暂无重点关注对象 🎉</div>';
  const gradeAgg={};
  persons.forEach(p=>{const st=gradeStageOf(p.grade||'');const g=st?st.name:(p.grade?'其他':'未填写');gradeAgg[g]=gradeAgg[g]||{n:0,risk:0};gradeAgg[g].n++;const l=latestRecord(p);if(l&&(l.cls==='moderate'||l.cls==='severe'))gradeAgg[g].risk++;});
  const gradeRows=Object.entries(gradeAgg).filter(([,d])=>d.n>0).sort((a,b)=>(b[1].risk/b[1].n)-(a[1].risk/a[1].n)).slice(0,4).map(([g,d])=>{const pct=Math.round(d.risk/d.n*100);return `<div class="mg-bar-row"><span class="lb">${esc(g)}</span><div class="bar"><i style="width:${pct}%;background:${pct>40?'#dc2626':pct>20?'#d97706':'#14b8a6'};min-width:${d.risk?6:0}px;"></i></div><span class="num">${d.risk}/${d.n} 人</span></div>`;}).join('')||'<div class="empty">暂无数据</div>';
  /* 整体状态分布 + 各量表平均分预览 */
  const distBars=[['良好/轻度',dist.mild,'#14b8a6'],['中度关注',dist.moderate,'#d97706'],['高度关注',dist.severe,'#dc2626'],['未测评',dist.none,'#94a3b8']].map(b=>{const pct=persons.length?Math.round(b[1]/persons.length*100):0;return `<div class="mg-bar-row"><span class="lb">${b[0]}</span><div class="bar"><i style="width:${pct}%;background:${b[2]};min-width:${b[1]?6:0}px;"></i></div><span class="num">${b[1]} 人</span></div>`;}).join('');
  const agg=schoolScaleAgg(persons);
  const avgBars=SCALES.map(s=>{const a=agg[s.id];return {name:s.name,avg:a.n?a.sum/a.n:0,max:s.max,n:a.n};}).filter(b=>b.n>0).slice(0,5).map(b=>{const pct=b.avg/b.max*100;const col=pct>66?'#dc2626':pct>33?'#d97706':'#0e7490';return `<div class="mg-bar-row"><span class="lb">${esc(b.name)}</span><div class="bar"><i style="width:${Math.round(pct)}%;background:${col};"></i></div><span class="num">${b.avg.toFixed(1)} / ${b.max}</span></div>`;}).join('')||'<div class="empty">暂无测评数据</div>';
  return `
  <div class="mg-metrics">
    <div class="mg-metric"><div class="m-num">${persons.length}</div><div class="m-label">覆盖学生数</div></div>
    <div class="mg-metric"><div class="m-num">${recsCount}</div><div class="m-label">测评总次数</div></div>
    <div class="mg-metric warn"><div class="m-num">${dist.moderate+dist.severe}</div><div class="m-label">需关注人数</div></div>
    <div class="mg-metric"><div class="m-num">${trainCount}</div><div class="m-label">训练总次数</div></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">🧭 整体状态分布</div>${distBars}<button class="t-btn" style="margin-top:8px;" onclick="go('school-trend')">趋势分析 →</button></div>
    <div class="panel" style="margin:0;"><div class="panel-title">📈 各量表平均分（前 5）</div>${avgBars}<button class="t-btn" style="margin-top:8px;" onclick="go('school-trend')">全部量表 →</button></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">🧭 重点关注（${focus.length} 人）</div>${focusHtml}<button class="t-btn" style="margin-top:8px;" onclick="go('school-focus')">名单与台账 →</button></div>
    <div class="panel" style="margin:0;"><div class="panel-title">🎓 年级需关注占比（Top4）</div>${gradeRows}<button class="t-btn" style="margin-top:8px;" onclick="go('school-grade')">年级分析 →</button></div>
  </div>
  <div class="panel"><div class="panel-title">📒 风险台账最新动态（${ledger.length} 条）</div>${ledgerItemsHtml(ledger.slice(0,3),false)}<button class="t-btn" style="margin-top:8px;" onclick="go('school-focus')">查看全部台账 →</button></div>`;
}
/* 家长首页：孩子状态 + 互动打卡 + 沟通课堂 + 家长交流区 */
function parentHomeHtml(){
  const child=boundChild();
  const logs=getFamilyLog();
  const today=fmtDay(Date.now());
  const todayCount=logs.filter(l=>fmtDay(l.date)===today).length;
  const photos=getFamilyPhotos().length;
  const chat=getParentChat();
  const actsHtml=[...FAMILY_ACTIONS.map((a,i)=>({...a,idx:i})),...getFamilyCustom().map((a,i)=>({...a,idx:'c'+i}))].slice(0,3).map(a=>{const done=logs.find(l=>String(l.idx)===String(a.idx)&&fmtDay(l.date)===today);return `<div class="fam-item ${done?'done':''}"><span class="fi-ico">${a.ico}</span><div><b>${a.t}</b></div>${done?'<span style="color:#16a34a;font-size:12px;">✅ 今日已完成</span>':''}</div>`;}).join('')||'<div class="empty">还没有互动行动</div>';
  const eduMini=EDU_CARDS.slice(0,3).map((c,i)=>`<div class="history-item"><span>${i+1}. ${c.t}</span><span style="font-size:11px;color:#94a3b8;">${c.sum}</span></div>`).join('');
  const chatLatest=chat.slice(0,2).map(x=>`<div class="post" style="padding:12px;"><div class="p-head"><span class="p-name">${esc(x.author)}</span>${x.system?'<span class="p-sys">✦ 心屿示例</span>':'<span class="p-anon">匿名</span>'}<span class="p-time">${fmtDay(x.date)}</span></div><div class="p-text" style="font-size:13px;">${esc(x.text.slice(0,60))}${x.text.length>60?'…':''}</div></div>`).join('')||'<div class="empty">交流区还没有内容</div>';
  const childCard=child?`<div class="status-card" style="background:linear-gradient(135deg,#f0fdfa,#e0f2fe);border-color:#a5f3fc;">
    <span class="sc-emoji">👧</span>
    <div class="sc-greet">${esc(child.nickname)} 的近期状态<small>${child.grade?esc(child.grade):''} · 最近测评 ${latestRecord(child)?fmtDay(latestRecord(child).date):'暂无'}</small></div>
    <div class="sc-body">
      <div class="sc-item"><div class="si-label">😊 情绪</div><div class="si-value">${(()=>{const l=latestRecord(child);return l?(l.cls==='mild'?'正常':l.cls==='moderate'?'略有波动':'需要关注'):'暂无数据';})()}</div><div class="si-note">${latestRecord(child)?esc((SCALES.find(s=>s.id===latestRecord(child).scaleId)||{}).name||'')+' '+latestRecord(child).total+'分':'完成测评后可见'}</div></div>
      <div class="sc-item"><div class="si-label">📚 压力</div><div class="si-value">${(()=>{const l=latestRecord(child);return l&&(l.cls==='moderate'||l.cls==='severe')?'略高':'平稳';})()}</div><div class="si-note">建议多倾听、少评判</div></div>
      <div class="sc-item"><div class="si-label">💬 互动</div><div class="si-value">${(child.trainings||[]).length} 次训练</div><div class="si-note">坚持陪伴就是最好的支持</div></div>
    </div>
    <div class="sc-recs">
      <button class="sc-rec" onclick="go('child')">📈 查看详情</button>
      <button class="sc-rec" onclick="go('edu')">📚 学习沟通方法</button>
      <button class="sc-rec" onclick="go('family')">🏡 家庭互动打卡</button>
    </div>
  </div>`:`<div class="panel" style="background:#fff7ed;border-color:#fed7aa;"><div class="panel-title">👨‍👩‍👧 还没有绑定孩子</div><p style="font-size:13px;color:var(--muted);margin-bottom:10px;">用孩子发给你的家庭邀请码绑定，即可查看孩子的心理状态变化、学习科学沟通方法。</p><button class="btn btn-teal" onclick="openBindChild()">去绑定孩子</button></div>`;
  const adviceLine=child&&latestRecord(child)?`<div class="suggest-long" style="margin-bottom:14px;padding:12px 16px;font-size:13px;"><b>💌 给家长的一句话建议：</b>${(()=>{const l=latestRecord(child);if(l.cls==='severe'||l.cls==='moderate')return '孩子最近测评达到「'+esc(l.level)+'」，此刻最需要的不是道理而是被看见——每天留出 15 分钟只属于你们的时间，多听少说；若这样的状态持续超过两周，请及时联系学校心理老师或拨打 12356。';return '孩子最近状态整体平稳，平稳也需要用心维护：每周安排一次全家活动，多留意孩子主动分享的时刻，那正是信任的信号。';})()}</div>`:'';
  return childCard+adviceLine+`
  <div class="mg-metrics">
    <div class="mg-metric"><div class="m-num">${logs.length}</div><div class="m-label">累计互动打卡</div></div>
    <div class="mg-metric"><div class="m-num">${todayCount}</div><div class="m-label">今日打卡</div></div>
    <div class="mg-metric"><div class="m-num">${photos}</div><div class="m-label">相册照片</div></div>
    <div class="mg-metric"><div class="m-num">${EDU_CARDS.length}</div><div class="m-label">沟通课堂</div></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">🏡 今日家庭互动</div>${actsHtml}<button class="t-btn" style="margin-top:8px;" onclick="go('family')">全部行动与打卡 →</button></div>
    <div class="panel" style="margin:0;"><div class="panel-title">📚 沟通课堂速览</div>${eduMini}<button class="t-btn" style="margin-top:8px;" onclick="go('edu')">进入课堂 →</button></div>
  </div>
  <div class="panel"><div class="panel-title">💬 家长悄悄话 · 最新讨论</div>${chatLatest}<button class="t-btn" style="margin-top:8px;" onclick="go('edu')">去交流区 →</button></div>`;
}
/* 社区管理员首页：区域指标 + 资源 + 转介 + 台账 */
function communityHomeHtml(){
  const u=DB.currentUser();
  const persons=managePersons();
  const res=getResources();
  const refs=getReferrals();
  const ledger=ledgerForAdmin(u);
  const risk=persons.filter(p=>{const l=latestRecord(p);return l&&(l.cls==='moderate'||l.cls==='severe');}).length;
  const resHtml=[...DEFAULT_RESOURCES,...res].slice(0,4).map(r=>`<div class="res-card" style="padding:10px 12px;"><span class="r-type">${esc(r.type)}</span><h4 style="font-size:13px;">${esc(r.name)}</h4><p style="font-size:11.5px;">${esc(r.contact)}</p></div>`).join('')||'<div class="empty">暂无资源</div>';
  const refHtml=refs.slice(0,3).map(r=>`<div class="history-item"><span>${esc(r.nickname)} → ${esc(r.resource)}</span><span class="ref-status ${r.status==='done'?'done':r.status==='contacted'?'contacted':'pending'}">${r.status==='done'?'已完成':r.status==='contacted'?'已联系':'待跟进'}</span></div>`).join('')||'<div class="empty">暂无转介记录</div>';
  return `<div class="mg-metrics">
    <div class="mg-metric"><div class="m-num">${persons.length}</div><div class="m-label">覆盖居民</div></div>
    <div class="mg-metric warn"><div class="m-num">${risk}</div><div class="m-label">需关注人数</div></div>
    <div class="mg-metric"><div class="m-num">${DEFAULT_RESOURCES.length+res.length}</div><div class="m-label">连接资源</div></div>
    <div class="mg-metric"><div class="m-num">${refs.length}</div><div class="m-label">转介记录</div></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">🤝 资源连接</div><div class="res-grid" style="grid-template-columns:1fr 1fr;">${resHtml}</div><button class="t-btn" style="margin-top:8px;" onclick="go('resources')">全部资源 →</button></div>
    <div class="panel" style="margin:0;"><div class="panel-title">📋 最新转介</div>${refHtml}<button class="t-btn" style="margin-top:8px;" onclick="go('referrals')">转介闭环 →</button></div>
  </div>
  <div class="panel"><div class="panel-title">📒 风险台账（${ledger.length} 条）</div>${ledgerItemsHtml(ledger.slice(0,3),false)}<button class="t-btn" style="margin-top:8px;" onclick="go('manage')">区域概览 →</button></div>`;
}
/* ── AI 人格选择（v4） ── */
const AI_PERSONAS={
  listen:{name:'温暖倾听型',ico:'🌷',desc:'先接住情绪，再慢慢陪你梳理',sys:'你是心屿的“温暖倾听型”AI伙伴。核心原则：1.共情优先：先接纳和确认感受，不急着给建议、不评判，多用“我听到你……”“这种感觉一定很不好受”“愿意多说说吗”。2.安全第一：出现自伤/自杀/伤人等危机信号时，立即建议联系专业帮助（12356、学校心理中心）。3.不替代专业：不诊断、不开药，只做倾听疏导与轻量引导。4.回应温暖简短（一般不超过120字），多用开放式提问。',greet:'嗨，我是温暖倾听型的心屿。🌷 今天有什么想说的吗？无论是什么，我都会认真听完。'},
  mentor:{name:'成长导师型',ico:'🌱',desc:'陪你复盘、给方法、促成长',sys:'你是心屿的“成长导师型”AI伙伴。风格：先共情一句，再给出可操作的轻量方法（CBT/正念/习惯养成），像一位懂心理学的学长学姐，鼓励用户自己尝试。安全第一：出现自伤/自杀信号立即建议联系专业帮助（12356、学校心理中心），不替代专业诊疗。回应 100-180 字，具体、可执行。',greet:'你好呀，我是成长导师型的心屿。🌱 愿意的话，我们可以一起梳理最近遇到的挑战，找到适合你的小步走法。'},
  pressure:{name:'学习压力助手',ico:'📚',desc:'专治考试焦虑、拖延与内卷',sys:'你是心屿的“学习压力助手”AI伙伴。风格：聚焦学业压力、考试焦虑、拖延、时间管理，先共情压力，再给拆解任务、番茄钟、5分钟启动法等具体方法。安全第一：出现自伤/自杀信号立即建议联系专业帮助（12356、学校心理中心）。回应 100-180 字，语气轻快鼓励。',greet:'我是学习压力助手心屿 📚 考试、论文、DDL……先深呼吸一下，我们一个个来。今天最让你有压力的是哪件事？'},
  friend:{name:'好朋友陪伴型',ico:'🎈',desc:'像好朋友一样轻松聊天',sys:'你是心屿的“好朋友陪伴型”AI伙伴。风格：像认识很久的好朋友，轻松、有梗、会分享感受，也会认真接住情绪，多用“哈哈”“我懂！”“太真实了”等口语。安全第一：出现自伤/自杀信号立即严肃建议联系专业帮助（12356、学校心理中心），不替代专业诊疗。回应 60-120 字，不端着。',greet:'嗨！我是你的好朋友心屿 🎈 今天过得怎么样？有好玩的事想分享，或者有烦心事想吐槽，都行～'}
};
function currentPersona(){const u=DB.currentUser();return AI_PERSONAS[(u&&u.aiPersona)||'listen']||AI_PERSONAS.listen;}
function renderPersonaRow(){
  const el=$('persona-row');if(!el)return;
  const u=DB.currentUser();const cur=(u&&u.aiPersona)||'listen';
  el.innerHTML='<span style="font-size:12.5px;color:var(--muted);align-self:center;">我的 AI 伙伴类型：</span>'+Object.entries(AI_PERSONAS).map(([k,p])=>`<span class="persona-chip ${cur===k?'on':''}" onclick="pickPersona('${k}')">${p.ico} ${p.name}</span>`).join('');
}
function pickPersona(k){
  const u=DB.currentUser();if(!u)return;
  u.aiPersona=k;DB.saveUser(u);
  renderPersonaRow();
  const label=$('chat-mode-label');
  if(label)label.innerHTML=AI_PERSONAS[k].name+'<span class="persona-tag">'+AI_PERSONAS[k].desc+'</span>';
  toast('✅ 已切换为「'+AI_PERSONAS[k].name+'」');
}
/* ── 用户心理记忆（年龄/性别/测评结果/历史交流 → 个性化交流） ── */
function buildMemory(u){
  const mem={};
  mem.age=u.age||'';mem.gender=u.gender||'';mem.tags=(u.tags||[]);mem.grade=u.grade||'';
  const latest={};
  (u.records||[]).forEach(r=>{if(!latest[r.scaleId]||r.date>latest[r.scaleId].date)latest[r.scaleId]=r;});
  mem.scaleNotes=Object.values(latest).map(r=>{const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';const lv=getLevel(s,r.total);return s.name+'：'+r.total+'分（'+lv.label+'）';}).filter(Boolean);
  const chats=DB.getData('chat',[]);
  mem.topics=chats.filter(c=>c.role==='user').slice(-8).map(c=>c.content.slice(0,30));
  mem.isLeftBehind=mem.tags.includes('leftbehind');
  mem.chatCount=chats.length;
  mem.persona=(u&&u.aiPersona)||'listen';
  return mem;
}
function memoryGreeting(u){
  const mem=buildMemory(u);const parts=[];
  if(mem.isLeftBehind)parts.push('最近有没有和爸爸妈妈视频呀？他们一定也很想你');
  if(/高|研|博/.test(u.grade||''))parts.push('上次你说考试（科研）压力比较大，这周有没有好一点');
  if(mem.scaleNotes.length)parts.push('你最近做的测评我都记在心里，状态有变化时我会提醒你照顾自己');
  if(parts.length)return '我注意到：'+parts.join('；')+'。想聊聊这些，还是随便说点别的？';
  return null;
}
function memoryAwareReply(text,u){
  const mem=buildMemory(u);
  if(mem.isLeftBehind&&/想家|爸妈|父母|视频|过年|假期|爷爷奶奶/.test(text))return '想家是很自然的事。我记得你之前提起过想家——要不要试着给爸爸妈妈发一条消息，或者约个视频时间？哪怕只说一句“今天有点想你们”，也会让彼此的心近一点。💙';
  if(/考试|复习|成绩|绩点|论文|DDL|deadline/.test(text)&&mem.chatCount>1)return '我记得你之前也为考试压力困扰过。这一次我们试试把目标切小一点：今天就只复习一个章节，完成就打勾，好不好？完成比完美重要。';
  if(/孤独|没人|一个人|孤单/.test(text)&&mem.scaleNotes.some(n=>n.includes('孤独感')))return '你的孤独感测评结果我也记得。孤独不代表你不好，它只是说你需要连接——要不要现在去树洞看看，或者给老朋友发条消息？';
  if(/睡|失眠|睡不着/.test(text)&&mem.scaleNotes.some(n=>n.includes('睡眠')))return '你的睡眠测评我也记着。上次建议的睡前引导有试过吗？今晚可以再做一次，我会在这里陪着你。🌙';
  return null;
}
/* 聊天风险识别：长期低落 / 强烈孤独 / 自伤表达 → 分级分流 */
const NEG_HINTS=['难过','低落','痛苦','绝望','崩溃','撑不住','累','烦','焦虑','抑郁','失眠','想哭','委屈','害怕','孤独','emo','没意思','空'];
function chatNegCount(){return DB.getData('chat',[]).filter(c=>c.role==='user'&&NEG_HINTS.some(w=>c.content.includes(w))).length;}
function chatRiskAssess(text){
  const u=DB.currentUser();
  const hit=checkSensitive(text);
  if(hit)return {level:'high',reason:'检测到敏感表达：「'+hit.word+'」（'+hit.cat+'）',hit};
  const longLow=chatNegCount()>=6;
  const lonely=/孤独|没人|一个人|被抛弃|没人理解/.test(text);
  const hopeless=/没希望|没意义|活不下去|好不了|没救了/.test(text);
  if(longLow||(lonely&&hopeless))return {level:'mid',reason:longLow?'历史聊天中出现多次低落信号，提示长期低落倾向':'表达中同时出现强烈孤独与无望感'};
  if(lonely)return {level:'low',reason:'表达孤独感，继续陪伴并引导连接'};
  return {level:'low',reason:''};
}
/* 语音包：预设 + 自定义录制/导入（v4） */
const VOICE_PACKS=[
  {id:'gentle',name:'🌷 温柔暖阳',desc:'温柔女声 · 舒缓治愈',gender:'female',voice:'Xiaoxiao|Huihui|Xiaoyi',rate:.9,pitch:1.1},
  {id:'sunny',name:'☀️ 阳光少年',desc:'清亮男声 · 轻快明亮',gender:'male',voice:'Yunxi|Kangkang|Yunjian',rate:1.15,pitch:1.0},
  {id:'anime',name:'🎀 元气满满',desc:'动漫感女声 · 活泼上扬',gender:'female',voice:'Xiaoxiao|Huihui',rate:1.25,pitch:1.6},
  {id:'calm',name:'🌙 深夜电台',desc:'磁性男声 · 低沉缓慢',gender:'male',voice:'Yunxi|Yunjian|Kangkang',rate:.8,pitch:.75},
  {id:'star',name:'✨ 星星奶音',desc:'软萌女声 · 高音调治愈',gender:'female',voice:'Xiaoxiao|Huihui',rate:.95,pitch:1.7},
  {id:'default',name:'💙 心屿本音',desc:'默认音色 · 自然',gender:'',voice:'',rate:1,pitch:1}
];
/* 按语音包选择系统中文音色：偏好 token 顺序匹配（边界锚定防误配）→ 性别匹配 → 兜底第一个中文语音 */
function pickVoice(pack){
  const voices=('speechSynthesis' in window)?window.speechSynthesis.getVoices():[];
  const zh=voices.filter(v=>/^zh/i.test(v.lang)||/Chinese/i.test(v.name));
  if(!zh.length)return null;
  const MALE=/Kangkang|Yunxi|Yunjian|Yunyang|Yunfeng|Yunye|Yunhao|Yunjia|Yunze|male/i;
  const FEMALE=/Huihui|Yaoyao|Xiaoxiao|Xiaoyi|Xiaochen|Xiaohan|Xiaomeng|Xiaomo|Xiaorui|Xiaoshuang|Xiaoxuan|Xiaoyan|Xiaoyou|Xiaozhen|Yunxia|female/i;
  if(pack&&pack.voice){
    for(const t of String(pack.voice).split('|')){ /* 按偏好顺序逐 token 匹配 */
      const esc=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp('(^|[^a-z])'+esc+'([^a-z]|$)|'+esc+'Neural','i');
      const m=zh.find(v=>re.test(v.name));
      if(m)return m;
    }
  }
  if(pack&&pack.gender==='male'){
    const m=zh.find(v=>MALE.test(v.name));
    if(m)return m;
  }else if(pack&&pack.gender==='female'){
    const m=zh.find(v=>FEMALE.test(v.name));
    if(m)return m;
  }
  return zh[0];
}
function currentVoicePack(){
  const u=DB.currentUser();
  if(u&&u.voicePack&&u.voicePack.custom)return u.voicePack;
  const id=(u&&u.voicePack&&u.voicePack.id)||'default';
  return VOICE_PACKS.find(v=>v.id===id)||VOICE_PACKS[5];
}
function speakAI(text){
  const vp=currentVoicePack();
  const customSrc=vp.custom?(vp.sample||vp.url):null;
  if(customSrc){
    try{
      const au=new Audio(customSrc);
      const play=au.play();if(play)play.catch(()=>{});
      let spoken=false;
      const doSpeak=()=>{if(!spoken){spoken=true;ttsSpeak(text,{rate:1,pitch:1});}};
      au.onloadedmetadata=()=>{const d=au.duration*1000;setTimeout(doSpeak,d||900);};
      setTimeout(doSpeak,1800); /* 兜底：样本时长未知时也保证回复能听到 */
      return;
    }catch(e){ /* 播放失败 → 走系统 TTS */ }
  }
  ttsSpeak(text,vp);
}
/* ── 情感分段朗读（v4.4）：按句拆分，逐句微调语调，句间自然停顿，更像真人说话 ── */
const TONE_RULES=[
  {re:/[!！]/,pitch:0.12,rate:0.06,label:'感叹'},
  {re:/[?？]/,pitch:0.08,rate:0.0,label:'疑问'},
  {re:/……|\.\.\./,pitch:0.0,rate:-0.08,label:'停顿'},
  {re:/(我听到|辛苦了|抱抱|不要紧|没关系|谢谢你|理解你|陪着你|别怕|没事的)/,pitch:-0.05,rate:-0.06,label:'共情'},
  {re:/(请立即|请拨打|必须|安全|紧急|危险|12356|重要)/,pitch:-0.08,rate:-0.10,label:'郑重'}
];
function splitSentences(text){
  return String(text).match(/[^。！？!?；;…]+[。！？!?；;…]?/g)||[String(text)];
}
function toneAdjust(sentence,baseRate,basePitch){
  let r=0,p=0;
  for(const rule of TONE_RULES){
    if(rule.re.test(sentence)){r+=rule.rate;p+=rule.pitch;}
  }
  /* 小随机抖动（±0.02/±0.03），避免机械重复 */
  const rate=Math.max(0.5,Math.min(1.6,baseRate+r+(Math.random()*0.04-0.02)));
  const pitch=Math.max(0.4,Math.min(2.0,basePitch+p+(Math.random()*0.06-0.03)));
  return {rate,pitch};
}
function speakSentences(text,pack){
  if(!('speechSynthesis' in window)){toast('当前浏览器不支持语音播报（建议使用 Chrome/Edge）');return;}
  window.speechSynthesis.cancel();
  const baseRate=pack?(pack.rate||1):1;
  const basePitch=pack?(pack.pitch||1):1;
  const voice=pickVoice(pack);
  const parts=splitSentences(text);
  const chain=()=>{
    if(!parts.length)return;
    const s=parts.shift();
    if(!s)return;
    const t=toneAdjust(s,baseRate,basePitch);
    const u=new SpeechSynthesisUtterance(s);
    u.lang='zh-CN';
    u.rate=t.rate;
    u.pitch=t.pitch;
    if(voice)u.voice=voice;
    u.onend=()=>{setTimeout(chain,140+Math.random()*120);};
    u.onerror=()=>{setTimeout(chain,150);};
    window.speechSynthesis.speak(u);
  };
  chain();
}
function ttsSpeak(text,pack){speakSentences(text,pack);}
function tryCustomPack(){
  const u=DB.currentUser();const vp=u&&u.voicePack;
  const src=vp&&(vp.sample||vp.url);
  if(!src){toast('还没有自定义语音包，先录一段或导入一个吧');return;}
  try{new Audio(src).play();toast('🔊 正在播放你的语音包样本');}catch(e){toast('播放失败，请重新录制或导入');}
}
let mediaRec=null,recChunks=[],recStream=null,recStartTs=0;
function startRec(onStop){
  return new Promise((resolve,reject)=>{
    if(!navigator.mediaDevices||!window.MediaRecorder){reject(new Error('no-mic'));return;}
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      recStream=stream;recChunks=[];recStartTs=Date.now();
      mediaRec=new MediaRecorder(stream);
      mediaRec.ondataavailable=e=>{if(e.data.size)recChunks.push(e.data);};
      mediaRec.onstop=()=>{
        const blob=new Blob(recChunks,{type:'audio/webm'});
        stream.getTracks().forEach(t=>t.stop());
        onStop(blob,Date.now()-recStartTs);
        resolve();
      };
      mediaRec.start();
    }).catch(()=>reject(new Error('no-perm')));
  });
}
function stopRec(){if(mediaRec&&mediaRec.state!=='inactive')mediaRec.stop();}
function blobToDataURL(blob){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(blob);});}
function openVoicePackModal(){
  const u=DB.currentUser();if(!u)return;
  const cur=currentVoicePack();
  const custom=u.voicePack&&u.voicePack.custom;
  openModal(`<h3>🎙️ 语音包设置</h3>
    <p class="sub">选择 AI 回复你的声音：预设音色开箱即用；也可以录一段你的声音生成<b>自定义语音包</b>，或导入音频文件 / 互联网语音包。</p>
    <div class="panel-title">预设语音包</div>
    <div class="vp-grid">${VOICE_PACKS.map(v=>`<div class="vp-item ${!custom&&cur.id===v.id?'sel':''}" onclick="pickVoicePack('${v.id}')"><div class="vp-name">${v.name}</div><div class="vp-desc">${v.desc}</div>${v.id==='default'?'':'<div style="font-size:10.5px;color:#94a3b8;margin-top:3px;">'+(v.gender==='male'?'男声':v.gender==='female'?'女声':'')+' · 语速 '+v.rate+' · 音调 '+v.pitch+'</div>'}<div class="vp-act"><button onclick="event.stopPropagation();tryVoice('${v.id}')">试听</button></div></div>`).join('')}</div>
    <div class="panel-title">自定义语音包${custom?' <span class="persona-tag">已启用：'+esc(custom.name)+'</span>':''}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="vb-btn" onclick="recordVoicePack()">🎤 录制一段我的声音</button>
      <button class="vb-btn" onclick="document.getElementById('vp-file').click()">📁 导入音频文件</button>
      <button class="vb-btn" onclick="importInternetPack()">🌐 导入互联网语音包</button>
      ${custom?`<button class="vb-btn" onclick="tryCustomPack()">🔊 试听</button>`:''}
      ${custom?`<button class="vb-btn" style="border-color:var(--muted);color:var(--muted);" onclick="clearVoicePack()">清除自定义</button>`:''}
    </div>
    <input type="file" id="vp-file" accept="audio/*" style="display:none;" onchange="importVoiceFile(this)">
    <div class="rec-panel" id="vp-rec-panel" style="display:none;">
      <b>🎙️ 正在录音…</b> 请用自然的语气说一句话，比如：“你好，我是心屿的朋友，今天也要开心呀。”
      <div class="rp-bar"><i></i></div>
      <div style="margin-top:10px;display:flex;gap:8px;"><button class="vb-btn" style="background:#dc2626;color:#fff;border-color:#dc2626;" onclick="stopVoicePackRec()">停止并分析</button></div>
    </div>
    <p style="font-size:11.5px;color:var(--muted);margin-top:10px;">💡 音色说明：不同语音包会优先匹配系统里的不同中文音色（女声/男声），并叠加明显的语速与音调差异，听感各不相同。若你的系统只装了一种中文语音，也能通过语速音调听出区别；想获得更多音色，可在 Windows「设置→时间和语言→语音」中安装更多中文语音。音调/语速效果因浏览器而异，<b>Edge 浏览器效果最佳</b>。<br>🎙️ 自定义语音包会保存你的声音样本；AI 语音回复会先播放你的语音包样本，再以系统音色朗读回复（演示版暂不支持实时声音克隆，正式版将接入专业语音合成 API）。录音仅保存在本浏览器，不上传。</p>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">完成</button></div>`);
}
function pickVoicePack(id){
  const u=DB.currentUser();if(!u)return;
  u.voicePack={id};
  DB.saveUser(u);
  openVoicePackModal();
  toast('✅ 已切换语音包');
}
function tryVoice(id){
  const vp=VOICE_PACKS.find(v=>v.id===id);
  if(!vp)return;
  if(!('speechSynthesis' in window)){toast('当前浏览器不支持语音播报（建议使用 Chrome/Edge）');return;}
  if(!pickVoice(vp)){toast('🔇 音色列表加载中，请稍后再点一次试听');return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance('你好呀，我是心屿。今天也要好好照顾自己哦！');
  u.lang='zh-CN';u.rate=vp.rate;u.pitch=vp.pitch;
  const v=pickVoice(vp);
  if(v)u.voice=v;
  window.speechSynthesis.speak(u);
}
let vpRecMode=false;
function recordVoicePack(){
  const panel=$('vp-rec-panel');if(!panel)return;
  panel.style.display='block';
  startRec(async(blob,dur)=>{
    const dataUrl=await blobToDataURL(blob);
    const u=DB.currentUser();
    const sizeKb=Math.round(dataUrl.length/1024);
    if(sizeKb>1200){toast('⚠️ 录音文件过大，请录短一点（约 10 秒内）');panel.style.display='none';return;}
    u.voicePack={custom:true,name:'我的声音',sample:dataUrl,rate:1,pitch:1,analyzed:{durMs:dur,sizeKb}};
    DB.saveUser(u);
    panel.style.display='none';
    toast('✅ 录音分析完成：时长 '+(dur/1000).toFixed(1)+' 秒 · 已生成自定义语音包');
    openVoicePackModal();
  }).catch(e=>{toast(e.message==='no-mic'?'当前浏览器不支持录音（建议 Chrome/Edge）':'未获得麦克风权限，请在浏览器设置中允许');panel.style.display='none';});
}
function stopVoicePackRec(){stopRec();}
function importVoiceFile(input){
  const f=input.files&&input.files[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const u=DB.currentUser();if(!u)return;
    if(e.target.result.length>1200*1024){toast('⚠️ 音频文件过大（<1MB），请用短视频或压缩后导入');return;}
    u.voicePack={custom:true,name:f.name.replace(/\.[a-z0-9]+$/i,''),sample:e.target.result,rate:1,pitch:1,analyzed:{imported:true}};
    DB.saveUser(u);
    toast('✅ 已导入语音包「'+u.voicePack.name+'」');
    openVoicePackModal();
  };
  reader.readAsDataURL(f);
}
function importInternetPack(){
  openModal(`<h3>🌐 网络语音与音色参考</h3>
    <div class="scale-info">🔊 <b>想给 AI 换更多真实音色？</b>两步搞定：① 在 Windows「设置 → 时间和语言 → 语音 → 管理语音」中添加更多中文语音（如晓晓 Xiaoxiao、云希 Yunxi、云健 Yunjian 等神经网络音色）；② 回到「语音包设置」逐个试听——不同语音包会自动匹配不同音色。</div>
    <div class="panel-title">📚 官方音色参考资源</div>
    <div class="vp-grid">
      <div class="vp-item" onclick="window.open('https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/language-support?tabs=tts','_blank')"><div class="vp-name">🌐 微软官方中文语音列表</div><div class="vp-desc">Azure 语音服务支持的中文音色清单（晓晓/云希/云健等，含试听）</div></div>
      <div class="vp-item" onclick="toast('打开 Windows「设置→时间和语言→语音→管理语音」，勾选中文语音后点击安装')"><div class="vp-name">🪟 系统语音安装指引</div><div class="vp-desc">Windows 自带神经网络中文语音的安装方法</div></div>
    </div>
    <div class="panel-title">🎵 演示示例包（使用系统音色模拟）</div>
    <div class="vp-grid">
      ${[
        ['🍀 公益朗读·儿童关怀','示例包：系统温柔音色朗读（演示）'],
        ['🎧 白噪音助眠包','示例包：系统低频沉稳音色（演示）'],
        ['🎵 正念引导音频','示例包：系统舒缓音色（演示）']
      ].map((x,i)=>`<div class="vp-item" onclick="importSamplePack(${i})"><div class="vp-name">${x[0]}</div><div class="vp-desc">${x[1]}</div></div>`).join('')}
    </div>
    <div class="field" style="margin-top:12px;"><label>或粘贴你自己的音频直链 URL（mp3/wav/ogg，作为语音包样本播放）</label><input id="vp-url" placeholder="https://example.com/voice.mp3"></div>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button><button class="btn btn-teal" onclick="importUrlPack()">导入</button></div>`);
}
function importSamplePack(i){
  const u=DB.currentUser();if(!u)return;
  const samples=[
    {name:'公益朗读·儿童关怀',note:'使用系统温柔音色朗读（示例包）'},
    {name:'白噪音助眠包',note:'使用系统低频沉稳音色（示例包）'},
    {name:'正念引导音频',note:'使用系统舒缓音色（示例包）'}
  ][i];
  const param=[[.92,1.05],[.8,.9],[.95,.95]][i];
  u.voicePack={custom:true,name:samples.name,rate:param[0],pitch:param[1],analyzed:{internet:true}};
  DB.saveUser(u);
  toast('✅ 已导入「'+samples.name+'」'+samples.note);
  closeModal();openVoicePackModal();
}
function importUrlPack(){
  const url=$('vp-url').value.trim();
  if(!/^https?:\/\/.+/.test(url)){toast('请输入有效的 http(s) 音频链接');return;}
  const u=DB.currentUser();if(!u)return;
  u.voicePack={custom:true,name:'网络语音包',url,rate:1,pitch:1,analyzed:{internet:true}};
  DB.saveUser(u);
  toast('✅ 已导入网络语音包（播放时自动加载）');
  closeModal();openVoicePackModal();
}
function clearVoicePack(){
  const u=DB.currentUser();if(!u)return;
  delete u.voicePack;DB.saveUser(u);
  toast('已恢复默认语音包');openVoicePackModal();
}
/* 语音输入（SpeechRecognition，不支持则提示打字） */
function sttAvailable(){return !!((window.SpeechRecognition||window.webkitSpeechRecognition));}
let sttRec=null;
function startVoiceInput(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('当前浏览器不支持语音识别，建议用 Chrome/Edge，或直接输入文字');return;}
  const btn=$('voice-input-btn');
  if(btn)btn.classList.add('rec');
  sttRec=new SR();sttRec.lang='zh-CN';sttRec.interimResults=false;
  sttRec.onresult=e=>{
    const t=e.results[0][0].transcript;
    if(btn)btn.classList.remove('rec');
    $('chat-input').value=t;
    toast('🎤 已识别：'+t.slice(0,24));
    sendChat();
  };
  sttRec.onerror=()=>{if(btn)btn.classList.remove('rec');toast('🎤 没听清，请再说一次，或直接输入文字');};
  sttRec.onend=()=>{if(btn)btn.classList.remove('rec');};
  sttRec.start();
}
function stopVoiceInput(){if(sttRec)sttRec.stop();}
function toggleVoiceReply(){
  const u=DB.currentUser();if(!u)return;
  u.voiceReply=!u.voiceReply;DB.saveUser(u);
  toast(u.voiceReply?'🔊 AI 语音回复已开启（自动朗读回复）':'🔇 AI 语音回复已关闭');
  const btn=$('voice-reply-btn');
  if(btn)btn.style.background=u.voiceReply?'var(--teal)':'#fff';
  if(btn)btn.style.color=u.voiceReply?'#fff':'var(--teal)';
}

/* ── 家庭邀请码（孩子生成 → 家长绑定，v4） ── */
function genFamilyCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function ensureFamilyCode(u){
  if(u&&!u.familyCode)u.familyCode={code:genFamilyCode(),createdAt:Date.now()};
  if(u)DB.saveUser(u);
  return u?u.familyCode:null;
}
function findUserByFamilyCode(code){
  const users=DB.users;
  const k=String(code||'').trim().toUpperCase();
  for(const name in users){const f=users[name].familyCode;if(f&&f.code===k)return users[name];}
  return null;
}
function renderFamilyCodeBox(containerId){
  const box=$(containerId||'family-code-box');if(!box)return;
  const u=DB.currentUser();if(!u)return;
  const fc=ensureFamilyCode(u);
  const boundParent=u.boundParent?childNickOf(u.boundParent):'';
  box.innerHTML=`<div class="invite-hero">
    <div style="flex:1;"><b style="font-size:14px;">👨‍👩‍👧 家庭连接</b>
      <div class="ih-tip">把邀请码发给家长，家长在「家庭端」输入即可绑定，两边的账号就会连接在一起。${u.boundParent?'<br>✅ 已与家长 <b>'+esc(boundParent)+'</b> 绑定':''}</div></div>
    <div class="ih-code">${fc.code}</div>
    <button class="btn btn-soft" style="padding:8px 16px;font-size:12.5px;" onclick="copyFamilyCode()">📋 复制</button>
    <button class="btn btn-soft" style="padding:8px 16px;font-size:12.5px;" onclick="regenFamilyCode()">🔄 重新生成</button>
  </div>`;
}
function copyFamilyCode(){
  const u=DB.currentUser();if(!u)return;
  const fc=ensureFamilyCode(u);
  try{navigator.clipboard.writeText(fc.code);toast('✅ 邀请码已复制：'+fc.code);}
  catch(e){toast('邀请码：'+fc.code);}
}
function regenFamilyCode(){
  const u=DB.currentUser();if(!u)return;
  u.familyCode={code:genFamilyCode(),createdAt:Date.now()};
  DB.saveUser(u);renderFamilyCodeBox();renderProfile();
  toast('✅ 已重新生成邀请码');
}
function bindByFamilyCode(){
  const u=DB.currentUser();if(!u||u.role!=='parent')return;
  const code=($('bind-code')?$('bind-code').value:'').trim().toUpperCase();
  if(!code){toast('请输入孩子发给你的邀请码');return;}
  const child=findUserByFamilyCode(code);
  if(!child){toast('未找到该邀请码，请确认孩子已生成邀请码且未过期');return;}
  if(child.role!=='student'&&child.role!=='normal'){toast('该账号不是学生/普通用户，无法绑定');return;}
  if(child.username===u.username){toast('不能绑定自己');return;}
  u.childUsername=child.username;
  child.boundParent=u.username;
  DB.saveUser(u);DB.saveUsers(DB.users);
  syncRoster(u);syncRoster(child);
  closeModal();
  renderChild();renderHome();renderProfile();
  toast('🎉 绑定成功！你与「'+child.nickname+'」的心屿已经连接在一起');
}
/* ── 紧急联系人配置 ── */
function openContactsModal(){
  const u=DB.currentUser();if(!u)return;
  const c=u.contacts||{};
  openModal(`<h3>🆘 我的紧急联系人</h3>
    <p class="sub">当平台检测到高风险信号时，会优先提示联系以下人员（仅保存在本浏览器）。</p>
    <div class="field"><label>心理老师 / 辅导员</label><input id="ct-teacher" value="${esc(c.teacher||'')}" placeholder="例如：张老师 138xxxx1234"></div>
    <div class="field"><label>家人 / 朋友</label><input id="ct-family" value="${esc(c.family||'')}" placeholder="例如：妈妈 139xxxx5678"></div>
    <div class="field"><label>附近精神卫生机构</label><input id="ct-hospital" value="${esc(c.hospital||'')}" placeholder="例如：市精神卫生中心（地址）"></div>
    <div class="modal-foot"><button class="btn" style="background:#f1f5f9;color:var(--muted);" onclick="closeModal()">取消</button><button class="btn btn-teal" onclick="saveContacts()">保存</button></div>`);
}
function saveContacts(){
  const u=DB.currentUser();if(!u)return;
  u.contacts={teacher:$('ct-teacher').value.trim(),family:$('ct-family').value.trim(),hospital:$('ct-hospital').value.trim()};
  DB.saveUser(u);
  closeModal();toast('✅ 紧急联系人已保存');
}
/* ── 树洞：AI 自动分析（情绪/压力来源/风险程度） ── */
function aiAnalyzePost(text){
  const emo=[];
  if(/难过|伤心|想哭|委屈/.test(text))emo.push('难过');
  if(/焦虑|紧张|慌|怕|担心/.test(text))emo.push('焦虑');
  if(/生气|愤怒|烦|讨厌/.test(text))emo.push('烦躁');
  if(/孤独|一个人|没人|孤单/.test(text))emo.push('孤独');
  if(/累|疲惫|撑不住|崩溃/.test(text))emo.push('疲惫');
  if(/开心|高兴|太好了|终于/.test(text))emo.push('欣喜');
  if(!emo.length)emo.push('复杂/待探索');
  const pressure=[];
  if(/考试|成绩|作业|论文|毕业|就业|升学/.test(text))pressure.push('学业压力');
  if(/室友|同学|朋友|人际|社交|社团/.test(text))pressure.push('人际压力');
  if(/家里|父母|爸妈|家庭|弟弟|妹妹/.test(text))pressure.push('家庭因素');
  if(/睡|失眠|熬夜/.test(text))pressure.push('睡眠问题');
  if(/钱|费用|穷/.test(text))pressure.push('经济压力');
  if(!pressure.length)pressure.push('暂不明显');
  const hit=checkSensitive(text);
  const risk=hit?'high':(/撑不住|崩溃|活不下去|没意思/.test(text)?'mid':'low');
  return {emo,pressure,risk,word:hit?hit.word:''};
}
function aiAnalysisHTML(a){
  return `<div class="ai-analysis"><div class="aa-head">🧠 AI 自动分析 <span style="font-weight:400;font-size:11px;color:#8b5cf6;">· 情绪 / 压力来源 / 风险程度</span></div>
    <span class="aa-tag">情绪：${a.emo.join('、')}</span><span class="aa-tag">压力来源：${a.pressure.join('、')}</span>
    <span class="aa-tag" style="background:${a.risk==='high'?'#fee2e2':a.risk==='mid'?'#fef3c7':'#dcfce7'};color:${a.risk==='high'?'#b91c1c':a.risk==='mid'?'#92400e':'#166534'};">风险程度：${a.risk==='high'?'高 · 已触发人工关注':a.risk==='mid'?'中':'低'}</span>
    ${a.risk==='high'?'<div style="margin-top:6px;font-size:12px;">⚠️ 已按分级支持流程通知平台关注，树洞守护者会留意你的后续动态。</div>':''}
  </div>`;
}
/* 温暖互动（替代点赞） */
function warmAction(i,key){
  const p=getPosts();if(!p[i])return;
  p[i].warm=p[i].warm||{};
  p[i].warm[key]=!p[i].warm[key];
  savePosts(p);renderPosts();
}
/* 语音树洞（低龄儿童友好：录 → 识别 → 文字分析 → AI 回应） */
function startVoiceVent(){
  const btn=$('voice-vent-btn');if(!btn)return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('当前浏览器不支持语音识别，建议用 Chrome/Edge');return;}
  btn.classList.add('rec');btn.textContent='⏺ 正在听你说… 再点一下结束';
  sttRec=new SR();sttRec.lang='zh-CN';sttRec.interimResults=false;
  sttRec.onresult=e=>{
    const t=e.results[0][0].transcript;
    btn.classList.remove('rec');
    handleVoiceVent(t);
  };
  sttRec.onerror=()=>{btn.classList.remove('rec');btn.textContent='🎤 语音倾诉（点我开始）';toast('没听清，再说一次吧');};
  sttRec.onend=()=>{btn.classList.remove('rec');btn.textContent='🎤 语音倾诉（点我开始）';};
  sttRec.start();
}
function handleVoiceVent(text){
  const a=aiAnalyzePost(text);
  const hit=checkSensitive(text);
  const v=getVents();
  const reply=hit
    ?'⚠️ 宝贝，你说的这些话让我很担心你。请一定不要一个人扛着——告诉身边的大人（老师、爸爸妈妈），或者拨打 12356 热线，会有人帮助你的。'
    :(a.risk==='mid'
      ?'我听到你的声音里有沉甸甸的心事。谢谢你愿意说出来。如果你愿意，可以和 AI 伙伴多聊一会儿，或者把这件事告诉一个你信任的大人，好吗？'
      :'我听到了。💙 你说的话已经被认真接住了——今天也有在好好照顾自己吗？');
  v.push({text,mood:'🎤',date:Date.now(),voice:true,aiReply:reply,analysis:a});
  saveVents(v);
  /* v4 分级闭环：敏感词 → 台账 + 紧急联系弹窗；中风险 → 台账持续关注 */
  if(hit){
    const ev=sensitiveTrigger(text,'语音树洞');
    setTimeout(()=>openSensitiveModal(hit,ev),600);
  }else if(a.risk==='mid'){
    addRiskEvent({type:'risk-grade',trigger:'【语音树洞】AI 分析中风险：「'+text.slice(0,30)+'…」',level:'mid',action:'AI 即时回应 + 持续关注',notes:[{ts:Date.now(),text:'情绪:'+a.emo.join('/')+' 压力来源:'+a.pressure.join('/')}]});
  }
  toast('🎤 已收进语音树洞，AI 回应了你的倾诉');
  renderVents();
}
/* 家长匿名交流区（AI 自动生成示例内容） */
const PARENT_CHAT_SEEDS=[
  {text:'孩子初二，最近回家就把门一关，问他什么都不说。我该敲门还是等着？',replies:[['心屿小助手','青春期的孩子需要掌控感。可以试试不追问，用“今晚想吃什么”这类生活化话题打开局面。'],['家长A（示例）','我一般晚上给他送水果，顺便聊两句，比正面问有效']]},
  {text:'孩子考试没考好，我一生气说了重话，现在特别后悔。怎么补救？',replies:[['心屿小助手','能意识到这一点，你已经是很棒的家长了。可以坦诚道歉：“昨天我话说重了，是我着急了，不是你不好。” 真诚的道歉会让孩子更信任你。'],['家长B（示例）','我也干过这事，后来跟孩子认真道了歉，关系反而更近了']]},
  {text:'孩子天天玩手机，一说就吵架。有没有不那么伤感情的办法？',replies:[['心屿小助手','可以试试“先约定后执行”：和孩子一起制定屏幕时间规则，而不是单方面没收；规则里也包含你的部分（比如吃饭不玩手机），以身作则。']]}
];
function getParentChat(){return DB.getData('parentChat',null)||seedParentChat();}
function seedParentChat(){
  const now=Date.now();
  const p=PARENT_CHAT_SEEDS.map((s,i)=>({
    id:'pc'+i,author:'匿名家长',authorId:'__system__',system:true,text:s.text,tag:'亲子沟通',date:now-(PARENT_CHAT_SEEDS.length-i)*7*3600*1000,
    likes:4+i,liked:false,replies:s.replies.map(r=>({from:r[0],authorId:'__system__',text:r[1],date:now-(PARENT_CHAT_SEEDS.length-i)*7*3600*1000})),reported:0
  }));
  DB.setData('parentChat',p);
  return p;
}
function saveParentChat(p){DB.setData('parentChat',p);}
function addParentChatPost(){
  const input=$('pc-input');if(!input)return;
  const text=input.value.trim();
  if(!text){toast('写点什么再发布吧');return;}
  const u=DB.currentUser();
  const p=getParentChat();
  p.unshift({id:'pu'+Date.now(),author:'匿名家长',authorId:u?u.username:'',system:false,text,tag:'亲子沟通',date:Date.now(),likes:0,liked:false,replies:[],reported:0});
  saveParentChat(p);input.value='';
  renderParentChat();
  toast('✅ 已匿名发布，家长们会看到你的问题');
}
function aiReplyParentChat(i){
  const p=getParentChat();if(!p[i])return;
  const pool=['抱抱你，愿意说出来就已经很勇敢了。很多家长都经历过类似的困扰，你不是一个人。','可以先从一次不评判的倾听开始：孩子说什么都先听完，不急着纠正。','试试把“你怎么又”换成“我注意到……我有点担心”，孩子更容易听进去。','每个孩子节奏不同，慢一点没关系。你已经做得很好了。'];
  p[i].replies=p[i].replies||[];
  p[i].replies.push({from:'心屿小助手',authorId:'__system__',text:pool[Math.floor(Math.random()*pool.length)],date:Date.now()});
  saveParentChat(p);renderParentChat();
  toast('🤖 心屿小助手已回应');
}
function likeParentChat(i){const p=getParentChat();p[i].liked=!p[i].liked;p[i].likes=(p[i].likes||0)+(p[i].liked?1:-1);saveParentChat(p);renderParentChat();}
function replyParentChat(i){
  const input=$('pc-reply-'+i);const text=input?input.value.trim():'';
  if(!text)return;
  const p=getParentChat();const u=DB.currentUser();
  p[i].replies=p[i].replies||[];
  p[i].replies.push({from:'我',authorId:u?u.username:'',text,date:Date.now()});
  saveParentChat(p);renderParentChat();
}
function renderParentChat(){
  const box=$('parent-chat');if(!box)return;
  const p=getParentChat();
  box.innerHTML=`<div class="panel" style="margin:0;">
    <div class="panel-title">💬 家长悄悄话（匿名交流区）</div>
    <p class="sub" style="margin-bottom:10px;">这里只有家长能看到：交流育儿难题、分享解决孩子问题的经验。没有真人发言时，心屿小助手会生成示例讨论，你随时可以加入。</p>
    <div class="compose"><textarea id="pc-input" placeholder="聊聊你最近的育儿困惑吧，匿名发布，家长互相支招……"></textarea><div class="row" style="margin-top:8px;"><div class="tag-pick"><span data-tag="亲子沟通" class="sel">亲子沟通</span><span data-tag="学习问题">学习问题</span><span data-tag="情绪行为">情绪行为</span></div><button class="btn btn-teal" style="padding:9px 20px;font-size:14px;margin-left:auto;" onclick="addParentChatPost()">发布</button></div></div>
    <div>${p.map((x,i)=>`<div class="post">
      <div class="p-head"><span class="avatar" style="width:26px;height:26px;font-size:12px;">👤</span><span class="p-name">${esc(x.author)}</span>${x.system?'<span class="p-sys">✦ 心屿示例</span>':'<span class="p-anon">匿名</span>'}<span class="p-tag">${esc(x.tag||'亲子沟通')}</span><span class="p-time">${fmtDay(x.date)}</span></div>
      <div class="p-text">${esc(x.text)}</div>
      <div class="p-actions">
        <button class="p-act ${x.liked?'liked':''}" onclick="likeParentChat(${i})">👍 有用 ${x.likes||0}</button>
        <button class="p-act" onclick="document.getElementById('pc-reply-${i}').focus()">💬 支招 ${(x.replies||[]).length}</button>
        <button class="p-act ai" onclick="aiReplyParentChat(${i})">🤖 心屿支招</button>
      </div>
      <div class="p-replies">${(x.replies||[]).map(r=>`<div class="reply"><span class="avatar" style="width:22px;height:22px;font-size:10px;">👤</span><div class="r-body"><b>${esc(r.from)}</b>：${esc(r.text)}</div></div>`).join('')}
        <div class="r-input"><input id="pc-reply-${i}" placeholder="友善地给这位家长支个招…"><button onclick="replyParentChat(${i})">回应</button></div>
      </div>
    </div>`).join('')}</div>
  </div>`;
}
/* ── AI 亲子沟通助手（v4） ── */
const PARENT_ASSIST_RULES=[
  {kw:'不愿意',reply:['沟通方式：不追问、不审问，从生活话题切入（“今晚想吃什么”“周末想不想出去走走”）；用“我注意到…”开头描述观察，而不是“你怎么又…”。','表达建议：先给孩子一个安全出口：“你不想说没关系，等你愿意了，我随时在。” 再分享自己的感受：“你关门不说话的时候，我有点担心。”','注意事项：避免连续追问三连；避免拿孩子和别人比较；如果持续一周以上完全拒绝沟通，可联系学校心理老师协助。']},
  {kw:'吵架|冲突|顶嘴',reply:['沟通方式：先“暂停”再“复盘”——情绪激动时约定暂时分开 10 分钟，冷静后再谈；用“我信息”表达感受。','表达建议：承认双方都有情绪：“刚才我们都挺激动，先歇一下。” 复盘时只谈事情本身，不翻旧账。','注意事项：不要在孩子情绪顶峰时讲道理；避免“你总是…”“你从来…”这类绝对化指责。']},
  {kw:'手机|游戏|沉迷',reply:['沟通方式：用“家庭会议”协商屏幕时间规则，规则对全家生效（包括大人），而不是单方面没收。','表达建议：先理解需求：“游戏里什么最吸引你？” 再协商：“每天 1 小时，写完作业后玩，周日可以多半小时，怎么样？”','注意事项：避免突然断网、摔手机等激烈手段；关注孩子是否用游戏逃避现实压力，那才是根源。']},
  {kw:'成绩|考试|学习',reply:['沟通方式：先接住情绪，再谈方法：“这次没考好，你心里也不好受吧？” 而不是第一句就分析原因。','表达建议：一起做“考后复盘”：哪些是会做的、哪些是粗心、哪些是真不会，逐类找对策；肯定努力过程而非只盯分数。','注意事项：避免“别人家孩子”比较；避免用奖惩绑架学习；如果孩子持续厌学、拒学，建议联系学校心理老师。']},
  {kw:'早恋|恋爱|喜欢',reply:['沟通方式：保持开放态度，先听孩子怎么说，不急着否定；“我像你这么大时也心动过”，用分享代替说教。','表达建议：聊“什么是一段好的关系”——尊重、边界、不影响学业；让孩子自己说想法，你在旁边当参谋。','注意事项：避免偷看手机、跟踪等侵犯隐私行为；如果发现孩子情绪剧烈波动或关系带来伤害，及时介入并寻求专业帮助。']},
  {kw:'害怕|担心|胆小|焦虑',reply:['沟通方式：先接纳情绪：“害怕是正常的，我小时候也怕过。” 再一起找应对办法。','表达建议：帮孩子把“担心的事”写下来，分成“能控制的”和“不能控制的”，只处理能控制的部分。','注意事项：不要否定感受（“这有什么好怕的”）；如果焦虑明显影响睡眠、上学，建议寻求学校心理老师或专业评估。']},
  {kw:'抑郁|自杀|不想活|自残',reply:['🚨 这是需要立刻行动的信号：先保证孩子安全，24 小时内联系学校心理老师或拨打全国心理援助热线 12356；不要责备、不要讲大道理，先陪伴：“我在，你很重要。”','表达建议：直接但温和地询问：“我有点担心你，你是不是有时候觉得活着很痛苦？” 直接询问不会“诱导”自杀，反而会让孩子感到被理解。','注意事项：收起家中的危险物品；避免让孩子独处；不要承诺保密——“我会陪着你，但有些事需要大人一起帮你。” 务必尽快联系专业力量。']},
  {kw:'沟通|不说话|怎么聊',reply:['沟通方式：每天固定 15 分钟“专属聊天时间”，不谈学习；并肩活动（散步、开车、做饭）时聊天比面对面更容易开口。','表达建议：多问开放式问题（“今天有什么新鲜事吗”），少问封闭式问题（“作业写完了吗”）；孩子说的时候，放下手机，眼神交流。','注意事项：忍住“讲道理”的冲动——先听，听完再问“需要我帮忙吗”，孩子要的是被听见，不是被教育。']}
];
const PARENT_ASSIST_FALLBACK=[
  ['沟通方式','先接住情绪，再谈事情：孩子说话时放下手机，看着他的眼睛，听完再回应；用“我注意到…我有点担心…”代替“你怎么又…”。'],
  ['表达建议','每天留 15 分钟只聊孩子想聊的话题，不谈学习；多问“今天有什么开心/烦心的事吗”，少问“考了多少分”。'],
  ['注意事项','避免比较、避免翻旧账、避免在孩子情绪激动时讲道理；如果问题持续且影响生活，及时联系学校心理老师或拨打 12356。']
];
function parentingReply(text){
  for(const rule of PARENT_ASSIST_RULES){
    if(rule.kw.split('|').some(k=>text.includes(k))){
      if(rule.kw.includes('抑郁')||rule.kw.includes('自杀'))return {crisis:true,sections:rule.reply};
      return {crisis:false,sections:rule.reply};
    }
  }
  return {crisis:false,sections:PARENT_ASSIST_FALLBACK.map(x=>x[0]+'：'+x[1])};
}
function askParenting(){
  const input=$('pa-input');if(!input)return;
  const q=input.value.trim();
  if(!q){toast('先说说你的困惑吧');return;}
  const r=parentingReply(q);
  const box=$('pa-reply');
  if(!box)return;
  box.style.display='block';
  box.innerHTML=(r.crisis
    ?`<div class="warn-box" style="margin:0 0 10px;">${r.sections[0]}</div>`
    :'')+`<div style="font-size:13px;color:var(--muted);margin-bottom:6px;">🤖 心屿小助手 · 关于「${esc(q.slice(0,30))}」的建议：</div>`
    +r.sections.map(s=>{const m=s.match(/^(.+?)：/);const head=m?m[1]:'';const body=head?s.slice(head.length+1):s;return `<div class="ar-sec"><b>${esc(head)}</b><br>${esc(body)}</div>`;}).join('')
    +`<p style="font-size:11.5px;color:var(--muted);margin-top:8px;">AI 建议仅供参考，不能替代专业心理咨询。情况紧急请拨打 12356。</p>`;
  input.value='';
}
/* ── 学校端：趋势分析 / 年级分析 / 重点关注与转介 / 隐私说明（上下导航可达） ── */
function schoolPersons(){const u=DB.currentUser();if(!u||u.role!=='school_admin')return[];return managePersons();}
function schoolScaleAgg(persons){
  const agg={};
  SCALES.forEach(s=>{agg[s.id]={sum:0,n:0,max:s.max};});
  persons.forEach(p=>(p.records||[]).forEach(r=>{if(agg[r.scaleId]){agg[r.scaleId].sum+=r.total;agg[r.scaleId].n++;}}));
  return agg;
}
function renderSchoolTrend(){
  const view=$('st-view');if(!view)return;
  const u=DB.currentUser();if(!u||u.role!=='school_admin'){toast('该页面仅学校管理人员可用');go('home');return;}
  const persons=schoolPersons();
  $('st-sub').innerHTML='数据范围：<b>'+esc(u.orgName||'未填学校')+'</b> · 脱敏聚合 · 实时同步';
  const dist={mild:0,moderate:0,severe:0,none:0};
  persons.forEach(p=>{const l=latestRecord(p);if(!l){dist.none++;return;}dist[l.cls]=(dist[l.cls]||0)+1;});
  const total=persons.length||1;
  const bars=[['良好/轻度',dist.mild,'#14b8a6'],['中度关注',dist.moderate,'#d97706'],['高度关注',dist.severe,'#dc2626'],['未测评',dist.none,'#94a3b8']];
  const agg=schoolScaleAgg(persons);
  const avgBars=SCALES.map(s=>{const a=agg[s.id];return {name:s.name,avg:a.n?a.sum/a.n:0,max:s.max,n:a.n};}).filter(b=>b.n>0);
  const avgHtml=avgBars.length?avgBars.map(b=>{const pct=b.avg/b.max*100;const col=pct>66?'#dc2626':pct>33?'#d97706':'#0e7490';return `<div class="mg-bar-row"><span class="lb">${esc(b.name)}</span><div class="bar"><i style="width:${Math.round(pct)}%;background:${col};animation:barGrow 1s ease-out;"></i></div><span class="num">${b.avg.toFixed(1)} / ${b.max}</span></div>`;}).join(''):'<div class="empty">暂无测评数据</div>';
  const recents=[];
  persons.forEach(p=>(p.records||[]).forEach(r=>recents.push(Object.assign({who:p.nickname,avatar:p.avatar},r))));
  recents.sort((a,b)=>b.date-a.date);
  const recentHtml=recents.slice(0,8).map(r=>{const s=SCALES.find(x=>x.id===r.scaleId);if(!s)return'';return `<div class="history-item"><span>${r.avatar?`<img class="u-ava" style="width:22px;height:22px;border-radius:50%;vertical-align:-5px;margin-right:6px;" src="${esc(r.avatar)}">`:''}${esc(r.who)} · ${esc(s.name)}</span><span class="h-score ${r.cls==='mild'?'good':r.cls==='moderate'?'mid':'bad'}">${r.total}/${s.max} · ${esc(r.level)}</span><span style="font-size:11.5px;color:#94a3b8;">${fmtDay(r.date)}</span></div>`;}).join('')||'<div class="empty">暂无测评动态</div>';
  view.innerHTML=`
  <div class="mg-metrics">
    <div class="mg-metric"><div class="m-num">${persons.length}</div><div class="m-label">覆盖学生数</div></div>
    <div class="mg-metric"><div class="m-num">${persons.reduce((s,p)=>s+(p.records||[]).length,0)}</div><div class="m-label">测评总次数</div></div>
    <div class="mg-metric warn"><div class="m-num">${dist.moderate+dist.severe}</div><div class="m-label">需关注人数（中+高）</div></div>
    <div class="mg-metric warm"><div class="m-num">${persons.reduce((s,p)=>s+(p.trainings||[]).length,0)}</div><div class="m-label">训练总次数</div></div>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">🧭 整体状态分布</div>${bars.map(b=>`<div class="mg-bar-row"><span class="lb">${b[0]}</span><div class="bar"><i style="width:${Math.round(b[1]/total*100)}%;background:${b[2]};min-width:${b[1]?6:0}px;animation:barGrow 1s ease-out;"></i></div><span class="num">${b[1]} 人</span></div>`).join('')}<p style="font-size:12px;color:var(--muted);margin-top:8px;">按每个人最近一次测评等级归类（国际标准分界）。</p></div>
    <div class="panel" style="margin:0;"><div class="panel-title">📈 各量表平均分（相对满分）</div>${avgHtml}</div>
  </div>
  <div class="panel" style="margin:0;"><div class="panel-title">🕐 最近测评动态</div>${recentHtml}</div>`;
}
function renderSchoolGrade(){
  const view=$('sg-view');if(!view)return;
  const u=DB.currentUser();if(!u||u.role!=='school_admin'){toast('该页面仅学校管理人员可用');go('home');return;}
  const persons=schoolPersons();
  $('sg-sub').innerHTML='按年级维度聚合，查看各年级需关注人数占比（脱敏）。年级由学生在注册时选择（小学一年级～博士研究生）。';
  const stages=['小学','初中','高中','大学本科','硕士研究生','博士研究生','未填写'];
  const gradeAgg={};
  stages.forEach(g=>gradeAgg[g]={n:0,risk:0,sum:0});
  persons.forEach(p=>{
    const st=gradeStageOf(p.grade||'');
    const g=st?st.name:(p.grade?'其他：'+p.grade:'未填写');
    if(!gradeAgg[g])gradeAgg[g]={n:0,risk:0,sum:0};
    gradeAgg[g].n++;
    const l=latestRecord(p);
    if(l&&(l.cls==='moderate'||l.cls==='severe'))gradeAgg[g].risk++;
    if(l)gradeAgg[g].sum+=l.cls==='severe'?3:l.cls==='moderate'?2:1;
  });
  const rows=Object.entries(gradeAgg).filter(([,d])=>d.n>0).sort((a,b)=>stages.indexOf(a[0])-stages.indexOf(b[0]));
  view.innerHTML=rows.length?`<div class="panel" style="margin:0 0 14px;">
    <div class="panel-title">🎓 各年级需关注占比</div>
    ${rows.map(([g,d])=>{const pct=Math.round(d.risk/d.n*100);return `<div class="mg-bar-row"><span class="lb">${esc(g)}</span><div class="bar"><i style="width:${pct}%;background:${pct>40?'#dc2626':pct>20?'#d97706':'#14b8a6'};min-width:${d.risk?6:0}px;animation:barGrow 1s ease-out;"></i></div><span class="num">${d.risk}/${d.n} 人</span></div>`;}).join('')}
    <p style="font-size:12px;color:var(--muted);margin-top:8px;">占比 = 该年级最近一次测评达到中度及以上的人数比例。红色 >40%，橙色 20-40%，绿色 <20%。</p>
  </div>
  <div class="mg-grid">
    <div class="panel" style="margin:0;"><div class="panel-title">📋 年级明细</div>${rows.map(([g,d])=>`<div class="history-item"><span>${esc(g)}（${d.n} 人）</span><span class="h-score ${d.risk?'mid':'good'}">需关注 ${d.risk} 人</span></div>`).join('')}</div>
    <div class="panel" style="margin:0;"><div class="panel-title">💡 干预建议</div><div style="font-size:13px;color:var(--muted);line-height:1.9;">· 高占比年级：优先安排团体心理辅导与减压活动，联系年级辅导员关注重点学生；<br>· 中占比年级：开展心理健康主题班会与测评复测；<br>· 小学/初中低龄段：注意用儿童友好的方式（绘画、游戏、语音树洞）表达情绪；<br>· 高中/大学段：结合考试季节奏，提前安排考前减压辅导。</div></div>
  </div>`:'<div class="empty">暂无年级数据。学生完成年级选择并测评后自动汇总。</div>';
}
let ledgerFilter='';
function ledgerItemsHtml(ledger,withActions){
  const statusMap={tracking:['跟进中','tracking'],improving:['好转中','improving'],closed:['已闭环','closed']};
  return ledger.length?ledger.map(e=>`<div class="ledger-item lv-${e.level}">
    <div class="lg-head"><span><b>${esc(e.nickname)}</b> @${esc(e.username)} · ${e.type==='sensitive'?'敏感词触发':'风险分级判定'}</span><span>${fmtDay(e.ts)}</span></div>
    <div>触发内容：${esc(e.trigger)}</div>
    <div style="margin-top:4px;">风险层级：<b style="color:${e.level==='high'?'var(--danger)':e.level==='mid'?'#b45309':'var(--teal)'};">${RISK_LABEL[e.level]?RISK_LABEL[e.level].name:e.level}</b> · 处理动作：${esc(e.action)}<span class="lg-status ${statusMap[e.status]?statusMap[e.status][1]:'tracking'}">${statusMap[e.status]?statusMap[e.status][0]:'跟进中'}</span></div>
    ${e.notes&&e.notes.length?`<div style="font-size:12px;color:var(--muted);margin-top:4px;">📌 ${e.notes.map(n=>esc(n.text)).join('；')}</div>`:''}
    ${withActions&&e.status!=='closed'?`<div style="margin-top:6px;"><button class="back-btn" style="color:var(--teal);border-color:var(--teal);" onclick="markLedgerClosed('${e.id}')">✅ 标记已闭环</button></div>`:''}
  </div>`).join(''):'<div class="empty">暂无风险事件。风险分级判定与敏感词触发会自动写入这里。</div>';
}
function refreshHomeIfActive(){if($('page-home')&&$('page-home').classList.contains('active'))renderHome();}
function markLedgerClosed(id){
  const l=getLedger();
  const e=l.find(x=>x.id===id);
  if(e){e.status='closed';e.notes.push({ts:Date.now(),text:'管理员标记已闭环'});saveLedger(l);toast('✅ 已标记为已闭环');}
  if($('page-school-focus').classList.contains('active'))renderSchoolFocus();
  if($('page-manage').classList.contains('active'))renderManage();
  refreshHomeIfActive();
}
function renderSchoolFocus(){
  const view=$('sf-view');if(!view)return;
  const u=DB.currentUser();if(!u||u.role!=='school_admin'){toast('该页面仅学校管理人员可用');go('home');return;}
  const persons=schoolPersons();
  $('sf-sub').innerHTML='重点关注名单 + 分级支持台账：每一次风险判定、敏感词触发、人工支持启动都记录在案，可筛选、可查询、可导出。';
  const focus=persons.filter(p=>{const l=latestRecord(p);return l&&(l.cls==='moderate'||l.cls==='severe');}).sort((a,b)=>(latestRecord(b).cls==='severe'?1:0)-(latestRecord(a).cls==='severe'?1:0));
  const focusHtml=focus.length?focus.map(p=>{const l=latestRecord(p);const s=l?SCALES.find(x=>x.id===l.scaleId):null;return `<div class="history-item"><span>${p.avatar?`<img class="u-ava" style="width:24px;height:24px;border-radius:50%;vertical-align:-5px;margin-right:6px;" src="${esc(p.avatar)}">`:''}<b>${esc(p.nickname)}</b> <span style="font-size:11px;color:#94a3b8;">@${esc(p.username)}</span>${p.grade?gradePillHtml(p.grade):''}</span><span class="h-score ${l.cls==='mild'?'good':l.cls==='moderate'?'mid':'bad'}">${l?esc(l.level):''}</span><button class="back-btn" style="color:var(--teal);border-color:var(--teal);" onclick="openReferral('${esc(p.username)}')">转介建议</button></div>`;}).join(''):'<div class="empty">当前没有中度及以上关注对象 🎉</div>';
  let ledger=ledgerForAdmin(u);
  const total=ledger.length;
  if(ledgerFilter==='high')ledger=ledger.filter(e=>e.level==='high');
  else if(ledgerFilter==='mid')ledger=ledger.filter(e=>e.level==='mid');
  else if(ledgerFilter==='low')ledger=ledger.filter(e=>e.level==='low');
  else if(ledgerFilter==='tracking')ledger=ledger.filter(e=>e.status==='tracking');
  else if(ledgerFilter==='improving')ledger=ledger.filter(e=>e.status==='improving');
  else if(ledgerFilter==='closed')ledger=ledger.filter(e=>e.status==='closed');
  const ledgerHtml=ledgerItemsHtml(ledger.slice(0,50),true);
  view.innerHTML=`
  <div class="panel" style="margin:0 0 14px;">
    <div class="panel-title">🧭 重点关注名单（${focus.length} 人）</div>${focusHtml}
  </div>
  <div class="panel" style="margin:0;">
    <div class="panel-title">📒 风险事件台账（共 ${total} 条 · 显示 ${ledger.length} 条）<button class="t-btn" style="margin-left:auto;font-size:12px;padding:4px 12px;" onclick="exportLedger()">⬇️ 导出台账 JSON</button></div>
    <div class="mg-toolbar"><select id="ledger-filter" onchange="ledgerFilter=this.value;renderSchoolFocus()">
      <option value="">全部事件</option><option value="high" ${ledgerFilter==='high'?'selected':''}>高风险</option><option value="mid" ${ledgerFilter==='mid'?'selected':''}>中风险</option><option value="low" ${ledgerFilter==='low'?'selected':''}>低风险</option><option value="tracking" ${ledgerFilter==='tracking'?'selected':''}>跟进中</option><option value="improving" ${ledgerFilter==='improving'?'selected':''}>好转中</option><option value="closed" ${ledgerFilter==='closed'?'selected':''}>已闭环</option>
    </select></div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:10px;">台账记录：时间 / 用户 / 触发内容 / 风险层级 / 处理动作 / 跟进状态。用户复测好转后状态自动更新为「好转中」；管理员可标记「已闭环」。</p>
    ${ledgerHtml}
  </div>`;
}
function exportLedger(){
  const u=DB.currentUser();if(!u)return;
  const data=ledgerForAdmin(u);
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='xinyu-risk-ledger-'+String(u.orgName||'org').replace(/[\\/:*?"<>|]/g,'_')+'-'+fmtDay(Date.now())+'.json';a.click();
  toast('✅ 已导出 '+data.length+' 条风险台账');
}
function renderSchoolPrivacy(){
  const view=$('sp-view');if(!view)return;
  const u=DB.currentUser();if(!u||u.role!=='school_admin'){toast('该页面仅学校管理人员可用');go('home');return;}
  $('sp-sub').innerHTML='平台隐私与数据口径说明。';
  view.innerHTML=`
  <div class="panel" style="margin:0 0 14px;">
    <div class="panel-title">🔒 脱敏与授权口径</div>
    <div style="font-size:13.5px;color:var(--muted);line-height:2;">
      · <b>聚合可见</b>：整体状态分布、量表平均分、年级占比——所有学校管理人员可见；<br>
      · <b>授权可见</b>：人员列表与逐题反应属于敏感个人数据，仅经学生本人知情同意后由授权人员查看，默认折叠；<br>
      · <b>完全不可见</b>：学生的 AI 聊天记录、树洞倾诉（含私密倾诉）、家庭绑定信息——对学校、家长均不可见；<br>
      · <b>风险台账</b>：仅记录风险事件（时间/层级/处理动作），用于分级支持闭环，不记录私人表达全文；<br>
      · <b>数据归属</b>：学生选择本校后数据进入本校台账；转校或修改归属后，旧数据不再计入。<br>
      · <b>存储</b>：演示版全部数据保存在用户本机浏览器（localStorage），不上传任何服务器。
    </div>
  </div>
  <div class="panel" style="margin:0 0 14px;">
    <div class="panel-title">🛡️ 分级支持伦理边界</div>
    <div style="font-size:13.5px;color:var(--muted);line-height:2;">
      · AI 不是医生，AI 仅提供辅助心理支持，不诊断、不开药、不替代专业诊疗；<br>
      · 高风险信号（测评重度 / 敏感词触发）自动启动人工支持流程：本平台负责提示与登记，实际转介由学校线下执行；<br>
      · 平台不会向任何人展示学生的私人表达内容，风险台账仅保留必要字段；<br>
      · 家长端仅展示孩子同意共享的测评与训练数据，聊天与树洞对家长不可见。
    </div>
  </div>
  <div class="panel" style="margin:0;">
    <div class="panel-title">📤 数据导出</div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:10px;">管理员可导出风险台账（分级支持闭环）与聚合统计（脱敏）。</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-soft" onclick="exportLedger()">⬇️ 导出风险台账</button><button class="btn btn-soft" onclick="exportSchoolStats()">📊 导出聚合统计</button></div>
  </div>`;
}
function exportSchoolStats(){
  const u=DB.currentUser();if(!u)return;
  const persons=schoolPersons();
  const agg=schoolScaleAgg(persons);
  const data={school:u.orgName,exportAt:new Date().toISOString(),cover:persons.length,scales:SCALES.map(s=>({id:s.id,name:s.name,count:agg[s.id].n,avg:agg[s.id].n?+(agg[s.id].sum/agg[s.id].n).toFixed(1):null,max:s.max})),persons:persons.map(p=>({username:p.username,nickname:p.nickname,grade:p.grade||'',latest:latestRecord(p)?{scaleId:latestRecord(p).scaleId,level:latestRecord(p).level,total:latestRecord(p).total,date:latestRecord(p).date}:null}))};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='xinyu-school-stats-'+fmtDay(Date.now())+'.json';a.click();
  toast('✅ 已导出聚合统计');
}
/* ── 心理课程资源库（v4，互联网公开资源） ── */
const COURSE_LIBRARY=[
  /* 小学（学段：primary） */
  {stage:'小学',sub:'认识情绪',title:'认识情绪：我的情绪小怪兽',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'教育部官方平台，心理健康专题含小学低年级情绪认知课程与动画资源，免费。',verified:true},
  {stage:'小学',sub:'认识情绪',title:'儿童心理成长动画（情绪篇）',src:'中国教育电视台',url:'https://www.cetv.cn/',desc:'面向低龄儿童的情绪认知动画与亲子共看内容，帮助孩子说出感受。',verified:true},
  {stage:'小学',sub:'情绪管理',title:'小学情绪管理课',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'官方课程包：认识喜怒哀惧、情绪表达与调节（平台内检索“心理健康”专题）。',verified:true},
  {stage:'小学',sub:'情绪管理',title:'儿童情绪调节小课堂',src:'中国教育电视台',url:'https://www.cetv.cn/',desc:'动画形式的情绪调节方法：生气时怎么办、难过时怎么办。',verified:true},
  {stage:'小学',sub:'同伴交往',title:'小学同伴交往课',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'交朋友、处理小矛盾、学会分享与轮流，低年级社交启蒙。',verified:true},
  {stage:'小学',sub:'亲子共读',title:'亲子共读·心理绘本',src:'中国家庭教育学会',url:'https://www.cfea.org.cn/',desc:'推荐心理主题绘本清单与共读方法，让情绪教育发生在睡前故事里。',verified:true},
  /* 初中（学段：junior） */
  {stage:'初中',sub:'青春期成长',title:'青春期成长：身体与情绪的变化',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'初中心理健康专题：青春期生理心理变化、自我同一性探索，官方免费。',verified:true},
  {stage:'初中',sub:'青春期成长',title:'初中生心理健康讲座',src:'中国教育学会',url:'https://www.cse.edu.cn/',desc:'面向初中生的心理讲座资源，含青春期情绪与自我认同主题。',verified:true},
  {stage:'初中',sub:'人际交往',title:'人际交往与人际边界',src:'中小学心理健康教育网',url:'http://www.xinli120.com/',desc:'同伴关系、师生关系、沟通技巧与边界意识。',verified:true},
  {stage:'初中',sub:'自我认知',title:'认识自己：优势与性格探索',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'自我认知专题：发现自己的优势、接纳不完美、建立自信。',verified:true},
  /* 高中（学段：senior） */
  {stage:'高中',sub:'压力管理',title:'压力管理与考试焦虑',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'高中段心理健康课程：考试焦虑识别、压力调节策略。',verified:true},
  {stage:'高中',sub:'压力管理',title:'高中生心理健康讲座',src:'中国教育学会',url:'https://www.cse.edu.cn/',desc:'面向高中生的心理讲座资源与教师指导材料，含减压主题。',verified:true},
  {stage:'高中',sub:'考试焦虑',title:'考前心理调适指南',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'考前一周与考中情绪管理：稳定心态、正常发挥（平台内检索“考试心理”）。',verified:true},
  {stage:'高中',sub:'生涯规划',title:'高中生涯规划启蒙',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'选科与专业方向探索：兴趣、能力与价值观的自我盘点。',verified:true},
  /* 大学（学段：college） */
  {stage:'大学',sub:'情绪调节',title:'大学生心理健康（慕课）',src:'中国大学MOOC',url:'https://www.icourse163.org/',desc:'多所高校开设的大学生心理健康慕课：情绪、压力、人际、恋爱与自我成长，免费旁听。',verified:true},
  {stage:'大学',sub:'情绪调节',title:'情绪管理与压力调节',src:'学堂在线',url:'https://www.xuetangx.com/',desc:'清华大学等名校情绪管理公开课：识别情绪、调节情绪、建立心理韧性。',verified:true},
  {stage:'大学',sub:'学业压力',title:'清华·大学生心理健康',src:'学堂在线',url:'https://www.xuetangx.com/',desc:'清华大学心理健康公开课，含学业压力管理与积极心理学，免费。',verified:true},
  {stage:'大学',sub:'学业压力',title:'学习科学与高效备考',src:'中国大学MOOC',url:'https://www.icourse163.org/',desc:'学习方法与备考策略课程：记忆、专注、拖延管理与考试心态。',verified:true},
  {stage:'大学',sub:'人际关系',title:'心理学与生活（公开课）',src:'网易公开课',url:'https://open.163.com/',desc:'名校心理学公开课合集：人际吸引、亲密关系与沟通心理。',verified:true},
  {stage:'大学',sub:'人际关系',title:'大学生人际交往与宿舍关系',src:'中国大学MOOC',url:'https://www.icourse163.org/',desc:'宿舍相处、社交焦虑、表达与倾听：大学人际关系必修课。',verified:true},
  {stage:'大学',sub:'自我成长',title:'积极心理学公开课',src:'学堂在线',url:'https://www.xuetangx.com/',desc:'幸福感、优势品格与意义感：用科学方法经营大学生活。',verified:true},
  {stage:'大学',sub:'睡眠健康',title:'大学生睡眠健康与作息管理',src:'中国大学MOOC',url:'https://www.icourse163.org/',desc:'熬夜修复、睡眠卫生、考前作息调整：睡得好才学得好。',verified:true},
  /* 研究生（学段：master / doctor） */
  {stage:'研究生',sub:'科研压力',title:'科研压力调适与学术心理',src:'中国大学MOOC',url:'https://www.icourse163.org/',desc:'研究生科研压力来源识别、课题焦虑应对、导师沟通方法。',verified:true},
  {stage:'研究生',sub:'科研压力',title:'博士生心理韧性课',src:'学堂在线',url:'https://www.xuetangx.com/',desc:'长周期科研中的情绪管理：倦怠预防、失败应对与自我关怀。',verified:true},
  {stage:'研究生',sub:'学术心理',title:'学术生涯与心理健康',src:'中国心理学会',url:'https://www.cpsbeijing.org/',desc:'学术圈心理健康议题：发表压力、同辈比较与支持系统建设。',verified:true},
  /* 家长 */
  {stage:'家长',sub:'亲子沟通',title:'亲子沟通的科学方法',src:'中国家庭教育学会',url:'https://www.cfea.org.cn/',desc:'家庭教育官方指导：亲子沟通、情绪教养、儿童青少年心理发展规律。',verified:true},
  {stage:'家长',sub:'亲子沟通',title:'家庭教育公开课',src:'国家中小学智慧教育平台·家庭教育',url:'https://basic.smartedu.cn/',desc:'教育部家庭教育专题：不同年龄段孩子的心理需求与沟通要点，免费。',verified:true},
  {stage:'家长',sub:'情绪教养',title:'儿童情绪教养课',src:'中国家庭教育学会',url:'https://www.cfea.org.cn/',desc:'如何接住孩子的情绪：共情、命名情绪、设立温柔而坚定的边界。',verified:true},
  {stage:'家长',sub:'心理健康知识',title:'家长心理健康必修课',src:'国家中小学智慧教育平台',url:'https://basic.smartedu.cn/',desc:'识别孩子心理问题早期信号：厌学、失眠、情绪突变时家长怎么做。',verified:true},
  /* 教师 */
  {stage:'教师',sub:'危机识别',title:'学生心理危机识别与干预',src:'中国心理学会',url:'https://www.cpsbeijing.org/',desc:'心理学专业学会发布的危机识别、转介流程与伦理规范资料。',verified:true},
  {stage:'教师',sub:'危机识别',title:'校园心理危机预警培训',src:'中小学心理健康教育网',url:'http://www.xinli120.com/',desc:'班主任与心理老师适用的预警信号清单与三级预警流程。',verified:true},
  {stage:'教师',sub:'课堂心理辅导',title:'校园心理教师工作指南',src:'中小学心理健康教育网',url:'http://www.xinli120.com/',desc:'心理老师日常工作参考：班级心理辅导、个案记录、转介协作。',verified:true},
  {stage:'教师',sub:'课堂心理辅导',title:'心理健康教育课设计与实施',src:'中国教育学会',url:'https://www.cse.edu.cn/',desc:'心理课教案、团体辅导活动设计与课堂管理方法。',verified:true},
  {stage:'教师',sub:'转介协作',title:'家校社协同与转介协作指南',src:'中国心理学会',url:'https://www.cpsbeijing.org/',desc:'发现—沟通—转介—跟进的协作流程与文书规范。',verified:true},
  /* 危机 */
  {stage:'危机',sub:'危机干预',title:'12356 全国心理援助热线',src:'国家卫生健康委',url:'https://www.nhc.gov.cn/',desc:'24 小时免费心理援助热线，危机时刻的第一选择（演示页内多次提示）。',verified:true},
  {stage:'危机',sub:'危机干预',title:'心理危机干预资源',src:'北京心理危机研究与干预中心',url:'https://www.crisis.org.cn/',desc:'国内权威危机干预机构，提供危机评估、干预与家属支持资源。',verified:true},
  {stage:'危机',sub:'紧急资源',title:'青少年心理危机信号识别',src:'中国心理学会',url:'https://www.cpsbeijing.org/',desc:'家长与社区工作者适用的危机信号清单：语言/行为/情绪三类信号。',verified:true},
  /* 普适 */
  {stage:'普适',sub:'心理科普',title:'KnowYourself 心理科普',src:'KnowYourself',url:'https://www.knownYourself.cc/',desc:'青少年与青年心理科普：情绪、关系、自我成长，通俗易读。',verified:true},
  {stage:'普适',sub:'心理科普',title:'简单心理·心理百科',src:'简单心理',url:'https://www.jiandanxinli.com/',desc:'专业心理服务平台的心理科普与自助内容，提供咨询预约入口。',verified:true},
  {stage:'普适',sub:'自助工具',title:'壹心理·心理课堂',src:'壹心理',url:'https://www.xinli001.com/',desc:'大众心理课堂：情绪管理、人际沟通、原生家庭等主题课程。',verified:true}
];
const COURSE_SUB_ICONS={'认识情绪':'🎈','情绪管理':'🌤️','同伴交往':'🤝','亲子共读':'📖','青春期成长':'🌱','人际交往':'👥','自我认知':'🪞','压力管理':'🌿','考试焦虑':'📝','生涯规划':'🧭','情绪调节':'🌈','学业压力':'📚','人际关系':'💬','自我成长':'🌻','睡眠健康':'🌙','科研压力':'🔬','学术心理':'🛡️','亲子沟通':'💗','情绪教养':'🌷','心理健康知识':'📘','危机识别':'🚨','课堂心理辅导':'🏫','转介协作':'🔗','危机干预':'🛟','紧急资源':'🆘','心理科普':'💡','自助工具':'🧰'};
/* 课程范围：按身份严格过滤 —— 你是谁，就只给你适合的课程 */
function courseScopeFor(u){
  if(!u||!u.role)return {stages:['普适'],label:'访客',tip:'登录并选择身份后，课程库会只展示适合你的课程' };
  if(u.role==='parent')return {stages:['家长'],label:'家长',tip:'已按身份过滤：仅展示家长专属课程' };
  if(u.role==='school_admin')return {stages:['教师'],label:'教师',tip:'已按身份过滤：仅展示教师/心理老师专属课程' };
  if(u.role==='community_admin')return {stages:['危机','普适'],label:'社区工作者',tip:'已按身份过滤：仅展示危机干预与心理科普课程' };
  const st=gradeStageOf(u.grade||'');
  if(!st)return {stages:['普适'],label:'用户',tip:'完成年级选择后，课程库会只展示你所在学段的课程' };
  const map={primary:['小学'],junior:['初中'],senior:['高中'],college:['大学'],master:['研究生'],doctor:['研究生']};
  return {stages:map[st.key]||['普适'],label:st.name,stage:st,tip:'已按你的年级（'+u.grade+'）过滤：仅展示「'+st.name+'」学段课程，其他学段不显示' };
}
let courseFilter='全部';
function renderCourses(){
  const view=$('course-view');if(!view)return;
  const u=DB.currentUser();
  const scope=courseScopeFor(u);
  const visible=COURSE_LIBRARY.filter(c=>scope.stages.includes(c.stage));
  const subs=['全部',...Array.from(new Set(visible.map(c=>c.sub||'其他')))];
  if(!subs.includes(courseFilter))courseFilter='全部'; /* 跨身份/跨学段切换时重置残留筛选 */
  const list=visible.filter(c=>courseFilter==='全部'||(c.sub||'其他')===courseFilter);
  const primary=isPrimaryStudent(u),progress=DB.getData('courseProgress',{});
  renderPrimaryModuleCopy('courses');
  const card=(c)=>{const idx=COURSE_LIBRARY.indexOf(c),cp=progress[c.id||idx]||{};return `<div class="course-card">
      <span class="cc-stage">${COURSE_SUB_ICONS[c.sub]||'✨'} ${esc(c.sub||'课程')} · ${c.stage}</span><h4>${esc(c.title)}</h4><p>${esc(c.desc)}</p><div class="cc-src">来源：${esc(c.src)} · ${c.verified?'已验证可访问':'待核实'}</div>
      ${primary?`<button class="course-start" onclick="openPrimaryCourse(${idx})">${cp.completed?'再次学习':'开始学习'}</button><small class="course-state">${cp.completed?'已完成 · 进度已保存':cp.progress?'已学习 '+cp.progress+'%':'跟着小步骤慢慢学'}</small>`:`<a href="${esc(c.url)}" target="_blank" rel="noopener" onclick="trackCourseVisit(${idx})">前往学习 →</a>`}</div>`;};
  view.innerHTML=`
    <div class="role-tip" style="background:linear-gradient(135deg,#f0fdfa,#e0f2fe);border-color:#a5f3fc;">🎯 当前为你展示：<b>${esc(scope.label)}${u&&u.grade?'（'+esc(u.grade)+'）':''}</b> 专属课程 · 共 ${visible.length} 门 · ${scope.tip}</div>
    <div class="course-filter">${subs.map(s=>`<button class="${courseFilter===s?'on':''}" onclick="courseFilter='${s}';renderCourses()">${COURSE_SUB_ICONS[s]||''} ${s}${s!=='全部'?'（'+visible.filter(c=>(c.sub||'其他')===s).length+'）':''}</button>`).join('')}</div>
    <div class="course-grid">${list.map(card).join('')}</div>
    <p style="font-size:12px;color:var(--muted);margin-top:14px;">📌 课程库按你的身份与年级自动过滤（学生按学段、家长只看家长课、教师只看教师课），子模块标签可切换。所有资源来自互联网公开渠道（教育部官方平台 / 高校慕课 / 专业机构），仅供学习参考，不构成医疗建议。</p>
    <div id="course-visits"></div>`;
  renderCourseVisits();
}
function trackCourseVisit(i){
  const u=DB.currentUser();if(!u)return;
  const c=COURSE_LIBRARY[i];if(!c)return;
  const visits=DB.getData('courseVisits',[]);
  visits.unshift({title:c.title,stage:c.stage,url:c.url,ts:Date.now()});
  DB.setData('courseVisits',visits.slice(0,50));
  if(!isPrimaryStudent(u))awardPetForTask('课程库');
}
function primaryCourseKey(c,i){return String(c.id||i);}
function openPrimaryCourse(i,step){
  const u=DB.currentUser(),c=COURSE_LIBRARY[i];if(!isPrimaryStudent(u)||!c)return;
  const all=DB.getData('courseProgress',{}),key=primaryCourseKey(c,i),p=all[key]||{courseId:key,startedAt:Date.now(),progress:0,completed:false,rewarded:false,reflection:''};
  p.lastOpenedAt=Date.now();all[key]=p;DB.setData('courseProgress',all);
  const s=Math.max(0,Math.min(2,step==null?Math.floor((p.progress||0)/34):step)),titles=['先认识一下','记住一个小方法','写下你的小收获'];
  openModal(`<div class="primary-course-modal"><span class="course-step">第 ${s+1} 步，共 3 步</span><h2>${esc(c.title)}</h2><div class="course-progress"><i style="width:${p.completed?100:(s+1)*33.34}%"></i></div><section><h3>${titles[s]}</h3>${s===0?`<p>${esc(c.desc)}</p><p>不用一次记住所有内容，先找到最想了解的一点就好。</p>`:s===1?`<p>遇到相似的心情时，可以先停一下，慢慢呼吸，再选择一个自己做得到的小行动。</p><a href="${esc(c.url)}" target="_blank" rel="noopener" onclick="trackCourseVisit(${i})">查看延伸阅读</a>`:`<textarea id="course-reflection" rows="4" placeholder="这节课里，哪一点对你有帮助？">${esc(p.reflection||'')}</textarea>`}</section><div class="course-modal-actions">${s?`<button class="btn btn-soft" onclick="savePrimaryCourseStep(${i},${s-1})">上一步</button>`:''}<button class="btn btn-teal" onclick="${s<2?'savePrimaryCourseStep('+i+','+(s+1)+')':'finishPrimaryCourse('+i+')'}">${s<2?'下一步':'完成课程'}</button></div></div>`);
}
function savePrimaryCourseStep(i,next){const c=COURSE_LIBRARY[i],all=DB.getData('courseProgress',{}),key=primaryCourseKey(c,i),p=all[key]||{};p.progress=Math.max(p.progress||0,next*34);p.updatedAt=Date.now();all[key]=p;DB.setData('courseProgress',all);openPrimaryCourse(i,next);}
function finishPrimaryCourse(i){
  const c=COURSE_LIBRARY[i],all=DB.getData('courseProgress',{}),key=primaryCourseKey(c,i),p=all[key]||{},reflection=($('course-reflection')||{}).value||'';
  if(!reflection.trim()){toast('写下一点小收获，再完成这节课吧');return;}
  p.reflection=reflection.trim();p.progress=100;p.completed=true;p.completedAt=p.completedAt||Date.now();
  if(!p.rewarded&&completePrimaryTask('course',key,'课程学习')){p.rewarded=true;p.rewardedAt=Date.now();}
  all[key]=p;DB.setData('courseProgress',all);closeModal();renderCourses();toast('课程完成啦，进度已经保存');
}
function renderPrimaryModuleCopy(page){
  const primary=isPrimaryStudent(DB.currentUser());
  if(page==='train'&&$('train-title')){$('train-title').textContent=primary?'自助训练':'🧠 自助训练';$('train-sub').textContent=primary?'跟着小步骤慢慢练习，为心情补充一点力量。':'基于积极心理学与 CBT/正念等循证方法设计的练习，训练记录保存在你的账号下。';}
  if(page==='community'&&$('community-title')){
    $('community-title').textContent=primary?'心屿树洞':'🫧 心屿 树洞';$('community-intro').hidden=!primary;$('community-standard-sub').hidden=primary;$('post-input').placeholder=primary?'此刻想说点什么？写多少都可以。':'此刻你想说什么？情绪没有对错，说出来就会被接住……';
    const scene=$('primary-tree-scene'),pet=$('tree-pet');if(scene)scene.hidden=!primary;if(pet&&primary){const d=primaryPet();pet.hidden=!d.type;if(d.type){pet.src='assets/pet-'+d.type+'.png';pet.alt=d.type==='dog'?'守在树洞旁的小狗':'守在树洞旁的小猫';}}
  }
  if(page==='courses'&&$('courses-title')){$('courses-title').textContent=primary?'课程库':'📚 心理课程资源库';$('courses-sub').textContent=primary?'挑一节感兴趣的小课，慢慢学会照顾自己的心情。':'精选来自互联网的公开心理健康教育资源，按学段与方向分类，全部免费可访问，按年级智能匹配。';}
}
function renderCourseVisits(){
  const el=$('course-visits');if(!el)return;
  const u=DB.currentUser();
  const scope=courseScopeFor(u);
  const v=(DB.getData('courseVisits',[])).filter(x=>scope.stages.includes(x.stage)); /* 足迹按当前身份过滤 */
  el.innerHTML=v.length?`<div class="panel-title" style="margin-top:16px;">🕐 我的学习足迹（${v.length}）</div>`+v.slice(0,10).map(x=>`<div class="history-item"><span>${esc(x.title)} <span class="grade-pill g-college">${esc(x.stage)}</span></span><span style="font-size:11.5px;color:#94a3b8;">${fmtDay(x.ts)}</span></div>`).join(''):'';
}
function init(){
  const u=DB.currentUser();
  applyTheme(u);
  if(u&&u.role&&!NAV_DEFS[u.role]){u.role='normal';DB.saveUser(u);syncRoster(u);}
  if(u){
    renderUserArea();renderHome();renderNavAdmin();
    if(!u.role){showRolePage();}
    else{go('home');}
  }else{
    showAuth();
  }
  renderScaleGrid();
  renderTrainGrid();
  renderPrimaryModuleCopy('train');renderPrimaryModuleCopy('community');renderPrimaryModuleCopy('courses');
  initChat();
  renderPosts();
  renderKnowledge();
  if(u)renderProfile();
  /* 预加载语音音色列表（getVoices 异步返回，提前触发避免首次播放无音色） */
  if('speechSynthesis' in window){try{window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=function(){window.speechSynthesis.getVoices();};}catch(e){}}
  ensureDemoAccounts().then(()=>{renderDemoAccounts();applyTheme(DB.currentUser());});
}
init();
