/* Park Studio ZH / EN Bilingual UI Engine (Zero-Build) */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const LANG_KEY = 'ps:lang';

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) {}
    const nav = (navigator.language || 'zh-CN').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  PS.lang = detectInitialLang();
  document.documentElement.lang = PS.lang === 'en' ? 'en' : 'zh-CN';

  // Exact idiomatic English UI dictionary (sorted logically by workspace)
  const EXACT = {
    // Top dock & navigation
    '中控': 'Hub',
    '选题': 'Topics',
    '剪辑': 'Cut',
    '发布': 'Publish',
    '复盘': 'Review',
    '系统': 'System',
    '搜索': 'Search',
    '更多': 'More',
    '日报 · 对标': 'Dailies & Benchmarks',
    '选题池': 'Topic Pool',
    '定稿': 'Final Scripts',
    '待剪': 'To Cut',
    '剪辑中 · 镜头表': 'Cutting · Spec Table',
    '剪好了': 'Rendered',
    '视觉素材库': 'Visual Materials',
    '待发': 'Queue',
    '打包': 'Package',
    '确认': 'Fill & Confirm',
    '已发': 'Published',
    '同龄复盘 · 抖音分析': 'Cohort Review & Analytics',
    '我的定位': 'Positioning',
    '知识库': 'Knowledge Base',
    '上新': 'Releases',
    '系统与创作者中枢': 'System & Creator Hub',
    '系统与体检': 'System & Health',
    '知识库（Obsidian）': 'Knowledge Base (Obsidian)',
    '上新 · 版本动态': 'Releases & Changelog',
    '通知中心': 'Notifications',
    '◐ 切换深浅外观': '◐ Toggle Light / Dark',
    '全部已读': 'Mark All Read',
    '关闭': 'Close',
    '取消': 'Cancel',
    '保存': 'Save',
    '稍后再说': 'Skip for Now',
    '搜索页面、选题和作品…': 'Search pages, topics, and works…',
    '没有匹配的页面': 'No matching pages',
    '搜索页面和选题 (⌘K)': 'Search pages & topics (⌘K)',
    '切换深浅色外观': 'Toggle light / dark theme',
    '切换界面语言 (中 / EN)': 'Switch language (ZH / EN)',
    '已切换深色模式': 'Switched to dark theme',
    '已切换浅色模式': 'Switched to light theme',

    // Platforms
    '抖音': 'Douyin',
    '小红书': 'Xiaohongshu',
    'B站': 'Bilibili',
    'B 站': 'Bilibili',
    '视频号': 'WeChat Channels',
    '公众号': 'WeChat OA',
    '全平台': 'All Platforms',
    '只填不发': 'Fill-Only',
    '核对后发': 'Review & Post',

    // Dashboard (#dashboard)
    '中控大屏': 'Creator Hub',
    '导入素材 / 贴稿': 'Import Media / Draft',
    '立即采数（粉丝+流量）': 'Sync Live Metrics',
    '正在做 · 剪辑工作台': 'In Progress · Cut Workbench',
    '接着剪 ›': 'Resume Cut ›',
    '去点发 ›': 'Review & Post ›',
    '看日报 ›': 'Open Dailies ›',
    '查看全部复盘 ›': 'View All Reviews ›',
    '全平台总粉丝': 'Total Followers',
    '暂无足够历史数据': 'Collecting daily trend history',
    '实测数据 · 每日按平台堆叠 · 虚线为发布日': 'Live metrics · Stacked by platform · Dashed = publish day',
    '人话结论': 'Key Insights',
    '看复盘与作品分析 ›': 'Open Review & Analytics ›',
    '管理专用 Chrome 与平台开关 ›': 'Manage Chrome & Platforms ›',
    '全平台实测播放': 'Total Views',
    '总互动（赞+藏+评+转）': 'Engagements',
    '综合互动率': 'Engagement Rate',
    '收藏 / 赞': 'Save / Like',
    '粉丝': 'Followers',
    '最新期': 'Latest',
    '代表作': 'Top Hit',
    '未采到': 'Pending',
    '暂未采到粉丝数': 'No follower count yet',
    '真实作品数据待采集': 'Live Works Pending Sync',

    // Onboarding modal
    '欢迎使用 Park Studio · 按需选择你真正在发的平台': 'Welcome to Park Studio · Pick Only the Platforms You Use',
    '支持 12 个平台，但不需要全填。': '12 platforms supported — zero obligation to use them all.',
    '你平时只发 3 个或 5 个平台，就只勾那几个；没选的平台会自动隐藏，不会出现在大屏、体检或发布队列里，随时都能在「● 系统」里增减。':
      'Only publish to 3 or 5 platforms? Just check those. Unselected platforms stay cleanly hidden from your hub, health checks, and publish queue — toggle anytime in System.',
    '常用组合一键套用：': 'Quick presets:',
    '国内 4 家': 'China 4',
    '国内 5 家（+ 公众号）': 'China 5 (+ WeChat OA)',
    '国内 + 出海 7 家': 'CN + Global 7',
    '纯出海 5 家': 'Global 5 (YT/X/TT/IG/LI)',
    '全部 12 家': 'All 12',
    '清空重选': 'Clear All',
    '中文与主流平台（7 家）': 'Core Platforms (7)',
    '海外扩展平台（5 家）': 'Global Platforms (5)',
    '顺手选一个 AI 引擎（随时可换）：': 'Pick your default AI engine (switch anytime):',
    '✓ 已选': '✓ On',
    '未选': 'Off',
    '暂不启用平台，先体验选题与剪辑': 'Skip platforms — start with Topics & Cut',
    '正在保存配置…': 'Saving setup…',
    '选平台引导': 'Platform Setup',
    '按需重选平台': 'Select Platforms',

    // Settings (#settings)
    '守护进程': 'Local Daemon',
    '运行中': 'Running',
    '已暂停': 'Paused',
    '开机自启，崩溃自动拉起': 'Auto-start on login, auto-restart',
    '本地目录 / Obsidian': 'Local Vault / Obsidian',
    '已挂载': 'Mounted',
    '未找到': 'Not Found',
    '专用浏览器': 'Isolated Chrome',
    '在线': 'Online',
    '未启动': 'Offline',
    '平台登录': 'Platform Sessions',
    '全部正常': 'All Connected',
    '平台': 'Platforms',
    '登录、体检和常用操作；扫码要人在这台电脑前': 'Session health checks & login helpers (QR scans require you at this Mac)',
    '全部检查': 'Check All',
    '打开全部登录页': 'Open All Logins',
    '采流量': 'Sync Works',
    '采粉丝': 'Sync Followers',
    '同步知识站数据': 'Sync Site Data',
    '已停用': 'Disabled',
    '✓ 已登录': '✓ Signed In',
    '未检查': 'Unchecked',
    '未登录': 'Not Signed In',
    '检查': 'Check',
    '打开后台': 'Open Studio',
    '去登录': 'Sign In',
    '启用': 'Enable',
    '停用': 'Disable',
    '不体检、不发布、不采粉丝（点右侧可启用）': 'Hidden from checks, publish & analytics (click Enable to use)',
    '可选海外平台（5 家）': 'Optional Global Platforms (5)',
    'TikTok / Instagram / Threads / LinkedIn / Meta Business Suite 默认停用，按需一键启用即可纳入体检与填表发布':
      'TikTok, Instagram, Threads, LinkedIn & Meta Business Suite are disabled by default — enable only the ones you need.',
    '本地 AI Agent、目录与通知': 'Local AI Agent, Paths & Notifications',
    '全局写作 Agent 与独立剪辑 Agent 自由拆分，零强制付费 API': 'Split writing & cutting AI engines freely — zero mandatory API lock-in',
    '全局 Agent（选题 / 写稿 / 审稿 / 拆解）': 'Global AI Agent (Topics / Scripts / Teardown)',
    '✓ CLI 已就绪': '✓ Ready',
    '本机运行': 'Local',
    '全局 Coding Agent 引擎（主用 Gemini 推荐 Antigravity CLI 或 Gemini API）': 'Global AI Engine (Gemini API, Antigravity, Claude, Codex, or OpenAI-compatible API)',
    '可选 API': 'Custom API',
    '全局模型名称（Gemini API 默认 gemini-2.5-flash；留空走该引擎默认）': 'Global Model Name (leave blank for engine default)',
    '一键预设：': 'Presets:',
    'Ollama 本机': 'Local Ollama',
    'API Base URL（OpenAI 兼容接口）': 'API Base URL (OpenAI-compatible)',
    'API Key（Ollama 本机可留空）': 'API Key (optional for local Ollama)',
    'API 模型名': 'API Model',
    '测试 AI 连通性': 'Test AI Connection',
    '正在测试连通性…': 'Testing connection…',
    '切换引擎或填写 API Key 后可立即验证是否可用': 'Verify your selected AI engine or API key immediately',
    'Obsidian 知识库根目录（只读 · ': 'Obsidian Vault Root (read-only · ',
    '去选接入文件夹 ›': 'Select folders ›',
    '统一视频工程根目录（定稿自动建目录 / 打包自动扫描）': 'Unified Video Project Root (auto-scaffold & publish scan)',
    '独立剪辑 Agent（剪辑工作台专用）': 'Dedicated Cut Agent (Cut Workbench)',
    '跟随全局': 'Follow Global',
    '自定义命令': 'Custom CLI',
    '可与写作拆分（例如写作和剪辑都用 Gemini，或剪辑单独挂自定义剪辑 Agent）': 'Decouple cutting from writing (e.g., use Gemini or a custom CLI skill)',
    '剪辑 Agent 模型（留空则沿用所选引擎默认）': 'Cut Agent Model (blank = engine default)',
    '自定义剪辑 CLI / Skill 命令（选「自定义命令」时生效）': 'Custom Cut CLI / Skill Command (when Custom CLI selected)',
    '本地语音转写引擎（原片转带时间戳逐字稿）': 'Local Speech-to-Text Engine',
    '保存 AI 与目录配置并重扫 Obsidian': 'Save AI & Paths & Rescan Vault',
    '飞书通知': 'Feishu / Lark Webhook',
    '✓ 已连接': '✓ Connected',
    '未启用': 'Disabled',
    '群机器人 Webhook（平台掉线、每日采数完成后自动提醒）': 'Bot Webhook URL (alerts on expired sessions & daily sync)',
    '测试发送': 'Send Test',
    '保存后立即生效，不用重启': 'Applies immediately, no restart required',
    '开机自启与本地维护': 'Auto-Start & Maintenance',
    '生成 macOS 开机自启': 'Install macOS launchd',
    '已生成 launchd ✓': 'launchd Installed ✓',
    '重置本地浏览器缓存': 'Reset Browser Cache',
    '不删除 SQLite 数据库与 Obsidian 文件': 'Does not delete SQLite DB or Obsidian notes',
    '守护进程实时动态': 'Daemon Activity Log',

    // Topics / Source / Feed / Pool / Write / Audit / Scripts
    '选题工作台': 'Topics Workbench',
    '对标爆款库': 'Viral Benchmarks',
    '对标爆款榜（真实库）': 'Benchmark Library',
    '⚡ 极简速览': '⚡ Lite',
    '🎯 7 角度': '🎯 7 Angles',
    '🔬 深度全维': '🔬 Deep',
    '⚙ 自定义': '⚙ Custom',
    '按几倍平时': 'By Multiple',
    '按点赞': 'By Likes',
    '最新': 'Latest',
    '+ 添加对标账号': '+ Track Creator',
    'AI 拆解新视频': 'AI Teardown',
    '回日报': 'Back to Dailies',
    '+ 加入选题池': '+ Add to Pool',
    '原视频 ↗': 'Source ↗',
    '用这个角度写 ›': 'Write from This Angle ›',
    '主线：': 'Mainline: ',
    '为什么爆': 'Why It Hit',
    '底层共通真相：': 'Universal Truth: ',
    '7 个可换切入角度（Dan Koe · Find your angle）': '7 Angles to Rewrite (Dan Koe · Find your angle)',
    '选一个最顺口的直接进写稿台': 'Pick any angle to open a prefilled draft',
    '★ 最能打': '★ Top Pick',
    '展开方向：': 'How to expand: ',
    '开头 15 秒抓手': 'First 15s Hook',
    '全片结构分节': 'Structure Breakdown',
    '变现与人设动机': 'Persona & Funnel',
    '节奏与画面手法': 'Pacing & Visuals',
    '自定义对标拆解模板（模块勾选 + Prompt 模板）': 'Custom Teardown Template (Modules & Prompt)',
    '保存自定义配置并启用': 'Save & Enable Custom Template',
    '新建选题': 'New Topic',
    '写骨架 / 出稿 ›': 'Write Draft ›',
    'AI 生成 4 句开头钩子': 'AI Generate 4 Hooks',
    '去三路审稿 ›': '3-Way Audit ›',
    '本机 AI 重审': 'Re-Audit with AI',
    '自己改': 'Edit Draft',
    '一键接受': 'Accept All',
    '稿子定了 → 进定稿与剪辑台 ›': 'Finalize → Cut Workbench ›',
    '复制全文': 'Copy Script',
    '提词器': 'Teleprompter',
    '去剪辑台（出镜头表） ›': 'Open Cut Workbench ›',

    // Materials (#materials)
    '图片': 'Image Styles',
    '视频动效': 'Motion FX',
    '做视频': 'Video Formats',
    '视频案例': 'Video Cases',
    '上一页': 'Prev',
    '下一页': 'Next',
    '复制提示词': 'Copy Prompt',
    '原帖 ↗': 'Original ↗',
    '全部分类': 'All Categories',

    // Cut Workbench (#cut)
    '剪辑工作台': 'Cut Workbench',
    '一键粗剪': 'Rough Cut',
    '一键粗剪模式': 'Rough Cut Mode',
    '高级动效': 'Motion Spec',
    '高级动效模式（Spec Table）': 'Motion Spec Mode',
    '1. 导入原片': '1. Import Media',
    '2. 删口误 / 挑 Hook': '2. Cut & Hooks',
    '3. 渲染并落盘': '3. Render & Land',
    '1. 校验并载入媒体': '1. Probe & Load Media',
    '已有逐字稿 → 下一步 ›': 'Transcript Ready → Next ›',
    '填入路径': 'Use Path',
    '停顿缩短阈值：': 'Pause trim threshold:',
    '生成英文 .srt 字幕': 'Generate English .srt',
    'AI 翻译英文 .srt 中…': 'Translating English .srt…',
    '独立剪辑 Agent 挑 Hook': 'Cut Agent: Pick Hooks',
    '独立剪辑 Agent 自动排镜头表': 'Cut Agent: Plan Spec Table',
    '下一步：一键渲染成片 ›': 'Next: Render Video ›',
    '下一步：渲染与落盘 ›': 'Next: Render & Land ›',
    '剪掉': 'Cut',
    '恢复保留': 'Restore',
    '换动效': 'Swap FX',
    '挑动效素材 ›': 'Browse Motion FX ›',
    '一键开始粗剪渲染并落盘': 'Render -16 LUFS & Land to Publish',
    '一键去发布工作台填表 ›': 'Open in Publish Workbench ›',
    '导出 worktable.json': 'Export worktable.json',

    // Publish Workbench (#pub-todo, #pub-pack, #pub-confirm, #pub-sent)
    '发布工作台': 'Publish Workbench',
    '待发 · 排期': 'Queue & Schedule',
    '待发 · 排期队列': 'Publish Queue',
    '打包 publish.json': 'Package publish.json',
    '去填表 ›': 'Fill & Post ›',
    '打包 · 标准工程目录': 'Package · Project Folder',
    '打包 · 标准工程包自动识别': 'Package · Auto-Scan & Localize',
    '重新扫描目录': 'Rescan Projects',
    '一键分平台适配文案（含中译英）': 'AI Localize Copy (ZH → EN)',
    '去确认 · Chrome 填表 ›': 'Go to Chrome Auto-Fill ›',
    '本机工程目录': 'Local Project Folder',
    '一键载入 → 去填表': 'Load → Fill & Post',
    '待剪完出片': 'Cutting in progress',
    '当前发布清单': 'Current Publish Package',
    '未绑定视频': 'No Video Bound',
    '高级：手动覆盖成片路径或排期时间': 'Advanced: Override video path or schedule',
    '本地成片路径': 'Local Video Path',
    '计划发布时间（ISO）': 'Scheduled Time (ISO)',
    '保存并导出 publish.json': 'Save & Export publish.json',
    'AI 一键生成各平台专属文案': 'AI Localize All Active Platforms',
    '国内平台默认简体中文，YouTube / X / TikTok / IG / Threads / LinkedIn / Meta 默认改写为地道英文':
      'Chinese platforms default to Simplified Chinese; YouTube / X / TikTok / IG / Threads / LinkedIn / Meta rewrite into idiomatic English.',
    'EN 英文': 'EN',
    'ZH 中文': 'ZH',
    '已适配': 'Localized',
    '沿用原稿': 'Original',
    '查看完整 publish.json 原始数据': 'Inspect raw publish.json',
    '确认 · 专用 Chrome 填表': 'Confirm · Chrome Auto-Fill',
    '确认 · 自研开源多平台填表': 'Confirm · Multi-Platform CDP Auto-Fill',
    '分平台适配文案（中→英）': 'AI Localize Copy (ZH→EN)',
    '分批启动 Chrome 填表': 'Batch Fill via Chrome',
    '填这一家': 'Fill Draft',
    '重试填表': 'Retry Fill',
    '看现场截图': 'View Screenshot',
    '看截图': 'Screenshot',
    '我已点发 → 自动取链': 'I Posted → Sync URL',
    '贴链确认': 'Paste URL',
    '核对定时并取链': 'Verify Schedule',
    '改状态': 'Edit State',
    '打开作品 ↗': 'Open Post ↗',
    '存档': 'Archive',
    '重填': 'Refill',
    '已发 · 已取链': 'Published · Synced',
    '已定时': 'Scheduled',
    '填好 · 等你点发': 'Filled · Ready to Post',
    '专用 Chrome 填表中…': 'Filling via Chrome…',
    '上传 / 填表失败': 'Upload / Fill Failed',
    '待开跑': 'Ready',
    '等待开跑': 'Ready to fill',
    '就绪': 'Ready',
    '已打包 · 可直接发布': 'Packaged · Ready',
    '有成片 · 待补封面文案': 'Video Ready · Needs Covers',
    '仅文案 / 提纲': 'Outline Only',
    '剪辑中': 'Cutting',
    '竖封面 –': '9:16 Cover –',
    '竖封面 ✓': '9:16 Cover ✓',
    '横/16:9 封面 –': '16:9 Cover –',
    '横/16:9 封面 ✓': '16:9 Cover ✓',
    '所有用户共用同一套标准目录结构（定稿自动建目录、AI 自动放进': 'Unified project folder convention (auto-scaffolded on finalization; AI writes into',
    '），点一下自动识别成片、3 张封面与各平台文案。': ') — one click loads video, 3 covers & localized copy.',
    '100% MIT 自研 CDP 引擎（零闭源插件）：自动在专用 Chrome 打开创作页、填文案/传视频并截图留档；国内四家严格停在「等你点发」，发完自动取链。':
      '100% MIT Chrome CDP auto-filler: opens studio pages in isolated Chrome, uploads video, fills localized copy & screenshots before submit.',
    '每 5 分钟': 'Every 5 min',
    '每天 09:00': 'Daily 09:00',
    '每天 10:00': 'Daily 10:00',
    '检查有没有到点要取链接的期数，提醒还没点发布的国内平台': 'Check pending URL syncs & remind awaiting domestic drafts',
    '全平台真实探活体检一次，有掉线才打扰': 'Verify active platform sessions; notify only if expired',
    '采集全平台粉丝与已发作品流量，生成当日快照供同龄复盘': 'Sync followers & published works for daily cohort analytics',
    'Gemini API Key（可选，留空自动读取本机环境变量': 'Gemini API Key (optional; auto-reads env',
    'Obsidian 知识库根目录（只读 ·': 'Obsidian Vault Root (read-only ·',
    '刚剪完、准备生成多平台文案与 publish.json 的内容（SQLite 持久化）。': 'Rendered episodes ready for multi-platform localization & publish.json (SQLite).',
    '直接读取本地 Obsidian': 'Read-only local Obsidian',
    '支持 3 层可配置拆解（极简速览 / Dan Koe 7 角度 / 深度全维 / 自定义模块与 Prompt）· 直接读取 Obsidian':
      '3-layer configurable teardown (Lite / Dan Koe 7 Angles / Deep / Custom Prompt) · Read-only Obsidian',

    // Review & KB & Releases & Hub/Topics/Cut fine-grained labels
    '复盘工作台': 'Review Workbench',
    '复盘与作品分析': 'Cohort Review & Analytics',
    '立即采流量': 'Sync Traffic',
    '真实数据周报': 'Weekly Digest',
    '抖音粉丝': 'Douyin Followers',
    '平时一条播放（中位数）': 'Median Views / Video',
    '3× 以上爆款': '3× Breakout Hits',
    '金色圆点 = 高于中位数 3 倍以上 · 悬停看明细': 'Gold dots = 3×+ above median · Hover for details',
    '抖音作品实测明细': 'Measured Video Performance',
    '按发布时间倒序 · 来自专用 Chrome 实时拉取': 'Newest first · Synced live via isolated Chrome',
    '标题': 'Title',
    '发布日': 'Published',
    '时长': 'Duration',
    '播放': 'Views',
    '倍数': 'Mult.',
    '点赞': 'Likes',
    '收藏': 'Saves',
    '评论': 'Comments',
    '转发': 'Shares',
    '今日': 'Today',
    '7日': '7d',
    '30日': '30d',
    '今': '1d',
    '小红书、视频号 已由专用 Chrome 填表': 'Xiaohongshu & WeChat Channels pre-filled via Chrome',
    '找 · 日报与对标': 'Topics · Dailies & Benchmarks',
    'AI 日报、搞钱日报（Pete 机会卡 + 收藏）、开发日报与 Park 的对标，默认看最新一天，往期右上角切换。':
      'AI Daily, Money Daily, Dev Daily, and tracked creator benchmarks — always showing today first with history switcher.',
    'AI 日报': 'AI Daily',
    '搞钱日报': 'Money Daily',
    '开发日报': 'Dev Daily',
    '对标爆款': 'Benchmarks',
    '素材库': 'Materials',
    '往期': 'Issue',
    '选择期数': 'Select issue date',
    '+ 加入选题': '+ Add to Topics',
    '这一条的原文未落盘在本地日报管道目录，当前仅有上面的摘要。': 'Full Markdown article stays in your local Obsidian vault; demo mode displays the summary above.',
    '双模式本地剪辑：一键粗剪（mlx-whisper + ffmpeg）或高级动效（SRT + 镜头表）·':
      'Dual-mode local cut: 1-Click Rough Cut (mlx-whisper + ffmpeg) or Motion Spec Table (SRT + Cut Agent) ·',
    '双模式本地剪辑：一键粗剪（mlx-whisper + ffmpeg）或高级动效（SRT + 镜头表）':
      'Dual-mode local cut: 1-Click Rough Cut (mlx-whisper + ffmpeg) or Motion Spec Table (SRT + Cut Agent)',
    '导入转写': 'Import & ASR',
    '删口误 · Hook': 'Retakes & Hooks',
    '镜头表': 'Spec Table',
    '渲染落盘': 'Render & Export',
    '导入本机原片 / 剪映 SRT（100% 本地处理，绝不上传云端）': 'Import Local Footage / CapCut SRT (100% local, never uploaded)',
    '转写：未安装': 'ASR: Demo',
    '视频标题（将用于生成统一工程目录名）': 'Video Title (generates unified project folder)',
    '本机原片路径（.mp4 / .mov）': 'Local Source Video Path (.mp4 / .mov)',
    '可选：剪映导出的 .srt 字幕路径（高级动效模式可直接毫秒级导入，免重新转写）': 'Optional: Exported .srt Path (instant load in Motion Spec mode, skips transcription)',
    '如：AI 时代怎么搭本地内容生产线': 'e.g. How to Build a Local AI Content Studio',
    '/Volumes/.../raw.mov 或 ~/Movies/.../raw.mp4': '/Volumes/.../raw.mov or ~/Movies/.../raw.mp4',
    '留空则在下方点「本机 mlx-whisper 离线转写」': 'Leave blank to run local mlx-whisper offline transcription below',
    '高级动效模式（Spec Table）': 'Motion Spec Mode (Spec Table)',
    '动效密度：': 'Motion Density:',
    '低': 'Low',
    '中': 'Med',
    '高': 'High',
    '独立剪辑 Agent 自动排镜头表': 'Auto-Plan Spec Table via Cut Agent',
    '挑动效素材 ›': 'Pick Motion Assets ›',
    '口播逐字稿（点「Hook」标开头 · 点行定位镜头）': 'Voiceover Transcript (Tag Hooks · Click line to focus shot)',
    '取消Hook': 'Remove Hook',
    '换动效': 'Swap Motion',
    '上新 · Park Studio 开源迭代日志': 'Releases · Park Studio Changelog',
    '检查更新': 'Check Updates',
    'GitHub 仓库 ↗': 'GitHub Repo ↗',
    '接入的文件夹': 'Vault Folders',
    '看全部': 'View All',
    '全部已选': 'All Selected',
    '改目录路径': 'Change Vault Path',
    '搜索当前或全库笔记…': 'Search notes…',
  };

  // Dynamic pattern translations for live counts & interpolated headings
  const PATTERNS = [
    [/^已选 (\d+) \/ (\d+) 个平台$/, 'Selected $1 / $2 platforms'],
    [/^完成配置，进入工作台（已选 (\d+) 个）$/, 'Finish Setup ($1 platforms)'],
    [/^已为你启用 (\d+) 个平台，其余 (\d+) 个已安静隐藏 ✓$/, 'Enabled $1 platforms ($2 hidden) ✓'],
    [/^(\d+) 待点发$/, '$1 to post'],
    [/^待确认发布 · (\d+) 平台$/, 'Awaiting Post · $1 platforms'],
    [/^今日信源 · AI 日报 (\d+) 条$/, 'Today Intel · $1 AI items'],
    [/^AI 日报 (\d+)$/, 'AI Daily $1'],
    [/^搞钱日报 (\d+)$/, 'Money Daily $1'],
    [/^停在「镜头表 \((\d+) 镜\)」$/, 'Paused at Spec Table ($1 shots)'],
    [/^搞钱日报 (\d+) 条 · 选题池 (\d+) 条$/, 'Money Daily: $1 · Topic Pool: $2'],
    [/^已归并 (\d+) 个平台实测数据$/, 'Merged live data from $1 platforms'],
    [/^查看全部 (\d+) 期复盘 ›$/, 'View all $1 reviews ›'],
    [/^各平台趋势（(\d+) 家启用中）$/, 'Platform Trends ($1 active)'],
    [/^全盘真实数据总览（已采集 (\d+) 条真实作品 · 上次采数：(.+)）。$/, 'Live Analytics Overview ($1 collected works · Last sync: $2).'],
    [/^100% 来自专用 Chrome 实测采集（已入库 (\d+) 条作品 · 跨平台归并 (\d+) 期）。$/, '100% measured via isolated Chrome ($1 works synced · $2 cross-platform episodes).'],
    [/^抖音作品分析 \((\d+)\)$/, 'Video Breakdown ($1)'],
    [/^跨平台单期复盘 \((\d+)\)$/, 'Cross-Platform Episodes ($1)'],
    [/^近 (\d+) 条点赞中位数$/, 'Median Likes (last $1)'],
    [/^(\d+) 条$/, '$1 hits'],
    [/^时长 × 播放散点图（真实采集 (\d+) 条）$/, 'Duration × Views Scatter ($1 measured videos)'],
    [/^(.+) (\d+) 条$/, '$1 · $2 items'],
    [/^剪辑 · (.+)$/, 'Cut · $1'],
    [/^独立剪辑 Agent：跟随全局 \((.+)\) ⚙$/, 'Cut Agent: Global ($1) ⚙'],
    [/^独立剪辑 Agent：(.+) ⚙$/, 'Cut Agent: $1 ⚙'],
    [/^(\d+) 作品$/, '$1 works'],
    [/^今日 ([+-]?[\d,]+)$/, 'Today $1'],
    [/^7日 ([+-]?[\d,]+)$/, '7d $1'],
    [/^30日 ([+-]?[\d,]+)$/, '30d $1'],
    [/^今 ([+-]?[\d,]+)$/, '1d $1'],
    [/^(\d+)\/(\d+) 正常$/, '$1/$2 OK'],
    [/^上次体检 (.+)$/, 'Last check: $1'],
    [/^最近 (\d+) 条本地执行记录$/, 'Latest $1 local log entries'],
    [/^取「(.+)」的链接$/, 'Sync URLs for "$1"'],
    [/^上新 · (v[\d.]+)$/, 'Releases · $1'],
    [/^视觉素材库（共 ([\d,]+) 款）$/, 'Visual Materials ($1 items)'],
    [/^第 (\d+) \/ (\d+) 页（共 ([\d,]+) 款）$/, 'Page $1 / $2 ($3 items)'],
    [/^命中 ([\d,]+) 款 · 第 (\d+) \/ (\d+) 页$/, '$1 matched · Page $2 / $3'],
    [/^已入库 (\d+) 条 · 3× 爆款 (\d+) 条$/, '$1 benchmarks · $2 viral (3×+)'],
    [/^全部博主 \((\d+)\)$/, 'All Creators ($1)'],
    [/^按「(.+)」重拆$/, 'Re-teardown ($1)'],
    [/^共 (\d+) 句 · 保留 (\d+) 句 · 剪掉 (\d+) 句 · Hook (\d+) 句$/, '$1 cues · Keep $2 · Cut $3 · $4 Hooks'],
    [/^分平台文案与中→英本地化预览（当前已启用 (\d+) 个平台）$/, 'Per-Platform Localized Copy Preview ($1 active platforms)'],
    [/^已挂载 · (\d+) 期可发$/, 'Mounted · $1 ready'],
    [/^还有 (\d+) 个剪辑中 \/ 草稿目录$/, '$1 more cutting / draft folders'],
    [/^(\d+) 张封面 ✓$/, '$1 covers ✓'],
    [/^成片 MP4 ✓$/, 'Rendered MP4 ✓'],
    [/^文案\.txt ✓$/, 'Copy.txt ✓'],
    [/^Park Studio 本机运行状态、(\d+) 平台专用浏览器体检（已启用 (\d+) 家）、本地 Agent \/ 可选 API 与通知集成。$/, 'Local daemon status, $1 supported platforms ($2 active), AI engines / APIs & notifications.'],
    [/^正在探活 (\d+) 平台…$/, 'Checking $1 platforms…'],
    [/^AI 连通测试通过：(.+)$/, 'AI connection OK: $1'],
    [/^✓ 连通成功：(.+)$/, '✓ Connected: $1'],
    [/^已由 (.+) 为 (\d+) 个平台生成专属文案并写入 publish\.json ✓$/, 'Localized copy for $2 platforms via $1 ✓'],
    [/^已为 (\d+) 个平台生成本地化文案（含英文平台改写）✓$/, 'Localized copy for $1 platforms (incl. EN) ✓'],
    [/^已生成英文外挂字幕（(\d+) 句）→ (.+)$/, 'Generated English .srt ($1 cues) → $2'],
    [/^英文 \.srt 字幕已导出（(\d+) 句）$/, 'English .srt Exported ($1 cues)'],
    [/^2\. 本机 (.+) 离线转写 \+ 标口误$/, '2. Local $1 Transcribe + Retake Detect'],
    [/^独立 Profile · CDP :(\d+)(?: · (\d+) 标签)?$/, (_, p, t) => `Isolated Profile · CDP :${p}${t ? ` · ${t} tabs` : ''}`],
    [/^· (\d+) 篇$/, '· $1 notes'],
    [/^上次检查 (.+)$/, 'Checked: $1'],
    [/^尚未体检，点击「全部检查」验证.+$/, 'Not checked yet — click Check All to verify session'],
    [/^海外可选平台 · (.+)$/, 'Optional global platform · $1'],
  ];

  PS.tr = function (raw) {
    if (PS.lang !== 'en' || !raw) return raw;
    const s = String(raw);
    const trimmed = s.trim();
    if (!trimmed) return s;
    if (EXACT[trimmed]) {
      return s.replace(trimmed, EXACT[trimmed]);
    }
    for (const [re, rep] of PATTERNS) {
      if (re.test(trimmed)) {
        return s.replace(trimmed, trimmed.replace(re, rep));
      }
    }
    return s;
  };

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE']);

  PS.localizeDom = function (root) {
    if (PS.lang !== 'en' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest('.md-body, .src-t, .src-x, [data-no-i18n], pre, code')) return NodeFilter.FILTER_REJECT;
        if (!/[\u4e00-\u9fff]/.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let cur;
    while ((cur = walker.nextNode())) nodes.push(cur);
    for (const n of nodes) {
      const next = PS.tr(n.nodeValue);
      if (next !== n.nodeValue) n.nodeValue = next;
    }
    root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el => {
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        const val = el.getAttribute(attr);
        if (val && /[\u4e00-\u9fff]/.test(val)) {
          const next = PS.tr(val);
          if (next !== val) el.setAttribute(attr, next);
        }
      }
    });
  };

  PS.setLang = function (nextLang, persist = true) {
    const lang = nextLang === 'en' ? 'en' : 'zh';
    PS.lang = lang;
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    if (persist) {
      if (PS.S?.settings) PS.S.settings.uiLang = lang;
      PS.api?.('PUT', '/api/settings', { uiLang: lang }).catch(() => {});
      PS.save?.();
    }
    PS.rebuildChrome?.();
    PS.route?.();
    PS.toast?.(lang === 'en' ? 'Switched to English UI' : '已切换为简体中文界面', 'good');
  };

  PS.toggleLang = function () {
    PS.setLang(PS.lang === 'en' ? 'zh' : 'en', true);
  };
})();
