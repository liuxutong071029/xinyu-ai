# 心屿 MindIsle v3.0「焕彩主题版」

面向心理资源不足地区青少年的 AI 心理陪伴与支持平台(中国国际大学生创新大赛参赛项目)。本仓库为 **v3.0 焕彩主题版**:小学阶段界面零改动的前提下,为初中/高中端提供 12 套全局可切换主题,并附零依赖后端 MVP(注册/登录/AI 聊天/测评/树洞/四角色权限)与 Supabase 数据库迁移脚本。

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | 原生 HTML + CSS + JavaScript | 单页应用,无框架、无构建步骤、无 npm 依赖,双击即用 |
| 后端 | Node.js(≥18,零外部依赖) | 仅用内置 http/crypto + Node 全局 fetch;不需要 `npm install` |
| 数据库 | 本地 JSON(mock 模式)/ Supabase PostgreSQL(可选) | 未配置 Supabase 时自动降级为 `server/data/db.json` |
| AI | OpenAI 兼容接口 / 内置规则回复 | 未配置 AI_API_KEY 时自动用内置规则(含记忆引用/情绪识别/风险提示) |

## 功能简介

- **12 套全局主题**:甜美风、甜酷风、简约清新、科技风、治愈校园(默认)、萌趣卡通、元气校园、静谧蓝调、轻复古胶片、轻量赛博、马卡龙柔和、极简黑白;登录后右上角 🎨 即点即换,刷新保持(仅初中/高中学生与演示账号生效,小学界面完全不变)
- **登录/注册系统**:注册、登录、身份选择(学生/普通用户/学校管理员/家长/社区管理员)、演示账号一键登录
- **学生端**:首页、心理成长档案、测评中心(PHQ-9/GAD-7/PSS-10/ISI/RSES + 青少年专项)、AI 疏导、自助训练、心屿树洞、课程库、个人中心
- **家长端**:家庭邀请码绑定、孩子心理变化、沟通课堂、家庭互动
- **学校端**:心理驾驶舱(脱敏聚合:学生数/测评数/趋势/主要压力源)、年级分析、重点关注与转介
- **社区端**:区域概览、资源连接、转介闭环
- **后端 API**:POST /api/register、/api/login、GET /api/user/profile、POST /api/ai/create、POST /api/chat(记忆引用+情绪识别+风险分级+去诊断)、测评/树洞/家庭/统计/行为台账
- **数据持久化**:前端 localStorage;后端 JSON 文件或 Supabase(9 张表 + 15 条 RLS 四角色权限策略)

## 项目目录说明

```
MindIsle-v3/
├── README.md              本文件
├── .gitignore             Git 忽略规则(密钥/数据/日志)
├── package.json           根元信息(启动脚本,零依赖)
├── frontend/              前端(静态文件,直接部署)
│   ├── index.html         入口(带缓存版本号)
│   ├── styles.css         基础样式(v2.3 原样)
│   ├── themes.css         12 套主题样式(新增)
│   ├── app.js             应用逻辑(v2.3 原样 + 61 行主题新增)
│   └── favicon.svg        图标
├── server/                后端(零依赖 Node API)
│   ├── index.js           入口
│   ├── routes/            7 个路由模块(auth/ai/assessment/behavior/family/stats/treehole)
│   ├── lib/               存储驱动/鉴权/AI 引擎/LLM 适配
│   ├── scripts/smoke.js   31 项端到端冒烟自测
│   ├── seed.js            演示数据种子
│   ├── data/              mock 数据(已 .gitignore,自动生成)
│   └── .env.example       环境变量示例
├── database/
│   └── migrate.sql        Supabase 迁移脚本(9 表 + RLS + 演示种子)
└── docs/
    ├── 项目介绍.md
    ├── 部署运行说明.md
    ├── 测试账号说明.md
    ├── 验收说明.md
    ├── api文档.md         全部接口 curl 示例
    ├── 权限隔离验证记录.md 四角色权限矩阵
    ├── 验收总览.html       双击可看的验收报告
    └── 部署与回滚手册.md
```

## 前端启动方法

前端是**纯静态站点,不需要任何安装或构建**:

1. 直接双击 `frontend/index.html` 即可打开(所有功能本地可用,数据存浏览器 localStorage);
2. 或部署到任意静态托管(GitHub Pages / Nginx / Vercel),上传 `frontend/` 目录内容即可;
3. 想让后端同时托管前端(推荐演示方式):`cd server` 后运行 `STATIC_DIR=../frontend node index.js`,再访问 http://127.0.0.1:3001/ 。
   Windows PowerShell 写法:`$env:STATIC_DIR="../frontend"; node index.js`

## 后端启动方法

```bash
cd server
node index.js                    # 零依赖,无需 npm install;默认端口 3001,纯 API 模式
node scripts/smoke.js            # 预期输出:31 通过 / 0 失败
node seed.js                     # 重置演示数据
# 同时托管前端(可选):
# Linux/macOS: STATIC_DIR=../frontend node index.js
# Windows PowerShell: $env:STATIC_DIR="../frontend"; node index.js
```

## 数据库配置方法(可选)

1. 在 supabase.com 创建免费项目;
2. 打开 SQL Editor,粘贴 `database/migrate.sql` 全文并执行;
3. 设置环境变量后重启服务:

```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=*** node index.js
```

不配置时服务自动使用本地 `server/data/db.json`(mock 模式),全部功能可用。

## 环境变量说明

| 变量 | 默认 | 说明 |
|---|---|---|
| PORT | 3001 | 服务端口 |
| JWT_SECRET | 自动生成存 data/secret.txt | HMAC token 密钥 |
| SUPABASE_URL / SUPABASE_SERVICE_KEY | 留空 | 配置后走 Supabase,否则本地 JSON |
| AI_API_KEY / AI_BASE_URL / AI_MODEL | 留空 | 配置后走真实大模型,否则内置规则回复 |
| STATIC_DIR | 空 | 静态托管目录;本包前端在 ../frontend,演示托管时设 `../frontend` |

## 演示账号说明

登录页「演示账号一键登录」,密码统一 `demo123456`:

| 账号 | 角色 | 说明 |
|---|---|---|
| demo-stu1 | 学生(小雨同学) | 已带测评/训练演示数据,登录后可用 🎨 切换 12 套风格 |
| demo-user1 | 普通用户(林间用户) | 标准界面 |
| demo-admin1 | 学校管理人员(张老师) | 学校心理驾驶舱 |
| demo-parent1 | 家长(李妈妈) | 已绑定小雨,查看孩子趋势 |
| demo-com1 | 社区管理人员(王主任) | 区域概览与转介 |

## 部署说明

- **GitHub Pages(新旧并存)**:仓库中新建 `v3/` 目录,上传 `frontend/` 内文件(旧文件不动),访问 `https://<用户名>.github.io/<仓库名>/v3/`;回滚 = 删除 v3/ 目录。
- **完整部署**:`node server/index.js` 同时提供 API 与静态托管。
- 详见 `docs/部署运行说明.md` 与 `docs/部署与回滚手册.md`。

## 安全声明

- AI 输出不构成医学诊断;高风险检测仅提示「建议寻求专业帮助」并附 12356 热线;
- 演示数据全部虚构脱敏;上传 GitHub 前请确认 `server/data/`(含自动生成的 secret 与本地数据)已被 .gitignore 排除(本仓库已配置)。
