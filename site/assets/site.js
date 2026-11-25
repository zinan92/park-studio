/* Park Studio Official Site — Selling-Point-First Kinetic Visuals (12 Platforms) + Open-Source / ¥199 Community / Custom Builds + 6-Case Lightbox */
(function () {
  'use strict';

  const GITHUB_REPO = 'zinan92/park-studio';
  const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

  const PLATFORMS_12 = [
    { id: 'douyin',    zh: '抖音',   en: 'Douyin',    group: 'cn', guard: true,  color: '#EDEDED' },
    { id: 'xhs',       zh: '小红书', en: 'XHS',       group: 'cn', guard: true,  color: '#F87171' },
    { id: 'bilibili',  zh: 'B站',    en: 'Bilibili',  group: 'cn', guard: true,  color: '#38BDF8' },
    { id: 'channels',  zh: '视频号', en: 'Channels',  group: 'cn', guard: true,  color: '#F5A524' },
    { id: 'wechat',    zh: '公众号', en: 'WeChat OA', group: 'cn', guard: false, color: '#3DD68C' },
    { id: 'youtube',   zh: 'YouTube',en: 'YouTube',   group: 'gl', guard: false, color: '#FF5A5F' },
    { id: 'x',         zh: 'X',      en: 'X',         group: 'gl', guard: false, color: '#A78BFA' },
    { id: 'tiktok',    zh: 'TikTok', en: 'TikTok',    group: 'gl', guard: false, color: '#2DD4BF' },
    { id: 'instagram', zh: 'Instagram', en: 'Instagram', group: 'gl', guard: false, color: '#EC4899' },
    { id: 'threads',   zh: 'Threads',en: 'Threads',   group: 'gl', guard: false, color: '#C4B5FD' },
    { id: 'linkedin',  zh: 'LinkedIn', en: 'LinkedIn',group: 'gl', guard: false, color: '#60A5FA' },
    { id: 'meta',      zh: 'Meta',   en: 'Meta',      group: 'gl', guard: false, color: '#7C9BF5' },
  ];

  const CASES = [
    {
      id: 'paile',
      name: { zh: '拍了个卖', en: 'Pailegemai (E-Commerce Studio)' },
      tag: { zh: '电商工作流', en: 'E-Commerce' },
      desc: { zh: '电商商品图 AI 出图与短视频自动化生成工作台，支持多模型路由与客户工作区管理。', en: 'Automated e-commerce product photo & short-video generation workbench with multi-provider routing.' },
      shots: [
        { src: 'assets/cases/paile-1.png', cap: { zh: '拍了个卖 · 工作台首屏', en: 'Workspace home' } },
        { src: 'assets/cases/paile-2.png', cap: { zh: '拍了个卖 · 电商商品出图与视频案例', en: 'Product image & video examples' } },
        { src: 'assets/cases/paile-3.png', cap: { zh: '拍了个卖 · 客户账号与历史任务台', en: 'Client workspace & history' } },
      ],
    },
    {
      id: 'getfit',
      name: { zh: '轻练', en: 'Get-Fit (Coach & Member CRM)' },
      tag: { zh: '会员管理系统', en: 'Member CRM' },
      desc: { zh: '面向健身私教的 30 天训练与饮食计划、会员跟进与续费管理全套系统。', en: '30-day workout & nutrition planning, client review, and membership management for personal trainers.' },
      shots: [
        { src: 'assets/cases/getfit-1.png', cap: { zh: '轻练 · 产品总览与小程序界面', en: 'Product overview' } },
        { src: 'assets/cases/getfit-2.png', cap: { zh: '轻练 · 教练端学员进度复盘', en: 'Coach client review' } },
        { src: 'assets/cases/getfit-3.png', cap: { zh: '轻练 · 教练端训练计划编辑', en: 'Coach plan editor' } },
      ],
    },
    {
      id: 'tianji',
      name: { zh: '天机', en: 'Tianji (AI Metaphysics App)' },
      tag: { zh: '垂类 AI 应用', en: 'Vertical AI App' },
      desc: { zh: '传统命理排盘引擎结合 AI 深度结构化解读，覆盖桌面端与移动端 PWA。', en: 'Traditional charting engine paired with structured AI interpretation across desktop & mobile.' },
      shots: [
        { src: 'assets/cases/tianji-1.png', cap: { zh: '天机 · 桌面端盘面与可信度分析', en: 'Desktop charting & analysis' } },
        { src: 'assets/cases/tianji-2.png', cap: { zh: '天机 · 移动端流年与大运视图', en: 'Mobile decadal view' } },
        { src: 'assets/cases/tianji-3.png', cap: { zh: '天机 · 产品界面展示', en: 'Product interface' } },
      ],
    },
    {
      id: 'trading',
      name: { zh: '交易系统（Trading System）', en: 'Trading System (DCA & Grid Bot)' },
      tag: { zh: 'DCA / Grid Bot', en: 'Quant Bots' },
      desc: { zh: '自动化 DCA Bot 与 Grid Bot 量化交易台，含多交易所策略配置、风控确认与实时运行监控。', en: 'Automated DCA & Grid Bot workbench with venue/strategy controls, risk confirmation, and live execution.' },
      shots: [
        { src: 'assets/cases/trading-1.png', cap: { zh: '交易系统 · 策略实时运行监控', en: 'Live strategy monitor' } },
        { src: 'assets/cases/trading-2.png', cap: { zh: '交易系统 · 交易所、标的与策略配置', en: 'Venue, instrument & strategy setup' } },
        { src: 'assets/cases/trading-3.png', cap: { zh: '交易系统 · 风控与历史执行追踪', en: 'Supervisor & execution history' } },
      ],
    },
    {
      id: 'journal',
      name: { zh: 'Trade Journal', en: 'Trade Journal (K-Line Review)' },
      tag: { zh: '交易复盘系统', en: 'Trading Review' },
      desc: { zh: '命令行秒调 K 线复盘日记台，支持 4 类交易锚点标注、AI 纪律复盘与实时波动率雷达。', en: 'Slash-command K-line review journal with 4-type trade anchors, AI discipline coaching, and volatility radar.' },
      shots: [
        { src: 'assets/cases/journal-1.png', cap: { zh: 'Trade Journal · 市场快照与复盘工作台', en: 'Market snapshot & review workbench' } },
        { src: 'assets/cases/journal-2.png', cap: { zh: 'Trade Journal · 交互式 K 线与锚点复盘', en: 'Interactive K-line & trade anchors' } },
        { src: 'assets/cases/journal-3.png', cap: { zh: 'Trade Journal · 主动波动教练与 VIX 雷达', en: 'Proactive volatility coach & radar' } },
      ],
    },
    {
      id: 'ashare',
      name: { zh: 'A 股看盘看板', en: 'A-Share Timing Panel' },
      tag: { zh: '独立看盘看板', en: 'Market Dashboard' },
      desc: { zh: '独立收盘三段式 A 股择时看板：大盘位置硬门 → 攻防倾向判断 → 板块与个股定量漏斗。', en: 'Standalone 3-stage post-close A-share timing dashboard: market regime, offense/defense bias, and stock funnel.' },
      shots: [
        { src: 'assets/cases/ashare-1.png', cap: { zh: 'A 股看板 · ① 大盘位置与趋势门控', en: 'Stage 1: Market regime gate' } },
        { src: 'assets/cases/ashare-2.png', cap: { zh: 'A 股看板 · ② 攻防倾向与强势板块', en: 'Stage 2: Bias & sector strength' } },
        { src: 'assets/cases/ashare-3.png', cap: { zh: 'A 股看板 · ③ 个股定量筛选漏斗', en: 'Stage 3: Candidate stock funnel' } },
      ],
    },
  ];

  const I18N = {
    zh: {
      title: 'Park Studio · 开源本地内容生产线（12 平台按需分发 · 零 API 费）',
      desc: '100% MIT 开源本地内容工作台：一个人顶 4 人内容团队，每天只挑 1 条好题穿透 12 个平台，数据 100% 留在硬盘。附 ¥199 实战微信群与企业定制开发案例。',
      nav: { features: '五个视图', charts: '核心卖点', ai: 'AI 协作', deploy: '本地部署', community: '社群与定制', docs: '文档', demo: '在线演示', langLabel: 'EN' },
      hero: {
        eyebrow: '100% MIT 开源 · GitHub 免费获取 · 12 平台按需分发 · 零 API 费',
        h1a: '一个人，',
        h1b: '顶一个 4 人内容团队。',
        lead: '每天只从日报和 Obsidian 里挑 1 条最值得讲的选题，在本地完成写稿、离线粗剪与 12 平台按需安全填表。代码全部开源，数据永远留在你的硬盘。',
        ctaDemo: '在线演示',
        ctaDeploy: '免费开源部署',
        subJoin: '不想折腾终端？',
        subLink: '¥199 预约 Mac 桌面签名版 · 加入实战群 / 聊团队定制 →',
      },
      features: {
        eyebrow: '五个视图',
        h2: '一套工作台，五个视图',
        lead: '中控、选题、剪辑、发布、复盘，同一条内容从早上定题到发后复盘不切软件。',
        tabs: [
          { key: 'hub', label: '中控', h3: '打开第一屏，就知道今天停在哪一步', p: '顶部「正在做」推进条直达当前剪辑进度、待点发平台与今日 AI 日报；下方呈现已勾选平台的真实粉丝增长与 AI 一句话人话结论。', linkText: '了解中控与运营大屏 →', linkHref: 'docs/#hub' },
          { key: 'topic', label: '选题', h3: '只读接入 Obsidian，每天早上只挑 1 条最好的题', p: '按期解析 AI 日报、搞钱日报与开发日报，同步对标爆款库（按「比平时火几倍」排序并一键 AI 拆解）。直连本机 Agent 生成钩子与三路审稿诊断。', linkText: 'Obsidian 只读与选题流程 →', linkHref: 'docs/#topic' },
          { key: 'cut', label: '剪辑', h3: '一键粗剪 + 高级镜头表，双模式本地出片', p: '离线 mlx-whisper / faster-whisper 转写，自动标出口误与气口，ffmpeg 两遍 -16 LUFS 与 ASS 字幕烧录；高级模式导出 worktable.json 交给独立剪辑 Agent。', linkText: '双模式本地剪辑说明 →', linkHref: 'docs/#cut' },
          { key: 'publish', label: '发布', h3: '12 平台按需勾选，国内 4 家严格只填不点发', p: '首次引导自由勾选你常用的平台（没勾的彻底隐藏）。独立专用 Chrome（:9333）自动传视频、封面与话题并存档截图，国内 4 平台停在发布按钮前由你亲自点发。', linkText: '12 平台安全护栏说明 →', linkHref: 'docs/#publish' },
          { key: 'review', label: '复盘', h3: '1 / 3 / 7 天同龄对比，每一期都能越做越好', p: '自动采集已启用平台的实测播放与涨粉，按发布后同龄天数横向对照历史中位数，附抖音时长 × 播放散点图一眼定位 3× 爆款黄金时长。', linkText: '多平台采数与复盘算法 →', linkHref: 'docs/#review' },
        ],
      },
      selling: {
        eyebrow: '核心卖点演示',
        h2: '为什么创作者和小团队都在切回本地工作台',
        lead: '每一张动态演示图都直接对应 Park Studio 最硬核的一个卖点：省掉 3 个人力、1 条好题穿透 12 平台、粉丝从 0 轴稳步累积、以及本地隐私安全闭环。',
        link: '去在线演示亲自操作 →',
        orgTitle: '卖点 01 · 组织架构对比：原来需要 4 个人，现在你一个人就够',
        orgSub: '过去做全网内容要养编导、文案、剪辑、运营 4 个岗位；Park Studio 把所有机械流程收拢进本机 AI 中枢，你只需要专注思考与出镜。',
        fanTitle: '卖点 02 · 每天只选 1 条好题，自动穿透 12 个平台',
        fanSub: '从日报、对标榜和 Obsidian 中精选唯一 1 条当日主线，打包成统一工程目录，按需分发至最多 12 个海内外平台。点击下方任意平台标签可实时开关光流。',
        growthTitle: '卖点 03 · 粉丝从 0 轴稳步堆叠增长（而非空洞波动）',
        growthSub: '严格以 0 为底轴，随着每周稳定发片（标注 EP 节点）一层层向上累积全网真实粉丝，右侧虚线按当前发片频次推演未来 3 个月走势。',
        scatterTitle: '卖点 04 · 3× 爆款时长甜点区',
        scatterSub: '自动归并实测数据，一眼锁定你的高完播黄金时长带。',
        guardTitle: '100% 本地开源安全闭环',
        guardSub: '零云端 Cookie 上传、零强制 API 抽成、国内平台绝不误发。',
      },
      ai: {
        eyebrow: 'AI 协作',
        h2: '用你电脑里已有的 AI，零强制 API 费',
        lead: '不需要再买一份 SaaS 订阅积分。Park Studio 原生调度你本机的 Coding Agent，也可以独立拆分全局 Agent 与剪辑 Agent。',
        leftEyebrow: '本机 Coding Agent',
        leftH3: '拆解、写稿、三路审稿，直接跑在你本机',
        leftList: [
          '支持 Gemini CLI、Claude Code、Codex、Antigravity CLI (agy) 与自定义 API',
          'Obsidian 笔记库严格只读，结合「我说过的话」写稿不洗稿、不编造',
          '独立配置剪辑 Agent，后台实时查看切镜头表与渲染日志',
        ],
        leftLink: '查看 Agent 配置指南 →',
        leftFoot: '零云端中转 · 你的稿件与 API Key 只存在 ~/.park-studio/',
        rightEyebrow: '统一工程目录 + 本地 REST API',
        rightH3: '让你的 AI 直接交付成片，一句触发 12 平台填表',
        rightP: '从定稿自动按统一规范建目录。任何外部 AI Agent 只要把成片、三套封面和文案写进 final/上传/，Park Studio 就会自动识别并可通过本机 REST API 直接触发你勾选的平台填表。',
        rightBubble: '帮我把 EP42 粗剪渲染成片，并按规范落盘填好我启用的 12 个平台草稿',
        rightLink: '工程目录规范与 REST API →',
      },
      deploy: {
        eyebrow: '开源免费部署',
        h2: 'GitHub 100% 开源，5 分钟装到自己电脑上',
        lead: '全部源码 MIT 协议开源，没有注册，没有订阅费，没有云端抽成。你也可以直接预约开箱即用的签名 Mac 桌面版。',
        docsLink: '完整的部署说明 →',
        ghCta: '前往 GitHub 获取源码',
        copy: '复制',
        copied: '已复制',
        desktopTitle: '不想碰终端和自己编译？¥199 预约开箱即用 Mac 桌面签名版',
        desktopDesc: '开源代码可随时免费自己编译。若你需要免终端双击即用的 Apple 官方公证签名 `.dmg`（或由 Park 帮你打包配好本地 App），欢迎 ¥199 预约——满 5 人即上架正式签名版。',
        desktopBtn: '¥199 预约桌面版 / 找 Park',
        tabs: [
          {
            key: 'ai', label: '交给你的 AI 助手（免费）', rec: '推荐 · 开源免费',
            note: '把这段话发给 Gemini CLI、Claude Code、Codex 或 Cursor，它会自动克隆 GitHub 仓库并完成安装启动。',
            foot: '安装完成后打开 http://127.0.0.1:8792/ 即可进入 12 平台按需勾选引导。',
            code: `请帮我在本机安装并启动开源项目 Park Studio（本地内容中控）：
1. 克隆仓库到 ~/work/park-studio（如果还没有）：
   git clone https://github.com/zinan92/park-studio.git ~/work/park-studio
2. 检查 python3 (>=3.11) 并安装所需依赖（fastapi uvicorn pyyaml httpx websockets pydantic）。
3. 询问我三个本地配置并写入 ~/.park-studio/config.yaml：
   - 我的 Obsidian 笔记库目录路径（可选，严格只读）
   - 我的视频成片工程目录（默认 ~/Movies/ParkStudio）
   - 我想用的本机 Coding Agent CLI（gemini / claude / codex / agy，零 API 费）
4. 启动本地服务 http://127.0.0.1:8792/，或运行 bash scripts/build-macos-app.sh 编译原生 Mac App。
5. 如果我是 macOS 且希望开机自启，帮我调用 POST /api/daemon/install-launchd。`,
          },
          {
            key: 'script', label: '本地一键脚本（免费）', rec: '5 分钟 · 开源免费',
            note: 'macOS / Linux 终端直接运行，自动创建虚拟环境并启动本地工作台。',
            foot: '启动后浏览器打开 http://127.0.0.1:8792/，所有数据保存在 ~/.park-studio/。',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh`,
          },
          {
            key: 'mac', label: 'Mac 桌面 App', rec: '源码自编免费 · 签名直装版 ¥199',
            note: '会用终端可以直接用 macOS 自带 Swift 免费编译；不想折腾环境可在下方 ¥199 预约开箱即用签名版。',
            foot: '自编产物在 dist/Park Studio.app；不想折腾编译可直接预约下方签名版。',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/build-macos-app.sh
open "dist/Park Studio.app"`,
          },
        ],
      },
      community: {
        eyebrow: '社群 · 培训 · 定制开发',
        h2a: '开源免费自用，',
        h2b: '也可以直接连接 Park。',
        lead: 'Park Studio 的源码在 GitHub 100% 开源免费。如果你想进群同步实时信息差、获取开箱即用桌面版，或者为公司打造专属 AI 工作流与交易系统，都可以直接加我微信。',
        c1Tag: '个人连接 · 实时信息差',
        c1Title: 'Park 实战微信群',
        c1Price: '¥199',
        c1Unit: '/ 一次性入群（永久有效）',
        c1Desc: '主要给你一个直接加到我的沟通渠道，群内持续分享我的最新实战观察与一线信息差。',
        c1List: [
          '<b>直连作者渠道：</b>最起码拥有一个能直接联系到 Park 本人的微信入口',
          '<b>每日实时信息差：</b>实时同步 AI 工具动态、实战踩坑与高价值机会交流',
          '<b>金融市场观察：</b>分享我对美股、加密与宏观金融市场的实时看法与复盘思考',
          '<b>新产品优先同步：</b>第一时间看到 Park 正在打磨的开源项目与工作流演进',
        ],
        c1Rule: '<b>单独咨询收费说明：</b>¥199 为一次性入群费用；进群后如果针对你个人的具体问题需要私聊 1v1 单独解答或排障，按单个问题（per case）<b>¥199 / 次</b> 单独收费。',
        c1Cta: '扫码加 Park 微信（备注 199进群）',
        c2Tag: '企业团队 · 个人定制 · AI 培训',
        c2Title: '定制开发与企业 AI 培训',
        c2Price: '按需求评估',
        c2Unit: '由 Park 亲自架构与交付',
        c2Desc: '面向有明确业务目标的企业团队与个人，把经过真实跑通的 AI 自动化系统直接落地到你的业务里：',
        c2List: [
          '<b>电商工作流：</b>商品图 AI 出图、短视频批量生成与电商内容流水线',
          '<b>公司级自媒体工作流：</b>多账号矩阵隔离、12 平台按需分发与数据复盘闭环',
          '<b>公司私有知识库：</b>打通企业内部文档沉淀与专属 AI 检索问答系统',
          '<b>品牌专属剪辑流水线：</b>定制企业 VI 字幕动效、镜头表规范与封面自动生成',
          '<b>企业 AI 培训：</b>教团队打通数据孤岛，系统识别业务中可自动化、AI 化的环节',
          '<b>交易系统打造：</b>自动化 DCA / Grid Bot、交易复盘日记与独立行情看盘看板',
        ],
        c2Note: '不写死模板报价，加微信说明你的业务场景与目标，直接评估可行性与排期。',
        c2Cta: '加微信聊定制 / 培训需求',
        casesTitle: '过往真实交付案例',
        casesSub: '以下均为 Park 亲手架构并实际跑通的系统（仅放界面缩略图，不附外链）。点击任意缩略图可放大浏览详情。',
        qrTitle: '直接微信扫码找 Park（新加坡）',
        qrDesc: '入群交流请备注「199进群」；预约 Mac 桌面签名版请备注「Mac桌面版199」；企业定制开发或 AI 培训请备注「定制」并简述你的需求。',
        qrBtn: '放大二维码 / 复制备注',
      },
      foot: {
        desc: '100% MIT 开源的本地内容生产线（12 平台按需分发）。零强制 API 费，数据永远留在你本机。',
        cols: [
          { h: '开源产品', links: [['GitHub 源码仓库', GITHUB_URL], ['在线演示 (12 平台)', 'demo/'], ['核心卖点', '#charts'], ['本地部署', '#deploy']] },
          { h: '社群与定制', links: [['¥199 实战微信群', '#community'], ['Mac 桌面版 ¥199', '#deploy'], ['定制开发与培训', '#community'], ['过往交付案例', '#cases']] },
          { h: '文档与安全', links: [['快速开始', 'docs/#quickstart'], ['12 平台安全护栏', 'docs/#publish'], ['隐私与本地承诺', 'docs/#privacy'], ['常见问题 FAQ', 'docs/#faq']] },
        ],
        colophon: 'Park Studio · 开源免费用，社群连信息差，定制与培训落地真实业务。',
        license: 'MIT License · Made by Park (@Park的AI世界 · 新加坡)',
      },
    },
    en: {
      title: 'Park Studio · Open-Source Local Content Pipeline (12 Platforms · Zero API Fees)',
      desc: '100% MIT open-source local content studio: replace a 4-person content team, turn 1 daily topic into 12-platform distribution, 100% local.',
      nav: { features: 'Five Views', charts: 'Why Local', ai: 'AI Agents', deploy: 'Self-host', community: 'Community & Custom', docs: 'Docs', demo: 'Live demo', langLabel: '中文' },
      hero: {
        eyebrow: '100% MIT Open Source · Free on GitHub · 12 Opt-In Platforms · Zero API Fees',
        h1a: 'One creator,',
        h1b: 'a 4-person content team.',
        lead: 'Pick 1 winning topic each morning from daily briefs and Obsidian — script, offline rough-cut, and safely autofill up to 12 platforms locally. Fully open source on GitHub.',
        ctaDemo: 'Live demo',
        ctaDeploy: 'Self-host free',
        subJoin: 'Skip the terminal?',
        subLink: 'Pre-order Signed Mac App (¥199) · Join Group / Custom Builds →',
      },
      features: {
        eyebrow: 'Five Views',
        h2: 'One studio, five views',
        lead: 'Overview, Topics, Cut, Publish, Review — follow every episode end to end without switching tools.',
        tabs: [
          { key: 'hub', label: 'Overview', h3: 'Open the first screen and know exactly where you left off', p: 'Jump straight to your active cut, pending publish confirmations, and today\'s brief alongside live growth across your selected platforms.', linkText: 'Explore Command Hub →', linkHref: 'docs/#hub' },
          { key: 'topic', label: 'Topics', h3: 'Read-only Obsidian briefs — pick 1 great topic each morning', p: 'Parses daily briefings and breakout benchmark videos ranked by channel multiplier, then runs hooks and 3-axis audits on your local Coding Agent.', linkText: 'Obsidian & Sourcing →', linkHref: 'docs/#topic' },
          { key: 'cut', label: 'Cut', h3: 'One-click rough cut or Spec Table motion workflow', p: 'Offline mlx-whisper transcription flags retakes and pauses before two-pass -16 LUFS & ASS subtitle rendering, or hands off worktable.json to a Cut Agent.', linkText: 'Dual-mode local cutting →', linkHref: 'docs/#cut' },
          { key: 'publish', label: 'Publish', h3: '12 opt-in platforms with strict human guardrails', p: 'Pick only the platforms you publish to. Isolated Chrome (:9333) uploads video, covers, and tags with JPEG proof while pausing before final publish on CN platforms.', linkText: '12-platform guardrails →', linkHref: 'docs/#publish' },
          { key: 'review', label: 'Review', h3: 'Day-1 / Day-3 / Day-7 same-age cohort comparisons', p: 'Syncs real views and follower gains across all enabled platforms and locates your 3× breakout duration sweet spot.', linkText: 'Analytics methodology →', linkHref: 'docs/#review' },
        ],
      },
      selling: {
        eyebrow: 'Core Value Props',
        h2: 'Built around what actually matters for solo creators & teams',
        lead: 'Every animated diagram proves one concrete advantage: replacing a 4-person org chart, fanning 1 daily topic out to 12 platforms, compounding followers from a true 0 baseline, and local-first safety.',
        link: 'Try the 12-platform Live Demo →',
        orgTitle: '01 · Org Chart Collapse: 4-person content team → Just you + Park Studio',
        orgSub: 'Normally multi-platform ops require a researcher, scriptwriter, video editor, and ops manager. Park Studio collapses the repetitive layers into one local AI core.',
        fanTitle: '02 · Pick 1 topic a day → Fan out to all 12 platforms',
        fanSub: 'Converge briefs, breakouts, and Obsidian into ONE daily episode, then fan that single master out to up to 12 opt-in platforms. Click any platform chip to toggle its live flow.',
        growthTitle: '03 · Cumulative follower growth anchored cleanly at 0',
        growthSub: 'Anchored to a true 0 baseline, showing steady cumulative compounding across every episode release (EP markers) plus dashed 3-month projection.',
        scatterTitle: '04 · 3× Breakout Duration Sweet Spot',
        scatterSub: 'Pinpoints your highest-retention length window from real local metrics.',
        guardTitle: '100% Local & Open-Source Guardrails',
        guardSub: 'Zero cloud cookies, zero forced token fees, zero accidental auto-posts.',
      },
      ai: {
        eyebrow: 'AI Native',
        h2: 'Use the AI agents already on your machine',
        lead: 'Zero forced API fees. Park Studio runs directly on your local Coding Agent CLIs and supports an independent Cut Agent.',
        leftEyebrow: 'Local Coding Agents',
        leftH3: 'Teardown, draft, and 3-axis audit — zero API fees',
        leftList: [
          'First-class Gemini CLI, Claude Code, Codex, Antigravity CLI (agy), or custom APIs',
          'Read-only Obsidian access keeps scripts faithful to your real stories',
          'Split a dedicated Cut Agent with live background render logs',
        ],
        leftLink: 'Configure local AI backends →',
        leftFoot: 'Zero cloud relay · Notes, drafts, and keys stay inside ~/.park-studio/',
        rightEyebrow: 'Unified Project Spec + Local REST API',
        rightH3: 'Drop finals once, autofill all enabled platforms',
        rightP: 'Any external AI agent writes video, three covers, and copy into final/上传/ and drives 12-platform opt-in autofill over localhost REST API.',
        rightBubble: 'Rough-cut EP42, export all covers, and pre-fill all 12 enabled platform drafts',
        rightLink: 'Project spec & REST API →',
      },
      deploy: {
        eyebrow: 'Open-Source Self-Host',
        h2: '100% MIT Open Source on GitHub — run locally in 5 min',
        lead: 'Clone freely from GitHub with zero subscriptions, or reserve the signed plug-and-play macOS Desktop build for ¥199.',
        docsLink: 'Full deployment guide →',
        ghCta: 'Get Source on GitHub',
        copy: 'Copy',
        copied: 'Copied',
        desktopTitle: 'Prefer a signed plug-and-play macOS App? Pre-order for ¥199 (~$29)',
        desktopDesc: 'Building from source is always free. To skip terminal setup and get an Apple-notarized .dmg (or hands-on local packaging by Park), reserve for ¥199 — launches notarized signing as soon as 5 creators reserve.',
        desktopBtn: 'Reserve Mac App (¥199)',
        tabs: [
          {
            key: 'ai', label: 'Give to AI Assistant (Free)', rec: 'Recommended · Free OSS',
            note: 'Send this prompt to Gemini CLI, Claude Code, Codex, or Cursor to install automatically.',
            foot: 'Opens http://127.0.0.1:8792/ with the 12-platform opt-in picker.',
            code: `Install and launch the open-source Park Studio local content workbench on my machine:
1. Clone https://github.com/zinan92/park-studio.git to ~/work/park-studio.
2. Check python3 (>=3.11) and install dependencies (fastapi uvicorn pyyaml httpx websockets pydantic).
3. Ask me for my Obsidian path (optional, read-only), projects root, and preferred local Coding Agent CLI.
4. Start http://127.0.0.1:8792/ or compile dist/Park Studio.app via bash scripts/build-macos-app.sh.`,
          },
          {
            key: 'script', label: 'Local Script (Free)', rec: '5 min · Free OSS',
            note: 'Runs cleanly on macOS or Linux with zero external database setup.',
            foot: 'All config and SQLite data stay in ~/.park-studio/.',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh`,
          },
          {
            key: 'mac', label: 'macOS Desktop App', rec: 'Build Free · Signed DMG ¥199',
            note: 'Compile yourself for free via Swift, or reserve the notarized plug-and-play build below for ¥199.',
            foot: 'Outputs dist/Park Studio.app ready for Applications.',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/build-macos-app.sh
open "dist/Park Studio.app"`,
          },
        ],
      },
      community: {
        eyebrow: 'Community · Training · Custom Builds',
        h2a: 'Free & open source forever —',
        h2b: 'connect directly with Park when you need more.',
        lead: 'Grab the code free on GitHub. Join Park\'s WeChat group for direct access & real-time market/AI insights, or engage Park for custom workflows, training, and trading systems.',
        c1Tag: 'Direct Access · Real-Time Insights',
        c1Title: 'Park WeChat Group',
        c1Price: '¥199',
        c1Unit: 'one-time (~$29 · Lifetime)',
        c1Desc: 'Your direct channel to Park plus daily real-time sharing on AI workflows, financial markets, and new shipped products.',
        c1List: [
          '<b>Direct Line to Park:</b> A direct WeChat channel to stay connected with the builder',
          '<b>Daily Real-Time Edge:</b> Ongoing AI tooling notes, workflow experiments, and field takeaways',
          '<b>Financial Market Views:</b> Real-time macro, US equity, and crypto market observations',
          '<b>Early Product Drops:</b> First look at new open-source tools Park is building',
        ],
        c1Rule: '<b>1-on-1 Consultation Policy:</b> ¥199 covers one-time group admission only. Any private 1-on-1 troubleshooting or personal Q&A after joining is billed separately at <b>¥199 per case</b>.',
        c1Cta: 'Scan WeChat QR (Note: 199)',
        c2Tag: 'Custom Development · Enterprise AI Training',
        c2Title: 'Custom Builds & Enterprise AI Training',
        c2Price: 'Custom Scope',
        c2Unit: 'Architected & delivered by Park',
        c2Desc: 'Bespoke production systems and hands-on team training tailored to your business:',
        c2List: [
          '<b>E-Commerce Workflows:</b> Automated AI product imagery & short-video pipelines',
          '<b>Company-Grade Media Ops:</b> Multi-account matrices & 12-platform distribution pipelines',
          '<b>Private Knowledge Bases:</b> Unified internal docs & company-wide AI retrieval',
          '<b>Brand Cutting Pipelines:</b> Custom VI motion templates, subtitles, and cover generators',
          '<b>Enterprise AI Training:</b> Break data silos and map which business steps to automate with AI',
          '<b>Trading Systems:</b> Automated DCA / Grid Bots, K-line trade journals & market panels',
        ],
        c2Note: 'Scoped per engagement — message on WeChat with your workflow goals for a direct assessment.',
        c2Cta: 'Connect on WeChat for Custom / Training',
        casesTitle: 'Selected Systems Built by Park',
        casesSub: 'Real shipped products — thumbnails only, no external links. Click any thumbnail to inspect in fullscreen.',
        qrTitle: 'Scan WeChat to reach Park (Singapore)',
        qrDesc: 'Note "199" to join the WeChat group, "MacApp199" to reserve the signed Mac Desktop app, or "Custom" with your project scope.',
        qrBtn: 'Enlarge QR / Copy Note',
      },
      foot: {
        desc: '100% MIT open-source local content pipeline (12 opt-in platforms). Zero forced API fees; your data stays on disk.',
        cols: [
          { h: 'Open Source', links: [['GitHub Repository', GITHUB_URL], ['Live Demo (12 Plats)', 'demo/'], ['Core Value Props', '#charts'], ['Self-Host', '#deploy']] },
          { h: 'Community & Custom', links: [['¥199 WeChat Group', '#community'], ['Signed Mac App ¥199', '#deploy'], ['Custom & AI Training', '#community'], ['Shipped Portfolio', '#cases']] },
          { h: 'Docs & Safety', links: [['Quick Start', 'docs/#quickstart'], ['12-Platform Guardrails', 'docs/#publish'], ['Privacy Pledge', 'docs/#privacy'], ['FAQ', 'docs/#faq']] },
        ],
        colophon: 'Park Studio · MIT Open Source · Direct Community · Bespoke Systems & Training.',
        license: 'MIT License · Made by Park (@Park的AI世界 · Singapore)',
      },
    },
  };

  function detectLang() {
    const params = new URLSearchParams(location.search);
    if (params.get('lang') === 'en' || document.documentElement.dataset.forceLang === 'en') return 'en';
    if (params.get('lang') === 'zh') return 'zh';
    try {
      const saved = localStorage.getItem('ps:site:lang');
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) {}
    return 'zh';
  }

  let lang = detectLang();
  let activeFeat = 'hub';
  let activeDeploy = 'ai';
  let activeTopicFilter = 'all';
  let activeCutMode = 'spec';
  let activeGrowthFilter = 'all'; // all | cn | gl
  let enabledPlats = new Set(PLATFORMS_12.map(p => p.id));
  let wxModalMode = null; // null | 'group' | 'desktop' | 'custom'
  let lightbox = null; // null | { caseId, idx }

  const basePrefix = document.documentElement.dataset.base || '';
  const rel = p => (p.startsWith('#') || p.startsWith('http') ? p : `${basePrefix}${p}`);

  const BRAND_SVG = `<svg class="brand-ic" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#EDEDED"/>
    <rect x="8.5" y="8.5" width="6" height="6" rx="1.8" fill="#0F0F10"/>
    <rect x="17.5" y="8.5" width="6" height="6" rx="1.8" fill="#3E63DD"/>
    <rect x="8.5" y="17.5" width="6" height="6" rx="1.8" fill="#0F0F10" fill-opacity=".38"/>
    <rect x="17.5" y="17.5" width="6" height="6" rx="1.8" fill="#0F0F10" fill-opacity=".82"/>
  </svg>`;

  const GH_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.26 5.67.42.36.79 1.07.79 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>`;

  function buildHeroMiniChart() {
    // Clean zero-baseline upward growth curve inside Hero Mac window
    return `<svg viewBox="0 0 230 164" class="chart-svg" aria-label="12-platform cumulative growth">
      <defs>
        <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7C9BF5" stop-opacity=".34"/>
          <stop offset="1" stop-color="#7C9BF5" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="8" y1="142" x2="222" y2="142" stroke="rgba(255,255,255,.12)"/>
      <line x1="8" y1="96" x2="222" y2="96" stroke="rgba(255,255,255,.05)" stroke-dasharray="3 3"/>
      <line x1="8" y1="50" x2="222" y2="50" stroke="rgba(255,255,255,.05)" stroke-dasharray="3 3"/>
      <path d="M 10 140 C 44 134, 72 118, 108 98 C 142 79, 174 52, 214 26 L 214 142 L 10 142 Z" fill="url(#hg1)"/>
      <path d="M 10 140 C 44 134, 72 118, 108 98 C 142 79, 174 52, 214 26" fill="none" stroke="#7C9BF5" stroke-width="2.4" stroke-linecap="round" class="anim-sweep"/>
      <circle cx="214" cy="26" r="7" fill="#7C9BF5" fill-opacity=".22"/>
      <circle cx="214" cy="26" r="3.8" fill="#EDEDED" stroke="#7C9BF5" stroke-width="2"/>
      <text x="10" y="156">0</text>
      <text x="112" y="156" text-anchor="middle">EP30</text>
      <text x="218" y="156" text-anchor="end">174.8k</text>
    </svg>`;
  }

  function renderFeaturePreview(key) {
    const isEn = lang === 'en';
    if (key === 'hub') {
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Command Hub · In Progress & 12-Platform Overview' : '中控大屏 · 正在做与 12 平台总览'}</div>
          <div class="pv-chips"><span class="pv-chip on">${isEn ? '12 opt-in platforms' : '12 平台按需启用'}</span><span class="pv-chip">174,820 ${isEn ? 'followers' : '总粉'}</span></div>
        </div>
        <div class="pv-grid-3" style="margin-bottom:12px">
          <div class="pv-card"><div class="pv-card-top"><span class="pv-tag">${isEn ? 'Cutting' : '剪辑中'}</span><span class="pv-meta">EP42</span></div><h4>${isEn ? 'One Local Studio Replacing a 4-Person Team' : '一个人顶 4 人团队的本地内容中控'}</h4><div class="pv-meta">${isEn ? 'Spec Table · 14 shots · -16 LUFS' : '停在镜头表 · 14 镜 · 待渲染'}</div></div>
          <div class="pv-card"><div class="pv-card-top"><span class="pv-tag amber">${isEn ? '2 awaiting click' : '2 平台待点发'}</span><span class="pv-meta">EP41</span></div><h4>${isEn ? '1 Daily Topic Fanned Out to 12 Platforms' : '1 条好题穿透 12 平台按需填表'}</h4><div class="pv-meta">${isEn ? 'XHS & Channels filled · JPEG proof saved' : '小红书 / 视频号已填表 · 已存档截图'}</div></div>
          <div class="pv-card"><div class="pv-card-top"><span class="pv-tag good">${isEn ? 'Today Brief' : '今日 AI 日报'}</span><span class="pv-meta">28 items</span></div><h4>${isEn ? 'Obsidian Read-Only Briefs + Breakout Radar' : 'Obsidian 只读日报 + 3× 对标爆款'}</h4><div class="pv-meta">${isEn ? 'Pick 1 winning topic each morning' : '每天早上只挑 1 条最值得讲的题'}</div></div>
        </div>`;
    }
    if (key === 'topic') {
      const items = [
        { cat: 'bench', tag: '4.6×', title: isEn ? 'Why Solo Creators Are Replacing 4-Person Teams With Local Agents' : '为什么一人博主正在用本地 Agent 替代 4 人内容团队', meta: 'YouTube · 182k · 4.6×', score: isEn ? 'Value 9.4 · Resonance 9.1 · Pace 8.8' : '价值 9.4 · 共鸣 9.1 · 节奏 8.8' },
        { cat: 'daily', tag: isEn ? 'AI Brief' : 'AI 日报', title: isEn ? 'Apple Silicon Offline Rough Cut: 18s Transcription for 10-Min Video' : 'Apple Silicon 离线转写实测：10 分钟口播 18 秒标完口误', meta: 'Obsidian · Read-only', score: isEn ? 'Value 9.1 · Resonance 8.4 · Pace 8.9' : '价值 9.1 · 共鸣 8.4 · 节奏 8.9' },
        { cat: 'bench', tag: '3.8×', title: isEn ? '1 Topic → 12 Opt-In Platforms With Zero Forced API Fees' : '1 条选题穿透 12 个海内外平台，零强制 API 费闭环', meta: 'Bilibili · 94k · 3.8×', score: isEn ? 'Value 9.3 · Resonance 8.9 · Pace 8.5' : '价值 9.3 · 共鸣 8.9 · 节奏 8.5' },
        { cat: 'daily', tag: isEn ? 'Builder' : '搞钱日报', title: isEn ? 'Open-Source Product → Paid Community → Bespoke B2B Systems' : '开源产品 + 实战社群 + 企业定制开发的真实商业闭环', meta: 'Saved · Deep Read', score: isEn ? 'Value 9.0 · Resonance 9.3 · Pace 8.7' : '价值 9.0 · 共鸣 9.3 · 节奏 8.7' },
      ].filter(x => activeTopicFilter === 'all' || x.cat === activeTopicFilter);
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Topic Sourcing & 3-Axis Audit' : '日报 · 对标爆款 · 三路审稿'}</div>
          <div class="pv-chips">
            <button type="button" class="pv-chip ${activeTopicFilter === 'all' ? 'on' : ''}" data-tf="all">${isEn ? 'All (4)' : '全部 (4)'}</button>
            <button type="button" class="pv-chip ${activeTopicFilter === 'bench' ? 'on' : ''}" data-tf="bench">${isEn ? 'Breakouts 3×+' : '对标爆款 3×+'}</button>
            <button type="button" class="pv-chip ${activeTopicFilter === 'daily' ? 'on' : ''}" data-tf="daily">${isEn ? 'Obsidian Briefs' : 'Obsidian 日报'}</button>
          </div>
        </div>
        <div class="pv-grid-2">
          ${items.map(it => `<div class="pv-card"><div class="pv-card-top"><span class="pv-tag">${it.tag}</span><span class="pv-meta">${it.meta}</span></div><h4>${it.title}</h4><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="pv-meta">${it.score}</span><span class="pv-tag good">+ ${isEn ? 'Pick Today\'s 1 Topic' : '选为今日主线'}</span></div></div>`).join('')}
        </div>`;
    }
    if (key === 'cut') {
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Local Video Cutter · EP42' : '双模式本地剪辑台 · EP42'}</div>
          <div class="pv-chips">
            <button type="button" class="pv-chip ${activeCutMode === 'rough' ? 'on' : ''}" data-cm="rough">${isEn ? 'One-Click Rough Cut' : '一键粗剪'}</button>
            <button type="button" class="pv-chip ${activeCutMode === 'spec' ? 'on' : ''}" data-cm="spec">${isEn ? 'Spec Table & Motion' : '镜头表 · 高级动效'}</button>
          </div>
        </div>
        ${activeCutMode === 'rough' ? `<div class="pv-card"><div class="pv-card-top"><b style="font-size:13px">${isEn ? 'mlx-whisper Offline Transcript · Auto Retake & Pause Removal' : 'mlx-whisper 离线转写 · 自动标口误与长停顿'}</b><span class="pv-tag good">-16 LUFS · faststart</span></div><div style="font-size:13px;line-height:1.9;color:#1F1F24"><span class="pv-meta">[00:00.4]</span> ${isEn ? 'If you publish to multiple platforms every week, ' : '如果你每周都要把一条视频发到多个平台，'}<span class="pv-strike">${isEn ? 'uhh wait let me rephrase that (1.8s pause) ' : '呃等一下我重新说这句（停顿 1.8s）'}</span><b>${isEn ? 'the real bottleneck is never filming.' : '真正的瓶颈从来不是拍摄。'}</b></div></div>` : `
        <table class="pv-table"><thead><tr><th>${isEn ? 'Timecode' : '时间段'}</th><th>${isEn ? 'Voiceover' : '口播原句'}</th><th>${isEn ? 'Motion / Visual' : '画面与动效指令'}</th><th>${isEn ? 'Density' : '节奏'}</th></tr></thead><tbody>
          <tr><td class="pv-meta">00:00–00:07</td><td><b>${isEn ? 'Hook: 1 topic → 12 platforms locally' : 'Hook：1 条选题 60 秒填完 12 平台'}</b></td><td><span class="pv-tag">Zoom Screen</span> Chrome CDP live fill</td><td><span class="pv-tag amber">High</span></td></tr>
          <tr><td class="pv-meta">00:07–00:22</td><td>${isEn ? 'Why 1 creator replaces a 4-person content team' : '为什么一个人就能干完 4 个人的活'}</td><td><span class="pv-tag">Org Collapse</span> 4 Roles → 1 Studio</td><td><span class="pv-tag">Medium</span></td></tr>
          <tr><td class="pv-meta">00:22–00:41</td><td>${isEn ? 'One unified directory spec for every agent' : '一套统一工程目录，所有 Agent 共用'}</td><td><span class="pv-tag good">Tree Reveal</span> final/上传/</td><td><span class="pv-tag">Medium</span></td></tr>
        </tbody></table>`}`;
    }
    if (key === 'publish') {
      const plats = [
        { n: isEn ? 'Douyin' : '抖音', st: 'wait', txt: isEn ? 'Filled · Click to publish' : '已填表 · 待你点发', note: 'JPEG proof saved' },
        { n: isEn ? 'Xiaohongshu' : '小红书', st: 'wait', txt: isEn ? 'Filled · Click to publish' : '已填表 · 待你点发', note: '5 topics attached' },
        { n: 'Bilibili', st: 'good', txt: isEn ? 'Published · Synced' : '已发布 · 已回填链接', note: '21.6k views' },
        { n: 'YouTube', st: 'good', txt: isEn ? 'Scheduled · Verified' : '已定时 · 回读一致', note: '16:9 cover ok' },
        { n: 'TikTok / IG', st: 'good', txt: isEn ? 'Opt-In Enabled' : '按需已启用', note: '9:16 Reels synced' },
        { n: 'X / LinkedIn', st: 'good', txt: isEn ? 'Published · UTM' : '已发布 · 带 UTM', note: '52.0k combined' },
      ];
      return `<div class="pv-bar"><div class="pv-title">Chrome CDP (:9333) · ${isEn ? '12 Opt-In Platforms' : '12 平台按需安全填表闭环'}</div><div class="pv-chips"><span class="pv-chip on">${isEn ? 'Pick only what you use · CN guardrails enforced' : '只勾常用平台 · 国内 4 家严格只填不点发'}</span></div></div><div class="pv-grid-3">${plats.map(p => `<div class="pv-card"><div class="pv-card-top"><b>${p.n}</b><span class="pv-tag ${p.st === 'good' ? 'good' : 'amber'}">${p.txt}</span></div><div class="pv-meta">${p.note}</div></div>`).join('')}</div>`;
    }
    return `<div class="pv-bar"><div class="pv-title">${isEn ? 'Day-1 / Day-3 / Day-7 Cohort Comparison' : '1 / 3 / 7 天同龄复盘与抖音时长分析'}</div><div class="pv-chips"><span class="pv-chip on">EP41 · 168.4k Day-1 (+66.8%)</span></div></div><div class="pv-grid-2"><div class="pv-card"><div class="pv-card-top"><b>${isEn ? 'EP41 Same-Age Cohort' : 'EP41 发布 24h 全网同龄对比'}</b><span class="pv-tag good">+66.8%</span></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;font-size:12px"><div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>EP41</span><b>168,420</b></div><div style="height:8px;border-radius:99px;background:#E8E8EE;overflow:hidden"><div style="width:94%;height:100%;background:#3E63DD;border-radius:99px"></div></div></div><div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>${isEn ? '30d Median' : '近 30 天中位数'}</span><b>101,000</b></div><div style="height:8px;border-radius:99px;background:#E8E8EE;overflow:hidden"><div style="width:56%;height:100%;background:#A1A1AA;border-radius:99px"></div></div></div></div></div><div class="pv-card"><div class="pv-card-top"><b>${isEn ? 'Zero-Fabrication Rule' : '零伪造数据原则'}</b><span class="pv-tag good">SQLite</span></div><div class="pv-meta">${isEn ? 'Every chart reads strictly from locally synced real creator studio stats.' : '所有大屏与复盘图表严格读取你本机采集的真实作品数据，绝不造假充数。'}</div></div></div>`;
  }

  // ===== SELLING POINT 1: Animated Org Chart (4-Person Team -> 1 Person + Park Studio) =====
  function renderOrgChart() {
    const isEn = lang === 'en';
    const roles = [
      { x: 46,  n: isEn ? 'Researcher' : '编导 · 找爆款', sub: isEn ? '$2.5k/mo' : '¥12k/月' },
      { x: 142, n: isEn ? 'Scriptwriter' : '文案 · 写口播', sub: isEn ? '$2.2k/mo' : '¥10k/月' },
      { x: 238, n: isEn ? 'Video Editor' : '剪辑 · 粗剪',  sub: isEn ? '$2.5k/mo' : '¥12k/月' },
      { x: 334, n: isEn ? 'Ops / Data' : '运营 · 分发盘', sub: isEn ? '$1.8k/mo' : '¥9k/月' },
    ];
    const modules = [
      { x: 52,  n: isEn ? 'Sourcing' : '找题拆解', c: '#7C9BF5' },
      { x: 146, n: isEn ? 'Scripting' : '写稿审稿', c: '#A78BFA' },
      { x: 240, n: isEn ? 'Rough Cut' : '离线粗剪', c: '#38BDF8' },
      { x: 334, n: isEn ? '12-Plat Ops' : '12平台复盘', c: '#3DD68C' },
    ];
    return `
      <div class="org-compare">
        <div class="org-pane">
          <div class="org-pane-head">
            <b>${isEn ? 'Before · Traditional Content Team' : '过去 · 传统 4 人内容团队'}</b>
            <span class="org-badge bad">${isEn ? '5 people · $9k+/mo' : '5 人协同 · ¥43k+/月'}</span>
          </div>
          <svg viewBox="0 0 384 186" class="chart-svg">
            ${roles.map(r => `<path d="M 192 52 C 192 86, ${r.x} 80, ${r.x} 118" fill="none" stroke="rgba(255,90,95,.34)" stroke-width="1.5" stroke-dasharray="4 4"/>`).join('')}
            <rect x="116" y="14" width="152" height="38" rx="10" fill="#1E1E22" stroke="rgba(255,255,255,.16)"/>
            <text x="192" y="37" text-anchor="middle" style="fill:#EDEDED;font-size:12px;font-weight:600">${isEn ? 'You (Founder / Host)' : '你（创始人 / 出镜）'}</text>
            ${roles.map(r => `
              <g>
                <rect x="${r.x - 42}" y="118" width="84" height="54" rx="10" fill="#18181B" stroke="rgba(255,90,95,.28)"/>
                <text x="${r.x}" y="141" text-anchor="middle" style="fill:#D4D4D8;font-size:10px;font-weight:600">${r.n}</text>
                <text x="${r.x}" y="159" text-anchor="middle" style="fill:#FF8E92;font-size:10px">${r.sub}</text>
              </g>`).join('')}
          </svg>
        </div>

        <div class="org-arrow" aria-hidden="true">→</div>

        <div class="org-pane after">
          <div class="org-pane-head">
            <b>${isEn ? 'Now · Just You + Park Studio' : '现在 · 你一个人 + Park Studio'}</b>
            <span class="org-badge good">${isEn ? '1 person · $0 SaaS fee' : '1 人闭环 · ¥0 订阅费'}</span>
          </div>
          <svg viewBox="0 0 384 186" class="chart-svg">
            <path d="M 192 48 L 192 78" fill="none" stroke="#7C9BF5" stroke-width="2" class="anim-flow"/>
            ${modules.map(m => `<path d="M 192 114 C 192 128, ${m.x} 122, ${m.x} 142" fill="none" stroke="${m.c}" stroke-width="1.8" class="anim-flow"/>`).join('')}
            <rect x="110" y="10" width="164" height="38" rx="10" fill="#EDEDED"/>
            <text x="192" y="33" text-anchor="middle" style="fill:#0D0D0D;font-size:12px;font-weight:700">${isEn ? 'You (Ideas & Camera)' : '你（只管思考与出镜）'}</text>
            <rect x="92" y="76" width="200" height="38" rx="12" fill="rgba(124,155,245,.18)" stroke="#7C9BF5" stroke-width="1.5"/>
            <text x="192" y="99" text-anchor="middle" style="fill:#EDEDED;font-size:12px;font-weight:700">Park Studio · Local AI Core</text>
            ${modules.map(m => `
              <g>
                <rect x="${m.x - 42}" y="142" width="84" height="34" rx="9" fill="#18181C" stroke="${m.c}" stroke-opacity=".45"/>
                <text x="${m.x}" y="163" text-anchor="middle" style="fill:#EDEDED;font-size:10.5px;font-weight:600">${m.n}</text>
              </g>`).join('')}
          </svg>
        </div>
      </div>
      <div class="org-summary-bar">
        <div class="org-stat"><span>${isEn ? 'Headcount' : '团队人力'}</span><b>${isEn ? '4 roles → 1 person' : '4 岗位 → 1 个人'}</b></div>
        <div class="org-stat"><span>${isEn ? 'Monthly Software Cost' : '软件与 API 成本'}</span><b style="color:var(--green)">${isEn ? '$0 (MIT + Local CLI)' : '¥0（MIT + 本机 CLI）'}</b></div>
        <div class="org-stat"><span>${isEn ? 'Handoff Friction' : '跨人沟通损耗'}</span><b style="color:var(--accent)">0</b></div>
      </div>`;
  }

  // ===== SELLING POINT 2: Animated 1-Daily-Topic -> 12-Platform Fan-Out =====
  function renderFanOut12() {
    const isEn = lang === 'en';
    const W = 900, H = 316;
    const sources = [
      { y: 66,  lbl: isEn ? 'Daily AI Briefs' : 'AI / 搞钱日报', c: '#7C9BF5' },
      { y: 158, lbl: isEn ? '3× Breakouts' : '对标爆款榜', c: '#A78BFA' },
      { y: 250, lbl: 'Obsidian (RO)', c: '#3DD68C' },
    ];
    const cx = 372, cy = 158;
    const rightX = 720;
    const activeCount = enabledPlats.size;

    const platLines = PLATFORMS_12.map((p, i) => {
      const py = 20 + i * 25.2;
      const on = enabledPlats.has(p.id);
      const stroke = on ? (p.guard ? '#F5A524' : p.color) : 'rgba(255,255,255,.07)';
      const badge = p.guard ? (isEn ? 'Guard' : '只填不点发') : (p.id === 'wechat' ? (isEn ? 'Draft' : '草稿箱') : (isEn ? 'Auto' : '自动/定时'));
      return `
        <path d="M ${cx + 96} ${cy} C ${cx + 205} ${cy}, ${rightX - 115} ${py}, ${rightX - 6} ${py}" fill="none" stroke="${stroke}" stroke-width="${on ? 1.8 : 1}" stroke-opacity="${on ? 0.72 : 0.25}" class="${on ? 'anim-flow-slow' : ''}"/>
        <g opacity="${on ? 1 : 0.28}" style="cursor:pointer;transition:opacity .2s" data-ptog="${p.id}" data-tip="${isEn ? p.en : p.zh} · ${badge}">
          <rect x="${rightX}" y="${py - 10}" width="174" height="20" rx="6" fill="${on ? '#1E1E22' : '#141416'}" stroke="${on ? stroke : 'rgba(255,255,255,.08)'}" stroke-opacity="${on ? .48 : .4}"/>
          <circle cx="${rightX + 11}" cy="${py}" r="3.5" fill="${p.color}"/>
          <text x="${rightX + 21}" y="${py + 3.5}" style="fill:#EDEDED;font-size:10.5px;font-weight:600">${isEn ? p.en : p.zh}</text>
          <text x="${rightX + 166}" y="${py + 3.5}" text-anchor="end" style="fill:${p.guard ? '#F5A524' : '#76767B'};font-size:9.5px">${badge}</text>
        </g>`;
    }).join('');

    return `
      <svg viewBox="0 0 ${W} ${H}" class="chart-svg">
        ${sources.map(s => `
          <path d="M 150 ${s.y} C 218 ${s.y}, 218 ${cy}, ${cx - 98} ${cy}" fill="none" stroke="${s.c}" stroke-width="1.9" stroke-opacity=".68" class="anim-flow"/>
          <rect x="8" y="${s.y - 19}" width="142" height="38" rx="11" fill="#151518" stroke="${s.c}" stroke-opacity=".42"/>
          <circle cx="24" cy="${s.y}" r="4" fill="${s.c}"/>
          <text x="36" y="${s.y + 4}" style="fill:#EDEDED;font-size:11.5px;font-weight:600">${s.lbl}</text>
        `).join('')}

        <g>
          <rect x="${cx - 96}" y="${cy - 44}" width="192" height="88" rx="18" fill="rgba(124,155,245,.15)" stroke="#7C9BF5" stroke-width="1.6"/>
          <text x="${cx}" y="${cy - 18}" text-anchor="middle" style="fill:#7C9BF5;font-size:10px;font-weight:700">${isEn ? '1 DAILY TOPIC → 1 MASTER PACK' : '每天只选 1 条好题 · 统一成片包'}</text>
          <text x="${cx}" y="${cy + 5}" text-anchor="middle" style="fill:#EDEDED;font-size:13.5px;font-weight:700">${isEn ? 'EP42 · Local Studio' : 'EP42 · 口播稿 + 粗剪'}</text>
          <text x="${cx}" y="${cy + 26}" text-anchor="middle" style="fill:#3DD68C;font-size:10.5px">${isEn ? `Fanning out to ${activeCount}/12 platforms` : `正在穿透已选 ${activeCount}/12 个平台`}</text>
        </g>

        ${platLines}
      </svg>
      <div class="fanout-chips">
        ${PLATFORMS_12.map(p => `<button type="button" class="plat-toggle ${enabledPlats.has(p.id) ? 'on' : ''} ${p.guard ? 'guard' : ''}" data-ptog="${p.id}"><i></i>${isEn ? p.en : p.zh}</button>`).join('')}
      </div>`;
  }

  // ===== SELLING POINT 3: Zero-Baseline Cumulative Follower Growth Area Chart =====
  function renderZeroGrowthChart() {
    const isEn = lang === 'en';
    const W = 880, H = 240, L = 52, R = 24, T = 22, B = 32;
    const months = isEn
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec*', 'Jan*', 'Feb*']
      : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月*', '1月*', '2月*'];
    const cnVals = [12, 22, 31, 44, 56, 70, 82, 94, 106, 118, 128, 139, 151, 164];
    const glVals = [4,  7,  11, 15, 20, 25, 30, 35, 40,  44,  47,  52,  58,  65];
    const totVals = cnVals.map((v, i) => v + glVals[i]);
    const maxY = 240;
    const n = months.length;
    const X = i => L + (i / (n - 1)) * (W - L - R);
    const Y = v => T + (1 - v / maxY) * (H - T - B);
    const y0 = Y(0);
    const splitX = X(10); // Nov is current

    const smoothLine = arr => {
      const pts = arr.map((v, i) => [X(i), Y(v)]);
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1);
        d += ` C ${mx} ${pts[i][1].toFixed(1)}, ${mx} ${pts[i + 1][1].toFixed(1)}, ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
      }
      return d;
    };
    const areaFromZero = arr => `${smoothLine(arr)} L ${X(n - 1).toFixed(1)} ${y0.toFixed(1)} L ${X(0).toFixed(1)} ${y0.toFixed(1)} Z`;

    const showCN = activeGrowthFilter === 'all' || activeGrowthFilter === 'cn';
    const showGL = activeGrowthFilter === 'all' || activeGrowthFilter === 'gl';
    const topArr = activeGrowthFilter === 'cn' ? cnVals : activeGrowthFilter === 'gl' ? glVals : totVals;

    const epMarks = [
      { i: 3,  ep: 'EP18' },
      { i: 6,  ep: 'EP29' },
      { i: 8,  ep: 'EP36' },
      { i: 10, ep: 'EP41' },
    ];

    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">
      <defs>
        <linearGradient id="gTot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C9BF5" stop-opacity=".34"/><stop offset="1" stop-color="#7C9BF5" stop-opacity=".02"/></linearGradient>
        <linearGradient id="gCn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3DD68C" stop-opacity=".28"/><stop offset="1" stop-color="#3DD68C" stop-opacity=".02"/></linearGradient>
        <clipPath id="grPast"><rect x="0" y="0" width="${splitX.toFixed(1)}" height="${H}"/></clipPath>
        <clipPath id="grFut"><rect x="${splitX.toFixed(1)}" y="0" width="${(W - splitX).toFixed(1)}" height="${H}"/></clipPath>
      </defs>

      ${[0, 60, 120, 180, 240].map(v => `
        <line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${v === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.06)'}" stroke-dasharray="${v === 0 ? '' : '3 3'}"/>
        <text x="${L - 10}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v === 0 ? '0' : v + 'k'}</text>
      `).join('')}

      <g clip-path="url(#grPast)">
        ${showGL ? `<path d="${areaFromZero(topArr)}" fill="url(#gTot)"/><path d="${smoothLine(topArr)}" fill="none" stroke="#7C9BF5" stroke-width="2.4" class="anim-sweep"/>` : ''}
        ${showCN ? `<path d="${areaFromZero(cnVals)}" fill="url(#gCn)"/><path d="${smoothLine(cnVals)}" fill="none" stroke="#3DD68C" stroke-width="${activeGrowthFilter === 'cn' ? 2.4 : 1.6}" stroke-opacity="${activeGrowthFilter === 'cn' ? 1 : .85}"/>` : ''}
      </g>

      <g clip-path="url(#grFut)" opacity="0.55">
        <path d="${areaFromZero(topArr)}" fill="url(#gTot)"/>
        <path d="${smoothLine(topArr)}" fill="none" stroke="#7C9BF5" stroke-width="2" stroke-dasharray="5 5"/>
      </g>

      <line x1="${splitX.toFixed(1)}" x2="${splitX.toFixed(1)}" y1="${T}" y2="${y0.toFixed(1)}" stroke="rgba(255,255,255,.28)" stroke-dasharray="4 4"/>
      <text x="${(splitX + 8).toFixed(1)}" y="${T + 11}" style="fill:#7C9BF5;font-size:10px">${isEn ? 'Projected →' : '按当前频次推演 →'}</text>

      ${epMarks.map(m => {
        const px = X(m.i), py = Y(topArr[m.i]);
        return `<g data-tip="${m.ep} · ${months[m.i]} · ${topArr[m.i]}k ${isEn ? 'total followers' : '累计粉丝'}">
          <line x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${(py + 6).toFixed(1)}" y2="${y0.toFixed(1)}" stroke="rgba(124,155,245,.22)" stroke-dasharray="2 3"/>
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${m.i === 10 ? 5.5 : 3.8}" fill="${m.i === 10 ? '#EDEDED' : '#7C9BF5'}" stroke="#7C9BF5" stroke-width="2"/>
          <text x="${px.toFixed(1)}" y="${(py - 10).toFixed(1)}" text-anchor="middle" style="fill:${m.i === 10 ? '#EDEDED' : '#A8A8AD'};font-size:10px">${m.ep}</text>
        </g>`;
      }).join('')}

      ${months.map((m, i) => (i % 2 === 0 || i === n - 1) ? `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${m}</text>` : '').join('')}
    </svg>`;
  }

  // ===== SELLING POINT 4L: Breakout Multiplier × Duration Sweet Spot =====
  function renderMultiplierScatter() {
    const isEn = lang === 'en';
    const W = 440, H = 224, L = 40, R = 18, T = 18, B = 28;
    const X = min => L + ((min - 1) / 9) * (W - L - R);
    const Y = mult => T + (1 - mult / 5) * (H - T - B);
    const pts = [
      { ep: 'EP36', min: 3.2, mult: 0.7, views: '18.9k' },
      { ep: 'EP35', min: 2.5, mult: 0.9, views: '24.6k' },
      { ep: 'EP37', min: 8.5, mult: 1.1, views: '31.2k' },
      { ep: 'EP41', min: 7.4, mult: 1.8, views: '51.4k' },
      { ep: 'EP40', min: 6.9, mult: 2.4, views: '68.4k' },
      { ep: 'EP39', min: 5.9, mult: 3.4, views: '96.8k' },
      { ep: 'EP38', min: 6.5, mult: 4.2, views: '118.2k' },
      { ep: 'EP34', min: 5.4, mult: 3.1, views: '88.1k' },
    ];
    const gx1 = X(5), gx2 = X(7.2);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">
      <rect x="${gx1.toFixed(1)}" y="${T}" width="${(gx2 - gx1).toFixed(1)}" height="${H - T - B}" rx="8" fill="rgba(124,155,245,.10)" stroke="rgba(124,155,245,.25)" stroke-dasharray="3 3"/>
      <text x="${((gx1 + gx2) / 2).toFixed(1)}" y="${T + 14}" text-anchor="middle" style="fill:#7C9BF5;font-size:10px">${isEn ? 'Golden Zone 5–7m' : '爆款黄金带 5–7m'}</text>
      ${[1, 2, 3, 4].map(m => `<line x1="${L}" x2="${W - R}" y1="${Y(m).toFixed(1)}" y2="${Y(m).toFixed(1)}" stroke="${m === 1 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.06)'}" stroke-dasharray="3 3"/><text x="${L - 8}" y="${(Y(m) + 4).toFixed(1)}" text-anchor="end">${m}×</text>`).join('')}
      ${[2, 4, 6, 8, 10].map(m => `<text x="${X(m).toFixed(1)}" y="${H - 6}" text-anchor="middle">${m}m</text>`).join('')}
      ${pts.map(p => {
        const hit = p.mult >= 3;
        return `<g data-tip="${p.ep} · ${p.min}m · ${p.mult}× (${p.views})">
          ${hit ? `<circle cx="${X(p.min).toFixed(1)}" cy="${Y(p.mult).toFixed(1)}" r="12" fill="#F5A524" fill-opacity=".16"/>` : ''}
          <circle cx="${X(p.min).toFixed(1)}" cy="${Y(p.mult).toFixed(1)}" r="${hit ? 7 : 5}" fill="${hit ? '#F5A524' : '#7C9BF5'}" fill-opacity="${hit ? 0.95 : 0.72}" stroke="#18181A" stroke-width="1.8"/>
        </g>`;
      }).join('')}
    </svg>`;
  }

  function renderWeChatModal() {
    if (!wxModalMode) return '';
    const isEn = lang === 'en';
    let title = isEn ? 'Join Park WeChat Group (¥199)' : '加 Park 微信 · ¥199 实战群';
    let remark = isEn ? '199 Group' : '199进群';
    let hint = isEn
      ? 'Scan with WeChat to add Park (Singapore) and note "199 Group" (one-time admission; private 1-on-1 Q&A ¥199/case):'
      : '用微信扫一扫添加 Park（新加坡），备注「199进群」（一次性入群；私聊 1v1 单独提问 ¥199/次）：';

    if (wxModalMode === 'desktop') {
      title = isEn ? 'Pre-order Signed Mac Desktop App (¥199)' : '预约 Mac 桌面签名版（¥199）';
      remark = isEn ? 'MacApp199' : 'Mac桌面版199';
      hint = isEn
        ? 'Scan to reserve the Apple-notarized .dmg build (launches at 5 reservations, or hands-on packaging by Park):'
        : '扫一扫添加 Park（新加坡），备注「Mac桌面版199」登记早鸟签名版（满 5 人即上线公证 .dmg，或直接帮你本地打包装好）：';
    } else if (wxModalMode === 'custom') {
      title = isEn ? 'Custom Builds & Enterprise AI Training' : '加 Park 微信 · 定制开发与企业 AI 培训';
      remark = isEn ? 'Hi Park, I want to discuss Custom Dev / AI Training. Our scenario is: ' : '你好 Park，我想咨询定制开发 / 企业 AI 培训，我们的业务场景是：';
      hint = isEn
        ? 'Scan to connect directly with Park (Singapore) and copy the note below:'
        : '用微信扫一扫添加 Park（新加坡），复制下方备注简述你的业务场景即可直接评估：';
    }

    return `<div class="wx-modal-bg" id="wxModalBg">
      <div class="wx-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="wx-modal-h">
          <h3>${title}</h3>
          <button type="button" class="wx-close" id="wxClose" aria-label="Close">✕</button>
        </div>
        <p style="margin:0;font-size:13.5px;color:var(--label-2);line-height:1.6">${hint}</p>
        <div class="wx-qr-frame"><img src="${rel('assets/park-wechat-qr.jpg')}" alt="Park WeChat QR Code"></div>
        <div class="wx-remark-box">
          <div>${isEn ? 'Suggested Note:' : '建议备注：'}<br><b id="wxRemarkTxt">${remark}</b></div>
          <button type="button" class="copy-btn" id="copyWxRemark">${isEn ? 'Copy' : '复制'}</button>
        </div>
      </div>
    </div>`;
  }

  function renderLightbox() {
    if (!lightbox) return '';
    const item = CASES.find(c => c.id === lightbox.caseId);
    if (!item) return '';
    const shot = item.shots[lightbox.idx] || item.shots[0];
    const isEn = lang === 'en';
    return `<div class="wx-modal-bg" id="lbBg">
      <div class="lb-modal" role="dialog" aria-modal="true" aria-label="${item.name[lang]}">
        <div class="wx-modal-h">
          <div>
            <h3 style="margin:0;font-size:17px">${item.name[lang]} <span class="case-tag" style="margin-left:8px;vertical-align:middle">${item.tag[lang]}</span></h3>
          </div>
          <button type="button" class="wx-close" id="lbClose" aria-label="Close">✕</button>
        </div>
        <div class="lb-img-wrap">
          <img src="${rel(shot.src)}" alt="${shot.cap[lang]}">
        </div>
        <div class="lb-foot">
          <span>${shot.cap[lang]} (${lightbox.idx + 1} / ${item.shots.length})</span>
          <div class="lb-nav">
            <button type="button" class="btn-pill ghost" id="lbPrev">← ${isEn ? 'Prev' : '上一张'}</button>
            <button type="button" class="btn-pill ghost" id="lbNext">${isEn ? 'Next' : '下一张'} →</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderAll() {
    const t = I18N[lang];
    const isEn = lang === 'en';
    document.documentElement.lang = isEn ? 'en' : 'zh-CN';
    document.title = t.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t.desc;

    const feat = t.features.tabs.find(x => x.key === activeFeat) || t.features.tabs[0];
    const dep = t.deploy.tabs.find(x => x.key === activeDeploy) || t.deploy.tabs[0];

    document.getElementById('root').innerHTML = `
      <header class="nav">
        <div class="wrap nav-in">
          <a class="brand" href="#top">${BRAND_SVG}<span>Park Studio</span></a>
          <nav class="nav-links" aria-label="Primary">
            <a href="#features" data-sec="features">${t.nav.features}</a>
            <a href="#charts" data-sec="charts">${t.nav.charts}</a>
            <a href="#ai" data-sec="ai">${t.nav.ai}</a>
            <a href="#deploy" data-sec="deploy">${t.nav.deploy}</a>
            <a href="#community" data-sec="community" class="accent-link">${t.nav.community}</a>
            <a href="${rel('docs/')}">${t.nav.docs}</a>
          </nav>
          <div class="nav-right">
            <button type="button" class="nav-util" id="langBtn" aria-label="Switch language">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
              <span>${t.nav.langLabel}</span>
            </button>
            <a class="nav-util" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${GH_SVG}<span id="ghStars">GitHub</span></a>
            <span class="nav-sep"></span>
            <a class="btn-pill solid" href="${rel('demo/')}">${t.nav.demo}</a>
          </div>
        </div>
      </header>

      <main id="top">
        <section class="hero">
          <div class="wrap">
            <a class="eyebrow-pill" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">
              ${GH_SVG}<span>${t.hero.eyebrow}</span><span>→</span>
            </a>
            <h1>${t.hero.h1a}<br>${t.hero.h1b}</h1>
            <div class="hero-subrow">
              <p class="hero-lead">${t.hero.lead}</p>
              <div class="hero-ctas">
                <a class="btn-pill solid lg" href="${rel('demo/')}">${t.hero.ctaDemo} →</a>
                <a class="btn-pill ghost lg" href="#deploy">${t.hero.ctaDeploy}</a>
              </div>
            </div>
            <div class="hero-subnote">
              <span>${t.hero.subJoin}</span>
              <a href="#community">${t.hero.subLink}</a>
            </div>

            <div class="hero-stage">
              <div class="hero-glow"></div>
              <div class="mac-frame">
                <div class="mac-bar">
                  <div class="mac-dots"><i></i><i></i><i></i></div>
                  <div class="mac-url">Park Studio · 127.0.0.1:8792</div>
                  <div style="width:44px"></div>
                </div>
                <div class="mac-body">
                  <aside class="mac-side">
                    <div class="ms-brand">${BRAND_SVG.replace('brand-ic', 'brand-ic" style="width:18px;height:18px')}<span>Park Studio</span></div>
                    <div class="ms-item on"><span>${isEn ? 'Overview' : '中控大屏'}</span><span class="ms-cnt">12</span></div>
                    <div class="ms-item"><span>${isEn ? 'Topics' : '选题'}</span><span class="ms-cnt">1/day</span></div>
                    <div class="ms-item"><span>${isEn ? 'Cut' : '剪辑'}</span><span class="ms-cnt">EP42</span></div>
                    <div class="ms-item"><span>${isEn ? 'Publish' : '发布'}</span><span class="ms-cnt" style="color:var(--amber)">2</span></div>
                    <div class="ms-item"><span>${isEn ? 'Review' : '复盘'}</span><span class="ms-cnt">+66%</span></div>
                    <div class="ms-sec">${isEn ? 'Local Engine' : '本机引擎'}</div>
                    <div class="ms-up"><span>Chrome :9333</span><span style="color:var(--green)">Live</span></div>
                    <div class="ms-up"><span>Obsidian</span><span style="color:var(--green)">RO</span></div>
                    <div class="ms-up"><span>Local CLI</span><span>Ready</span></div>
                  </aside>
                  <div class="mac-main">
                    <div class="mm-head">
                      <h3>${isEn ? '12-Platform Command Hub' : '12 平台内容中控'}</h3>
                      <span class="mm-pill"><i></i>${isEn ? 'MIT Open Source · 100% Local' : 'MIT 开源 · 数据 100% 在本机'}</span>
                    </div>
                    <div class="mm-hero-card">
                      <div>
                        <div class="mm-kpi-lbl">${isEn ? 'Cumulative followers (12 platforms)' : '12 平台累计真实粉丝'}</div>
                        <div class="mm-kpi-val">174,820</div>
                        <div class="mm-delta">↑ +3,840 · 30d</div>
                        <div class="mm-mini-grid">
                          <div><span>${isEn ? 'EP41 Day-1 views' : 'EP41 首日播放'}</span><b>168,420</b></div>
                          <div><span>${isEn ? 'Team replaced' : '替代人力'}</span><b style="color:var(--accent)">4 → 1</b></div>
                          <div><span>${isEn ? 'Daily focus' : '每日选题'}</span><b>1 / day</b></div>
                          <div><span>${isEn ? 'API / SaaS fee' : '强制订阅费'}</span><b style="color:var(--green)">¥0</b></div>
                        </div>
                      </div>
                      <div class="mm-bubbles">${buildHeroMiniChart()}</div>
                    </div>
                    <div class="mm-timeline">
                      <div class="mm-tl-head"><span>${isEn ? 'EP41 · 12 Opt-In Platforms' : 'EP41 · 12 平台按需分发矩阵'}</span><span>${isEn ? 'Pick only what you use' : '支持 12 平台 · 按需勾选不强填'}</span></div>
                      <div class="mm-tl-row">
                        <div class="mm-plat-pill wait"><b>${isEn ? 'Douyin' : '抖音'}</b><span>${isEn ? 'Guard' : '只填不发'}</span></div>
                        <div class="mm-plat-pill wait"><b>${isEn ? 'XHS' : '小红书'}</b><span>${isEn ? 'Guard' : '只填不发'}</span></div>
                        <div class="mm-plat-pill ok"><b>B站</b><span>21.6k</span></div>
                        <div class="mm-plat-pill ok"><b>YouTube</b><span>12.8k</span></div>
                        <div class="mm-plat-pill ok"><b>TikTok</b><span>26.8k</span></div>
                        <div class="mm-plat-pill ok"><b>X · IG · LI</b><span>+68k</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="float-card float-left">
                <div class="fl-head"><span>${isEn ? 'Today\'s 1 Pick' : '今日唯一主线选题'}</span><span class="fl-badge">4.6×</span></div>
                <div class="fl-item">
                  <b>${isEn ? '1 Daily Topic → 12 Platforms With Zero SaaS Fees' : '每天只挑 1 条好题，穿透 12 平台闭环'}</b>
                  <small><span>Obsidian + 3× Radar</span><span class="fl-mult">${isEn ? 'Selected' : '已选定'}</span></small>
                </div>
                <div class="fl-item">
                  <b>${isEn ? '4-Person Content Team → Just You' : '一个人干完编导、文案、剪辑、运营的活'}</b>
                  <small><span>${isEn ? 'Local Agent' : '本机 Agent'}</span><span class="fl-mult">¥0</span></small>
                </div>
              </div>

              <div class="float-card float-right">
                <div class="fr-head"><b>EP42 · ${isEn ? 'Safety Guardrails' : '发布安全护栏'}</b><span>CDP :9333</span></div>
                <div class="fr-rows">
                  <div class="fr-row"><span><i class="fr-dot wait"></i>${isEn ? 'Douyin / XHS / Bili / Channels' : '抖音 · 小红书 · B站 · 视频号'}</span><span class="fr-tag">${isEn ? 'Human Click' : '只填不点发'}</span></div>
                  <div class="fr-row"><span><i class="fr-dot ok"></i>YouTube · X · TikTok · IG</span><span class="fr-tag">${isEn ? 'Opt-In Auto' : '定时 / 自动'}</span></div>
                  <div class="fr-row"><span><i class="fr-dot ok"></i>Threads · LinkedIn · Meta</span><span class="fr-tag">${isEn ? 'Opt-In Auto' : '按需启用'}</span></div>
                </div>
                <div class="fr-foot"><span>🛡</span><span>${isEn ? 'Pre-submit JPEG saved · Zero cloud cookies' : '存档提交前截图 · Cookie 绝不出本机'}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" class="sec">
          <div class="wrap">
            <div class="sec-center">
              <div class="eyebrow">${t.features.eyebrow}</div>
              <h2>${t.features.h2}</h2>
              <p class="sec-lead">${t.features.lead}</p>
            </div>
            <div class="feat-tabs-wrap">
              <div class="seg-pills" role="tablist">
                ${t.features.tabs.map(tb => `<button type="button" role="tab" aria-selected="${tb.key === activeFeat ? 'true' : 'false'}" class="${tb.key === activeFeat ? 'on' : ''}" data-feat="${tb.key}">${tb.label}</button>`).join('')}
              </div>
            </div>
            <div class="feat-copy">
              <h3>${feat.h3}</h3>
              <div>
                <p>${feat.p}</p>
                <a class="inline-link" href="${rel(feat.linkHref)}">${feat.linkText}</a>
              </div>
            </div>
            <div class="preview-shell" id="featPreview">${renderFeaturePreview(activeFeat)}</div>
          </div>
        </section>

        <section id="charts" class="sec">
          <div class="wrap sec-divider">
            <div class="sec-split">
              <div>
                <div class="eyebrow">${t.selling.eyebrow}</div>
                <h2>${t.selling.h2}</h2>
              </div>
              <div>
                <p>${t.selling.lead}</p>
                <a class="inline-link" href="${rel('demo/')}">${t.selling.link}</a>
              </div>
            </div>

            <div class="bento-stack">
              <div class="bcard">
                <div class="bcard-h">
                  <div><h3>${t.selling.orgTitle}</h3><p>${t.selling.orgSub}</p></div>
                </div>
                ${renderOrgChart()}
              </div>

              <div class="bcard">
                <div class="bcard-h">
                  <div><h3>${t.selling.fanTitle}</h3><p>${t.selling.fanSub}</p></div>
                  <div class="fanout-controls">
                    <div class="seg-pills">
                      <button type="button" class="${enabledPlats.size === 12 ? 'on' : ''}" data-preset="all12">${isEn ? 'All 12' : '全部 12 平台'}</button>
                      <button type="button" class="${enabledPlats.size === 5 && enabledPlats.has('douyin') && !enabledPlats.has('youtube') ? 'on' : ''}" data-preset="cn5">${isEn ? 'CN 5' : '仅国内 5 家'}</button>
                      <button type="button" class="${enabledPlats.size === 7 && enabledPlats.has('youtube') && !enabledPlats.has('douyin') ? 'on' : ''}" data-preset="gl7">${isEn ? 'Global 7' : '仅海外 7 家'}</button>
                    </div>
                  </div>
                </div>
                ${renderFanOut12()}
              </div>

              <div class="bcard">
                <div class="bcard-h">
                  <div><h3>${t.selling.growthTitle}</h3><p>${t.selling.growthSub}</p></div>
                  <div class="legend">
                    <button type="button" class="legend-btn ${activeGrowthFilter === 'all' ? 'on' : ''}" data-gf="all"><i class="ldot" style="background:#7C9BF5"></i>${isEn ? 'All 12 (175k)' : '全网 12 平台 (17.5万)'}</button>
                    <button type="button" class="legend-btn ${activeGrowthFilter === 'cn' ? 'on' : ''}" data-gf="cn"><i class="ldot" style="background:#3DD68C"></i>${isEn ? 'CN 5 (128k)' : '国内 5 平台 (12.8万)'}</button>
                    <button type="button" class="legend-btn ${activeGrowthFilter === 'gl' ? 'on' : ''}" data-gf="gl"><i class="ldot" style="background:#A78BFA"></i>${isEn ? 'Global 7 (47k)' : '海外 7 平台 (4.7万)'}</button>
                  </div>
                </div>
                ${renderZeroGrowthChart()}
              </div>

              <div class="bento-2">
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.selling.scatterTitle}</h3><p>${t.selling.scatterSub}</p></div></div>
                  ${renderMultiplierScatter()}
                </div>
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.selling.guardTitle}</h3><p>${t.selling.guardSub}</p></div></div>
                  <div class="sec-list">
                    <div class="sec-row"><div class="sec-row-l"><span class="sec-dot"></span><div><b>${isEn ? '100% MIT Open Source' : 'GitHub 100% MIT 开源'}</b><small>${isEn ? 'Auditable code, zero vendor lock-in' : '全部代码公开可审计，零闭源插件'}</small></div></div><span class="sec-tag">GitHub</span></div>
                    <div class="sec-row"><div class="sec-row-l"><span class="sec-dot"></span><div><b>${isEn ? 'Obsidian Strictly Read-Only' : 'Obsidian 严格只读挂载'}</b><small>${isEn ? 'Never overwrites your Markdown notes' : '只读不写，绝不改动任何原始笔记'}</small></div></div><span class="sec-tag">RO</span></div>
                    <div class="sec-row"><div class="sec-row-l"><span class="sec-dot amber"></span><div><b>${isEn ? 'CN 4 Platforms: Autofill Only' : '国内 4 平台严格只填不点发'}</b><small>${isEn ? 'Pauses with JPEG proof before final click' : '存档提交前截图，最后一下亲自确认'}</small></div></div><span class="sec-tag amber">Guard</span></div>
                    <div class="sec-row"><div class="sec-row-l"><span class="sec-dot"></span><div><b>${isEn ? 'Isolated Chrome CDP :9333' : '独立 Chrome Profile 隔离'}</b><small>${isEn ? 'Never touches your everyday browser' : '一次扫码保活，绝不碰日常浏览器'}</small></div></div><span class="sec-tag">:9333</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ai" class="sec">
          <div class="wrap sec-divider">
            <div class="sec-center">
              <div class="eyebrow">${t.ai.eyebrow}</div>
              <h2>${t.ai.h2}</h2>
              <p class="sec-lead">${t.ai.lead}</p>
            </div>
            <div class="agent-strip">
              <span class="agent-pill"><i></i>Gemini CLI</span>
              <span class="agent-pill"><i></i>Claude Code</span>
              <span class="agent-pill"><i></i>Codex</span>
              <span class="agent-pill"><i></i>Antigravity CLI (agy)</span>
              <span class="agent-pill"><i></i>Cursor</span>
              <span class="agent-pill"><i></i>OpenAI Compatible</span>
            </div>

            <div class="ai-grid">
              <div class="ai-card">
                <div class="ai-split">
                  <div>
                    <div class="eyebrow">${t.ai.leftEyebrow}</div>
                    <h3>${t.ai.leftH3}</h3>
                    <ul class="ai-list">${t.ai.leftList.map(li => `<li><span class="ai-check">✓</span><span>${li}</span></li>`).join('')}</ul>
                    <a class="inline-link" href="${rel('docs/#topic')}">${t.ai.leftLink}</a>
                  </div>
                  <div class="audit-mock">
                    <div style="display:flex;justify-content:space-between;color:var(--label-3);font-family:var(--mono);font-size:11px"><span>3-AXIS AUDIT</span><span style="color:var(--green)">Local CLI</span></div>
                    <div class="audit-score-row">
                      <div class="audit-score"><span>${isEn ? 'Value' : '价值'}</span><b>9.4</b></div>
                      <div class="audit-score"><span>${isEn ? 'Resonance' : '共鸣'}</span><b>9.1</b></div>
                      <div class="audit-score"><span>${isEn ? 'Pacing' : '节奏'}</span><b>8.8</b></div>
                    </div>
                    <div class="audit-diff">
                      <b>${isEn ? 'Suggested Hook Rewrite:' : '最小改法建议：'}</b><br>
                      ${isEn ? 'Lead with the 60-second autofill clip instead of background context.' : '删掉前 18 秒背景铺垫，第一句直接抛「1 条好题穿透 12 个平台」真实演示画面。'}
                    </div>
                  </div>
                </div>
                <div class="ai-foot"><span>${t.ai.leftFoot}</span></div>
              </div>

              <div class="ai-card">
                <div>
                  <div class="eyebrow">${t.ai.rightEyebrow}</div>
                  <h3>${t.ai.rightH3}</h3>
                  <p style="color:var(--label-2);font-size:14.5px;margin:0 0 18px;line-height:1.68">${t.ai.rightP}</p>
                </div>
                <div style="display:flex;flex-direction:column;gap:12px">
                  <div class="chat-bubble">${t.ai.rightBubble}</div>
                  <div class="dir-box"><b>2026-11-25_EP42/final/上传/</b><br>├── 视频（通用主片）.mp4 <em>faststart</em><br>├── 竖封面（9:16）.png<br>├── 横封面（3:4 / 4:3）.png<br>├── 16比9封面（B站、YouTube）.png<br>└── 文案.txt · publish.json <em>✓ Ready</em></div>
                </div>
                <div class="ai-foot"><a class="inline-link" href="${rel('docs/#directory')}">${t.ai.rightLink}</a></div>
              </div>
            </div>
          </div>
        </section>

        <section id="deploy" class="sec">
          <div class="wrap sec-divider">
            <div class="sec-center">
              <div class="eyebrow">${t.deploy.eyebrow}</div>
              <h2>${t.deploy.h2}</h2>
              <p class="sec-lead">${t.deploy.lead}</p>
            </div>

            <div class="deploy-card">
              <div class="deploy-top">
                <div class="seg-pills" role="tablist">
                  ${t.deploy.tabs.map(tb => `<button type="button" role="tab" aria-selected="${tb.key === activeDeploy ? 'true' : 'false'}" class="${tb.key === activeDeploy ? 'on' : ''}" data-dep="${tb.key}">${tb.label}</button>`).join('')}
                </div>
                <a class="inline-link" href="${rel('docs/#quickstart')}">${t.deploy.docsLink}</a>
              </div>
              <div class="deploy-note"><span class="rec-tag">${dep.rec}</span><span>${dep.note}</span></div>
              <div class="term">
                <div class="term-h">
                  <div class="term-dots"><i></i><i></i><i></i></div>
                  <button type="button" class="copy-btn" id="copyDeployBtn">${t.deploy.copy}</button>
                </div>
                <pre id="deployCode"></pre>
              </div>
              <div class="deploy-foot">
                <span>${dep.foot}</span>
                <a class="btn-pill solid" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${GH_SVG}<span>${t.deploy.ghCta}</span></a>
              </div>
              <div class="desktop-upsell">
                <div style="max-width:640px">
                  <b>${t.deploy.desktopTitle}</b>
                  <span>${t.deploy.desktopDesc}</span>
                </div>
                <button type="button" class="btn-pill indigo" data-open-wx="desktop">${t.deploy.desktopBtn}</button>
              </div>
            </div>
          </div>
        </section>

        <section id="community" class="sec">
          <div class="wrap sec-divider">
            <div class="sec-center">
              <div class="eyebrow">${t.community.eyebrow}</div>
              <h2>${t.community.h2a}<br>${t.community.h2b}</h2>
              <p class="sec-lead">${t.community.lead}</p>
            </div>

            <div class="biz-grid">
              <div class="biz-card">
                <div>
                  <div class="biz-audience">${t.community.c1Tag}</div>
                  <h3>${t.community.c1Title}</h3>
                  <div class="biz-price"><b>${t.community.c1Price}</b><span>${t.community.c1Unit}</span></div>
                  <p class="biz-desc">${t.community.c1Desc}</p>
                  <ul class="biz-list">${t.community.c1List.map(li => `<li><span class="ai-check">✓</span><span>${li}</span></li>`).join('')}</ul>
                </div>
                <div style="display:flex;flex-direction:column;gap:14px">
                  <div class="biz-rule">${t.community.c1Rule}</div>
                  <button type="button" class="btn-pill ghost lg" style="width:100%" data-open-wx="group">${t.community.c1Cta}</button>
                </div>
              </div>

              <div class="biz-card featured">
                <div>
                  <div class="biz-audience">${t.community.c2Tag}</div>
                  <h3>${t.community.c2Title}</h3>
                  <div class="biz-price"><b>${t.community.c2Price}</b><span>${t.community.c2Unit}</span></div>
                  <p class="biz-desc">${t.community.c2Desc}</p>
                  <ul class="biz-list">${t.community.c2List.map(li => `<li><span class="ai-check">✓</span><span>${li}</span></li>`).join('')}</ul>
                </div>
                <div style="display:flex;flex-direction:column;gap:14px">
                  <div class="biz-note">${t.community.c2Note}</div>
                  <button type="button" class="btn-pill solid lg" style="width:100%" data-open-wx="custom">${t.community.c2Cta}</button>
                </div>
              </div>
            </div>

            <div id="cases" class="cases-head">
              <div>
                <h3>${t.community.casesTitle}</h3>
                <p>${t.community.casesSub}</p>
              </div>
              <span class="qr-tag">${isEn ? '6 Shipped Systems · Click to zoom' : '6 个真实交付项目 · 点击缩略图放大'}</span>
            </div>

            <div class="cases-grid">
              ${CASES.map(cs => `
                <div class="case-card">
                  <div class="case-top">
                    <h4>${cs.name[lang]}</h4>
                    <span class="case-tag">${cs.tag[lang]}</span>
                  </div>
                  <p class="case-desc">${cs.desc[lang]}</p>
                  <div class="case-thumbs">
                    ${cs.shots.map((sh, idx) => `
                      <button type="button" class="case-thumb" data-lb="${cs.id}:${idx}" title="${sh.cap[lang]}">
                        <img src="${rel(sh.src)}" alt="${sh.cap[lang]}" loading="lazy">
                      </button>`).join('')}
                  </div>
                </div>`).join('')}
            </div>

            <div class="qr-strip">
              <div class="qr-thumb-box" data-open-wx="group" title="${isEn ? 'Click to enlarge QR' : '点击放大二维码'}">
                <img src="${rel('assets/park-wechat-qr.jpg')}" alt="Park WeChat QR Code">
              </div>
              <div>
                <h4>${t.community.qrTitle}</h4>
                <p>${t.community.qrDesc}</p>
                <div class="qr-tags">
                  <span class="qr-tag">${isEn ? 'Note: 199 Group' : '实战群备注：199进群'}</span>
                  <span class="qr-tag">${isEn ? 'Note: MacApp199' : '桌面版：Mac桌面版199'}</span>
                  <span class="qr-tag">${isEn ? 'Note: Custom' : '定制与培训：定制'}</span>
                </div>
              </div>
              <button type="button" class="btn-pill indigo" data-open-wx="group">${t.community.qrBtn}</button>
            </div>
          </div>
        </section>
      </main>

      <footer class="foot">
        <div class="wrap">
          <div class="foot-grid">
            <div><a class="brand" href="#top">${BRAND_SVG}<span>Park Studio</span></a><p class="foot-desc">${t.foot.desc}</p></div>
            ${t.foot.cols.map(col => `<div><h4>${col.h}</h4><ul>${col.links.map(([lbl, href]) => `<li><a href="${rel(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${lbl}</a></li>`).join('')}</ul></div>`).join('')}
          </div>
          <div class="colophon"><span>${t.foot.colophon}</span><span>${t.foot.license}</span></div>
        </div>
      </footer>
      ${renderWeChatModal()}
      ${renderLightbox()}
    `;

    document.getElementById('deployCode').textContent = dep.code;

    // Bindings
    document.getElementById('langBtn').onclick = () => {
      lang = lang === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('ps:site:lang', lang); } catch (e) {}
      renderAll();
    };
    document.querySelectorAll('[data-feat]').forEach(b => b.onclick = () => { activeFeat = b.dataset.feat; renderAll(); });
    document.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => { activeDeploy = b.dataset.dep; renderAll(); });
    document.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { activeTopicFilter = b.dataset.tf; renderAll(); });
    document.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { activeCutMode = b.dataset.cm; renderAll(); });
    document.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { activeGrowthFilter = b.dataset.gf; renderAll(); });

    document.querySelectorAll('[data-ptog]').forEach(el => {
      el.onclick = () => {
        const pid = el.dataset.ptog;
        if (enabledPlats.has(pid) && enabledPlats.size > 1) enabledPlats.delete(pid);
        else enabledPlats.add(pid);
        renderAll();
      };
    });
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.preset;
        if (k === 'all12') enabledPlats = new Set(PLATFORMS_12.map(p => p.id));
        if (k === 'cn5') enabledPlats = new Set(PLATFORMS_12.filter(p => p.group === 'cn').map(p => p.id));
        if (k === 'gl7') enabledPlats = new Set(PLATFORMS_12.filter(p => p.group === 'gl').map(p => p.id));
        renderAll();
      };
    });

    const copyBtn = document.getElementById('copyDeployBtn');
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(dep.code); } catch (e) {}
      copyBtn.textContent = t.deploy.copied + ' ✓';
      copyBtn.classList.add('ok');
      setTimeout(() => { copyBtn.textContent = t.deploy.copy; copyBtn.classList.remove('ok'); }, 1800);
    };

    document.querySelectorAll('[data-open-wx]').forEach(b => {
      b.onclick = () => { wxModalMode = b.dataset.openWx; renderAll(); };
    });
    const wxBg = document.getElementById('wxModalBg');
    if (wxBg) {
      wxBg.onclick = e => { if (e.target === wxBg) { wxModalMode = null; renderAll(); } };
      document.getElementById('wxClose').onclick = () => { wxModalMode = null; renderAll(); };
      const cBtn = document.getElementById('copyWxRemark');
      cBtn.onclick = async () => {
        const txt = document.getElementById('wxRemarkTxt').textContent;
        try { await navigator.clipboard.writeText(txt); } catch (e) {}
        cBtn.textContent = isEn ? 'Copied ✓' : '已复制 ✓';
        cBtn.classList.add('ok');
        setTimeout(() => { cBtn.textContent = isEn ? 'Copy' : '复制'; cBtn.classList.remove('ok'); }, 1600);
      };
    }

    document.querySelectorAll('[data-lb]').forEach(btn => {
      btn.onclick = () => {
        const [caseId, idx] = btn.dataset.lb.split(':');
        lightbox = { caseId, idx: Number(idx) || 0 };
        renderAll();
      };
    });
    const lbBg = document.getElementById('lbBg');
    if (lbBg && lightbox) {
      const item = CASES.find(c => c.id === lightbox.caseId);
      const total = item ? item.shots.length : 1;
      lbBg.onclick = e => { if (e.target === lbBg) { lightbox = null; renderAll(); } };
      document.getElementById('lbClose').onclick = () => { lightbox = null; renderAll(); };
      document.getElementById('lbPrev').onclick = () => { lightbox.idx = (lightbox.idx - 1 + total) % total; renderAll(); };
      document.getElementById('lbNext').onclick = () => { lightbox.idx = (lightbox.idx + 1) % total; renderAll(); };
    }

    updateStarsText();
    setupScrollspy();
  }

  let cachedStars = null;
  function updateStarsText() {
    const el = document.getElementById('ghStars');
    if (el && cachedStars != null) el.textContent = `★ ${cachedStars}`;
  }
  fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && typeof d.stargazers_count === 'number' && d.stargazers_count > 0) { cachedStars = d.stargazers_count; updateStarsText(); } })
    .catch(() => {});

  function setupScrollspy() {
    const ids = ['features', 'charts', 'ai', 'deploy', 'community'];
    const onScroll = () => {
      let cur = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) cur = id;
      }
      document.querySelectorAll('.nav-links a[data-sec]').forEach(a => a.classList.toggle('on', a.dataset.sec === cur));
    };
    window.removeEventListener('scroll', window._psSpy);
    window._psSpy = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (wxModalMode || lightbox)) { wxModalMode = null; lightbox = null; renderAll(); }
    if (lightbox && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const item = CASES.find(c => c.id === lightbox.caseId);
      if (!item) return;
      const n = item.shots.length;
      lightbox.idx = e.key === 'ArrowRight' ? (lightbox.idx + 1) % n : (lightbox.idx - 1 + n) % n;
      renderAll();
    }
  });

  const tip = document.createElement('div');
  tip.className = 'site-tip';
  document.body.appendChild(tip);
  document.addEventListener('mousemove', e => {
    const target = e.target.closest?.('[data-tip]');
    if (!target) { tip.style.display = 'none'; return; }
    tip.textContent = target.dataset.tip;
    tip.style.display = 'block';
    tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 14, e.clientX + 14) + 'px';
    tip.style.top = Math.min(window.innerHeight - tip.offsetHeight - 14, e.clientY + 14) + 'px';
  });

  renderAll();
})();
