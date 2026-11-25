/* Park Studio Static Demo API Shim — runs the full Park Studio app 100% client-side with zero backend */
(function () {
  'use strict';

  function dayStr(offsetDays) {
    const d = new Date(Date.now() + offsetDays * 864e5);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function buildDemoData() {
    const d0 = dayStr(0), d1 = dayStr(-1), d3 = dayStr(-3), d10 = dayStr(-10), d17 = dayStr(-17);
    const platOrder = ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x', 'wechat', 'tiktok', 'instagram', 'threads', 'linkedin', 'meta'];
    const base = {
      douyin: 41200, xhs: 14800, bilibili: 22900, channels: 11200, youtube: 8650, x: 16400, wechat: 18500,
      tiktok: 12400, instagram: 7800, threads: 4600, linkedin: 6200, meta: 3900,
    };
    const mean = {
      douyin: 62, xhs: 46, bilibili: 38, channels: 24, youtube: 20, x: 34, wechat: 18,
      tiktok: 36, instagram: 22, threads: 15, linkedin: 18, meta: 12,
    };
    const boost = { [-24]: 2.8, [-17]: 3.2, [-10]: 2.6, [-3]: 4.1, [-1]: 2.4 };
    const followersLive = {};
    for (const p of platOrder) followersLive[p] = {};
    const cur = { ...base };
    for (let i = -29; i <= 0; i++) {
      const d = dayStr(i);
      const b = boost[i] || 1;
      for (const p of platOrder) {
        const wave = 0.78 + ((Math.abs(i * 17 + p.length * 13) % 10) / 20);
        if (i > -29) cur[p] += Math.round(mean[p] * b * wave);
        followersLive[p][d] = cur[p];
      }
    }

    const platformStatus = {
      douyin:    { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 创作者后台正常', disabled: false },
      xhs:       { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 保守滚动模式', disabled: false },
      bilibili:  { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 投稿与采数正常', disabled: false },
      channels:  { state: 'warn', checkedAt: '09:30', detail: '视频号登录将过期，建议保活或重扫', disabled: false },
      youtube:   { state: 'ok',   checkedAt: '09:30', detail: 'Studio 正常 · 支持校验后自动定时', disabled: false },
      x:         { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 支持自动发布', disabled: false },
      wechat:    { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 自动存草稿箱', disabled: false },
      tiktok:    { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 支持自动上传草稿', disabled: false },
      instagram: { state: 'ok',   checkedAt: '09:30', detail: '已登录 · Reels 竖版同步', disabled: false },
      threads:   { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 图文短帖同步', disabled: false },
      linkedin:  { state: 'ok',   checkedAt: '09:30', detail: '已登录 · B 端海外专业分发', disabled: false },
      meta:      { state: 'ok',   checkedAt: '09:30', detail: '已登录 · Meta Business Suite', disabled: false },
    };

    const episodes = [
      {
        index: 41,
        nick: 'EP41 · 12 平台填表闭环',
        title: '一期视频发 12 个平台太折磨？我用本地专用 Chrome + Agent 做成了按需半自动发布闭环',
        published_at: d1,
        coverGrad: 'linear-gradient(145deg,#3E63DD 0%,#1E2235 65%,#0F0F10 100%)',
        coverTitle: '12 平台发布\n彻底闭环',
        platformCount: 9,
        views: 168420,
        inter: 10840,
        likes: 6912,
        favorites: 4895,
        comments: 825,
        interRate: '6.4',
        platforms: {
          douyin:    { title: '一期视频发 12 个平台太折磨？本地专用 Chrome 彻底闭环', views: 38420, likes: 1640, favorites: 1290, comments: 218, url: 'https://github.com/zinan92/park-studio' },
          bilibili:  { title: '【开源】一人内容生产线：从选题写稿到 12 平台按需填表与复盘', views: 21680, likes: 1490, favorites: 1840, comments: 196, url: 'https://github.com/zinan92/park-studio' },
          youtube:   { title: 'Open-Source Local Content Studio: 1 Topic -> 12 Platforms', views: 12840, likes: 740, favorites: 0, comments: 94, url: 'https://github.com/zinan92/park-studio' },
          x:         { title: '刚把 12 平台按需填表 + 运营大屏接进 Park Studio（MIT 开源）', views: 44120, likes: 812, favorites: 645, comments: 97, url: 'https://github.com/zinan92/park-studio' },
          tiktok:    { title: '1 Script to 12 Platforms with Local AI Agents (MIT Open Source)', views: 26800, likes: 1120, favorites: 640, comments: 110, url: 'https://github.com/zinan92/park-studio' },
          instagram: { title: 'My 1-Person Content Factory Running 100% Locally', views: 11200, likes: 560, favorites: 310, comments: 48, url: 'https://github.com/zinan92/park-studio' },
          threads:   { title: 'Open-sourced my 12-platform local content studio today', views: 5400, likes: 210, favorites: 60, comments: 24, url: 'https://github.com/zinan92/park-studio' },
          linkedin:  { title: 'How a 1-person studio replaces a 4-person content team locally', views: 7960, likes: 340, favorites: 110, comments: 38, url: 'https://github.com/zinan92/park-studio' },
        },
      },
      {
        index: 40,
        nick: 'EP40 · AI 知识树内化',
        title: '别再收藏吃灰了：我用「知识树 + 内化」让 AI 写口播稿越写越像我自己',
        published_at: d3,
        coverGrad: 'linear-gradient(145deg,#1D4ED8 0%,#151822 70%,#0B0D12 100%)',
        coverTitle: '知识树内化\n越写越像你',
        platformCount: 6,
        views: 92400,
        inter: 5820,
        likes: 3420,
        favorites: 3110,
        comments: 460,
        interRate: '6.3',
        platforms: {
          douyin:   { title: '别再收藏吃灰了：用 Obsidian 知识树喂出你自己的口播稿', views: 42100, likes: 1890, favorites: 1580, comments: 224, url: 'https://github.com/zinan92/park-studio' },
          xhs:      { title: 'AI 写稿总像机器？因为你缺一个只读 Obsidian 语料库', views: 14800, likes: 710, favorites: 890, comments: 88, url: 'https://github.com/zinan92/park-studio' },
          bilibili: { title: 'Obsidian 只读接入本地 Agent：不洗稿、不编造的口播工作流', views: 19200, likes: 560, favorites: 640, comments: 102, url: 'https://github.com/zinan92/park-studio' },
          x:        { title: 'Why read-only Obsidian vaults beat cloud RAG for creators', views: 16300, likes: 260, favorites: 0, comments: 46, url: 'https://github.com/zinan92/park-studio' },
        },
      },
      {
        index: 39,
        nick: 'EP39 · 双模式本地剪辑',
        title: '零 API 费本地粗剪：mlx-whisper 自动删口误 + 独立剪辑 Agent 切镜头表',
        published_at: d10,
        coverGrad: 'linear-gradient(145deg,#30A46C 0%,#14221C 70%,#0F0F10 100%)',
        coverTitle: '本地粗剪\n镜头表闭环',
        platformCount: 5,
        views: 76800,
        inter: 4610,
        likes: 2810,
        favorites: 2490,
        comments: 340,
        interRate: '6.0',
        platforms: {
          douyin:   { title: '用 mlx-whisper + ffmpeg 在 Mac 本地 3 分钟粗剪完一条口播', views: 34200, likes: 1420, favorites: 1180, comments: 162, url: 'https://github.com/zinan92/park-studio' },
          bilibili: { title: '【实战】离线语音转写 + -16 LUFS 自动响度 + ASS 字幕烧录', views: 24600, likes: 980, favorites: 1020, comments: 124, url: 'https://github.com/zinan92/park-studio' },
          youtube:  { title: 'Offline Video Rough Cut on Apple Silicon with mlx-whisper', views: 18000, likes: 410, favorites: 290, comments: 54, url: 'https://github.com/zinan92/park-studio' },
        },
      },
    ];

    const douyinScatter = [
      { title: 'EP41 · 本地专用 Chrome 填 7 平台', published_at: d1, sec: 462, views: 38420, likes: 1640, favorites: 1290, comments: 218, shares: 312, mult: 1.4, url: 'https://github.com/zinan92/park-studio' },
      { title: 'EP40 · Obsidian 知识树写口播稿', published_at: d3, sec: 418, views: 62400, likes: 2910, favorites: 2480, comments: 342, shares: 510, mult: 2.2, url: 'https://github.com/zinan92/park-studio' },
      { title: 'EP39 · 本地离线粗剪 + 镜头表', published_at: d10, sec: 356, views: 96800, likes: 4820, favorites: 4120, comments: 512, shares: 740, mult: 3.4, url: 'https://github.com/zinan92/park-studio' },
      { title: 'EP38 · 为什么我放弃了 4 个收费工具', published_at: d17, sec: 390, views: 118200, likes: 6140, favorites: 5290, comments: 684, shares: 920, mult: 4.2, url: 'https://github.com/zinan92/park-studio' },
      { title: 'EP37 · 一人公司 AI 信息源怎么搭', published_at: dayStr(-24), sec: 512, views: 31200, likes: 1320, favorites: 1090, comments: 145, shares: 198, mult: 1.1, url: 'https://github.com/zinan92/park-studio' },
      { title: 'EP36 · 3 分钟看懂 Coding Agent', published_at: dayStr(-31), sec: 195, views: 18900, likes: 740, favorites: 520, comments: 84, shares: 112, mult: 0.7, url: 'https://github.com/zinan92/park-studio' },
    ];

    const analytics = {
      totalWorks: 68,
      totalEpisodes: 18,
      lastMetricsAt: '今天 09:32 · 在线演示数据',
      platformCounts: { douyin: 18, xhs: 14, bilibili: 16, channels: 12, youtube: 12, x: 18, wechat: 9, tiktok: 14, instagram: 11, threads: 10, linkedin: 9, meta: 8 },
      episodes,
      douyin: {
        count: douyinScatter.length,
        medianViews: 28400,
        medianLikes: 2275,
        favLikePct: 84,
        hit3xCount: 2,
        scatter: douyinScatter,
      },
      ageReviews: [
        {
          published_at: d1,
          title: episodes[0].title,
          views: 114060,
          inter: 7165,
          interRate: '6.3',
          ratio: 1.67,
          prevTitle: 'EP40 · AI 知识树内化',
          prevViews: 68400,
          platforms: episodes[0].platforms,
          snapshots: [
            { day: d1, age: 1, views: 114060 },
          ],
        },
        {
          published_at: d3,
          title: episodes[1].title,
          views: 92400,
          inter: 5820,
          interRate: '6.3',
          ratio: 1.2,
          prevTitle: 'EP39 · 双模式本地剪辑',
          prevViews: 76800,
          platforms: episodes[1].platforms,
          snapshots: [
            { day: d3, age: 1, views: 68400 },
            { day: d1, age: 3, views: 92400 },
          ],
        },
        {
          published_at: d10,
          title: episodes[2].title,
          views: 76800,
          inter: 4610,
          interRate: '6.0',
          ratio: 1.12,
          prevTitle: 'EP38 · 放弃 4 个收费工具',
          prevViews: 68500,
          platforms: episodes[2].platforms,
          snapshots: [
            { day: d10, age: 1, views: 44200 },
            { day: dayStr(-7), age: 3, views: 61800 },
            { day: d3, age: 7, views: 76800 },
          ],
        },
      ],
      insights: [
        { cls: 'g', tag: '播放', html: '最新一期 <b>EP41</b> 发布 24 小时全网破 <b>114,060</b>，较账号同龄中位数高出 <b>+66.8%</b>。' },
        { cls: 'b', tag: '节奏', html: '抖音近 18 期散点显示 <b>5.5 – 7 分钟</b> 是你的黄金完播时长，3× 爆款全部落在此区间。' },
        { cls: 'w', tag: '发布', html: '<b>小红书、视频号</b> 已由专用 Chrome 填表并存档截图，等你亲自核对后点击发布。' },
      ],
    };

    const newsletterIssue = {
      day: d0,
      days: [d0, d1, d3],
      total: 4,
      parts: [
        {
          name: '今日必看 · 本地 AI 与创作者工具',
          count: 4,
          groups: [
            {
              name: 'Coding Agent 与工作流',
              items: [
                { id: 'n1', title: '开源本地内容工作台兴起：创作者开始用本机 CLI 替代月费 SaaS', summary: '越来越多独立创作者选择把选题、粗剪与发布全部放在本地运行，直接复用已有的 Gemini CLI / Claude Code / Codex 额度。', source: 'AI 日报', tag: '趋势', hasDetail: true },
                { id: 'n2', title: 'Apple Silicon 离线转写实测：mlx-whisper 10 分钟视频仅需 18 秒', summary: '配合自动停顿与口误检测，视频粗剪环节的时间成本从 2 小时压到 5 分钟以内。', source: 'AI 日报', tag: '效率', hasDetail: true },
              ],
            },
            {
              name: '开源分发与增长',
              items: [
                { id: 'n3', title: '免注册在线 Demo + 一键发给 AI 助手部署，成为开源项目增长新范式', summary: '像 Calends 一样把真实前端变成无需注册的在线沙盒，转化率比纯 README 高出数倍。', source: 'AI 日报', tag: '增长', hasDetail: true },
                { id: 'n4', title: 'Chrome CDP 本地自动化安全护栏设计：为什么国内平台必须「只填不点发」', summary: '自动化帮你省去上传、封面、文案与话题的机械劳动，但最后一下发布交回人类核对最安全。', source: 'AI 日报', tag: '工程', hasDetail: true },
              ],
            },
          ],
        },
      ],
    };

    const savedDaily = {
      day: d0,
      days: [d0, d1],
      cards: [
        { id: 'm1', title: '把个人内部工作台直接 MIT 开源，反向带动影响力与咨询', angle: '对比「卖 ¥99 月费 SaaS」与「MIT 开源 + 在线 Demo」两种增长飞轮', state: 'new', source: '搞钱日报' },
        { id: 'm2', title: '统一目录规范才是 Agent 时代真正的护城河', angle: '人类不需要再记文件夹怎么命名，所有 Agent 读同一个 final/上传/ 协议', state: 'saved', source: '搞钱日报' },
      ],
      items: [],
    };

    const devDaily = {
      day: d0,
      items: [
        { id: 'dv1', title: 'Swift 原生 WKWebView 封装本地 Web App：零 Electron、几百 KB 透明标题栏', summary: 'macOS 系统自带 swiftc 即可编译，内存占用不到 Electron 的五分之一。', url: 'https://github.com/zinan92/park-studio' },
        { id: 'dv2', title: 'FastAPI + SQLite 本地单机工作台最佳实践', summary: '单进程零外部依赖，数据文件全在 ~/.park-studio/，备份就是复制一个目录。', url: 'https://github.com/zinan92/park-studio' },
      ],
    };

    const benchmarks = {
      accounts: [
        { id: 'ba1', name: '独立开发老张', platform: 'bilibili', url: 'https://space.bilibili.com/', count: 24, lastFetched: '今天 08:40' },
        { id: 'ba2', name: 'AI Workflow Lab', platform: 'youtube', url: 'https://youtube.com/', count: 18, lastFetched: '今天 08:42' },
        { id: 'ba3', name: '一人公司笔记', platform: 'douyin', url: 'https://douyin.com/', count: 31, lastFetched: '今天 08:45' },
      ],
      items: [
        { id: 'bm1', author: 'AI Workflow Lab', platform: 'youtube', title: 'Why I Replaced 6 Paid Creator SaaS Tools With One Local Agent Workbench', views: 182000, likes: 9400, mult: 4.6, published_at: d1, hasTeardown: true, hook: '开场 5 秒直接亮出每月省下的 $240 账单与本机终端运行画面' },
        { id: 'bm2', author: '独立开发老张', platform: 'bilibili', title: '我把自己的视频剪辑和 7 平台分发全交给了本地 Coding Agent', views: 94200, likes: 6820, mult: 3.8, published_at: d3, hasTeardown: true, hook: '反常识痛点切入：拍视频只花 20 分钟，发 7 个平台花了我 2 小时' },
        { id: 'bm3', author: '一人公司笔记', platform: 'douyin', title: '别让 AI 替你编故事：用 Obsidian 只读语料库写出真正像你的口播稿', views: 128400, likes: 7150, mult: 3.5, published_at: d10, hasTeardown: false, hook: '直接对比同一选题下「普通 Prompt」与「带个人经历库」的两段开场' },
      ],
    };

    const kb = {
      vaultPath: '~/Documents/Obsidian（在线演示只读样本）',
      folders: [
        { name: '001_每日AI情报', count: 48, enabled: true },
        { name: '003_park原始输出', count: 64, enabled: true },
        { name: '005_爆款拆解笔记', count: 29, enabled: true },
      ],
      notes: [
        { id: 'kb1', folder: '003_park原始输出', tag: '方法论', title: '一人内容工厂的 5 步最小闭环', updated: d0, body: '## 核心原则\n1. 结构可以借鉴爆款，但故事必须 100% 来自自己的真实经历。\n2. 自动化只替代上传、封面、话题与采数这些机械劳动，核心表达与最终发布按钮留在自己手里。\n3. 所有中间产物遵循同一套工程目录规范，让不同的 AI Agent 无缝接力。' },
        { id: 'kb2', folder: '005_爆款拆解笔记', tag: '拆解', title: '开源工具如何靠「在线演示」放大自然传播', updated: d1, body: '## 关键观察\n- 传统开源项目只有 README + 静态截图，非技术创作者很难建立直观体感。\n- 提供免注册静态在线 Demo + 一段可直接发给 AI 助手的部署 Prompt，能把上手门槛压到几乎为零。' },
      ],
    };

    const materials = {
      counts: { image: 3, video: 2, motion: 2 },
      categories: ['全部', '暗黑极简', '数据图表', '动效转场'],
      items: [
        { id: 'mat1', kind: 'image', cat: '暗黑极简', name: 'Calends 风格高对比黑白灰卡片规范', desc: '深炭背景 #0F0F10 + 极细白边 + 靛蓝强调色 #7C9BF5' },
        { id: 'mat2', kind: 'motion', cat: '数据图表', name: '7 平台粉丝堆叠河流图转场', desc: '适用于视频中段数据复盘与成果展示（16:9 / 9:16）' },
        { id: 'mat3', kind: 'video', cat: '动效转场', name: '目录树逐行展开动效模板', desc: '直观演示 final/上传/ 统一工程目录结构' },
      ],
    };

    const publishEpisodes = [
      {
        id: 'pe41',
        episode: 41,
        nick: 'EP41 · 本地 Agent 自动填 7 平台',
        folder: '2026-11-23_EP41_本地Agent自动填7平台',
        videoPath: '~/Movies/ParkStudio/2026-11-23_EP41/final/上传/视频.mp4',
        preflight: { videoOk: true, faststartOk: true, coversOk: true, copyOk: true },
        tasks: {
          douyin:   { state: 'published', detail: '已回填链接', url: 'https://github.com/zinan92/park-studio', updatedAt: '昨天 19:12' },
          xhs:      { state: 'awaiting_user', detail: '已自动传片、填标题与 5 个话题，等你亲自点「发布」', url: '', updatedAt: '12 分钟前' },
          bilibili: { state: 'published', detail: '已回填链接', url: 'https://github.com/zinan92/park-studio', updatedAt: '昨天 19:15' },
          channels: { state: 'awaiting_user', detail: '已填完草稿与定时时间，等你点「发表」', url: '', updatedAt: '10 分钟前' },
          youtube:  { state: 'published', detail: '回读核对一致，已自动定时上线', url: 'https://github.com/zinan92/park-studio', updatedAt: '昨天 19:00' },
          x:        { state: 'published', detail: '已自动发出并带 UTM 链接', url: 'https://github.com/zinan92/park-studio', updatedAt: '昨天 19:02' },
          wechat:   { state: 'scheduled', detail: '已排版存进公众号草稿箱', url: '', updatedAt: '今天 10:15' },
        },
      },
    ];

    const topics = [
      { id: 105, title: '我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通找写剪发盘', stage: '写', source_ref: 'AI 日报 · 2026-11-24', body: '如果你每周都要把一条视频发到 7 个平台，你一定知道真正的瓶颈从来不是拍摄，而是分散在 7 个创作者后台里的机械填表和复盘。\n\n今天我把自己每天在用的 Park Studio 完全以 MIT 协议开源了：本地只读接入 Obsidian，零强制 API 费直连你电脑里已有的 Gemini CLI / Claude Code / Codex，国内 4 平台严格「只填不点发」保安全。', hooks: ['一期视频发 7 个平台太折磨？我把整条流水线开源成了本地工作台', '放弃月费 SaaS 后，我用本机 Coding Agent 跑通了找写剪发盘全闭环', '一条口播稿 60 秒自动填完 7 平台，国内还严格只填不点发'], picked_hook: 0, trash: false },
      { id: 106, title: '为什么「免注册在线 Demo + AI 一键部署」正在取代传统开源 README', stage: '找', source_ref: '搞钱日报', body: '', hooks: [], picked_hook: 0, trash: false },
      { id: 107, title: 'mlx-whisper 离线粗剪实战：10 分钟口播 18 秒标完口误与气口', stage: '审', source_ref: '对标 · 独立开发老张', body: '很多人以为视频剪辑最耗时的是加特效，其实 80% 的时间都花在听录音、剪口误和调音量上。', hooks: [], picked_hook: 0, trash: false },
    ];

    return {
      followersLive,
      platformStatus,
      analytics,
      newsletterIssue,
      savedDaily,
      devDaily,
      benchmarks,
      kb,
      materials,
      publishEpisodes,
      topics,
      projects: [
        { folder: '2026-11-24_EP42_开源本地中控工作台', hasFinal: true, hasCopy: true, videoName: '视频（5平台通用）.mp4' },
        { folder: '2026-11-23_EP41_本地Agent自动填7平台', hasFinal: true, hasCopy: true, videoName: 'EP41-成片.mp4' },
      ],
      agents: {
        gemini: { installed: true, label: 'Gemini CLI (演示模式)' },
        claude: { installed: true, label: 'Claude Code (演示模式)' },
        codex:  { installed: true, label: 'Codex CLI (演示模式)' },
        agy:    { installed: true, label: 'Antigravity CLI (演示模式)' },
      },
      vaultStatus: { ok: true, path: '~/Documents/Obsidian（只读演示）', count: 141 },
      chromeStatus: { online: true, port: 9333, profile: '~/.park-studio/chrome-profile' },
      cutEnv: { whisper: 'mlx-whisper (Apple Silicon)', ffmpeg: 'ffmpeg 7.1 (-16 LUFS ready)', mode: 'demo' },
      daemonLogs: [
        { time: '09:32:14', level: 'ok', msg: '[Demo] 完成 7 平台粉丝与作品播放采数（42 条实测作品）' },
        { time: '09:30:02', level: 'ok', msg: '[Demo] 只读扫描 Obsidian 日报完成（AI 日报 4 条 · 搞钱日报 2 条）' },
        { time: '09:15:40', level: 'info', msg: '[Demo] 专用 Chrome CDP :9333 保活检测通过（6/7 在线）' },
      ],
    };
  }

  const DB = buildDemoData();
  const realFetch = window.fetch.bind(window);

  function jsonRes(obj, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }));
  }

  window.fetch = function (input, init) {
    const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
    const u = new URL(urlStr, location.origin);
    if (!u.pathname.startsWith('/api/')) return realFetch(input, init);

    const method = ((init && init.method) || 'GET').toUpperCase();
    let body = {};
    try { if (init && init.body) body = JSON.parse(init.body); } catch (e) {}
    const path = u.pathname;

    if (path === '/api/bootstrap') {
      return jsonRes({
        ok: true,
        demoMode: true,
        needsOnboarding: false,
        config: { onboardingDone: true, aiBackend: 'gemini' },
        platformStatus: DB.platformStatus,
        vaultStatus: DB.vaultStatus,
        chromeStatus: DB.chromeStatus,
        agents: DB.agents,
        newsletterIssue: DB.newsletterIssue,
        savedDaily: DB.savedDaily,
        devDaily: DB.devDaily,
        publishEpisodes: DB.publishEpisodes,
        projects: DB.projects,
        analytics: DB.analytics,
        lastMetricsAt: DB.analytics.lastMetricsAt,
        followersLive: DB.followersLive,
        hasLiveFollowers: true,
        topics: DB.topics,
        benchmarks: DB.benchmarks,
        kb: DB.kb,
        materials: DB.materials,
        cutEnv: DB.cutEnv,
        daemonLogs: DB.daemonLogs,
      });
    }

    if (path === '/api/source/newsletter') return jsonRes(DB.newsletterIssue);
    if (path === '/api/source/newsletter/item') {
      const id = u.searchParams.get('id');
      const all = DB.newsletterIssue.parts.flatMap(p => p.groups.flatMap(g => g.items));
      const hit = all.find(x => x.id === id) || all[0];
      return jsonRes({ ...hit, content: `## ${hit.title}\n\n${hit.summary}\n\n> 在线演示说明：本地部署后，Park Studio 会直接只读挂载你自己的 Obsidian 原文 Markdown，支持一键「+ 加入选题」并带入全文素材。` });
    }
    if (path === '/api/source/saved') return jsonRes(DB.savedDaily);
    if (path === '/api/source/dev') return jsonRes(DB.devDaily);
    if (path === '/api/source/moneycard-state') {
      const card = DB.savedDaily.cards.find(c => c.id === body.id);
      if (card) card.state = body.state;
      return jsonRes({ ok: true });
    }

    if (path === '/api/benchmarks') {
      const author = u.searchParams.get('author') || '';
      const items = DB.benchmarks.items.filter(x => !author || x.author === author);
      return jsonRes({ accounts: DB.benchmarks.accounts, items });
    }
    if (path === '/api/benchmarks/detail') {
      const id = u.searchParams.get('id');
      const hit = DB.benchmarks.items.find(x => x.id === id) || DB.benchmarks.items[0];
      return jsonRes({
        ...hit,
        teardown: {
          motivation: '精准击中独立创作者「订阅 SaaS 太贵 + 多平台发布太繁琐」的双重焦虑。',
          hook: hit.hook,
          structure: ['00:00-00:08 痛点与成果同屏对比', '00:08-01:30 拆解 3 个高频时间黑洞', '01:30-04:00 现场实操本地工作台全闭环', '04:00-05:10 开源地址与 1 分钟上手引导'],
          angles: ['从「零 API 费」成本账切入', '从「国内 4 平台只填不点发安全护栏」切入', '从「Obsidian 只读不洗稿」切入'],
        },
      });
    }
    if (path === '/api/benchmarks/teardown') {
      return jsonRes({
        ok: true,
        teardown: '### AI 拆解结论（在线演示）\n- **核心爆点**：用真实工作流录屏替代空讲概念，前 6 秒直接给结果。\n- **可复用结构**：痛点账单 → 演示闭环 → 开源指令。\n- **建议角度**：结合你自己的 EP41 实测数据讲一遍。',
      });
    }
    if (path === '/api/benchmarks/accounts' && method === 'POST') {
      const acc = { id: 'ba' + Date.now(), name: body.name || '新对标博主', platform: body.platform || 'douyin', url: body.url || '', count: 12, lastFetched: '刚刚' };
      DB.benchmarks.accounts.unshift(acc);
      return jsonRes({ ok: true, account: acc, accounts: DB.benchmarks.accounts });
    }
    if (path.startsWith('/api/benchmarks/accounts/') && method === 'DELETE') {
      const id = path.split('/').pop();
      DB.benchmarks.accounts = DB.benchmarks.accounts.filter(a => a.id !== id);
      return jsonRes({ ok: true, accounts: DB.benchmarks.accounts });
    }
    if (path.endsWith('/fetch')) return jsonRes({ ok: true, fetched: 3, items: DB.benchmarks.items });

    if (path === '/api/materials') {
      const kind = u.searchParams.get('kind') || '';
      const q = (u.searchParams.get('q') || '').toLowerCase();
      const items = DB.materials.items.filter(m => (!kind || kind === 'all' || m.kind === kind) && (!q || m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)));
      return jsonRes({ ...DB.materials, items });
    }
    if (path === '/api/kb/folders') {
      if (method === 'PUT' && Array.isArray(body.enabled)) {
        DB.kb.folders.forEach(f => { f.enabled = body.enabled.includes(f.name); });
      }
      return jsonRes({ vaultPath: DB.kb.vaultPath, folders: DB.kb.folders });
    }
    if (path === '/api/kb/notes') {
      const folder = u.searchParams.get('folder') || '';
      const q = (u.searchParams.get('q') || '').toLowerCase();
      const notes = DB.kb.notes.filter(n => (!folder || n.folder === folder) && (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)));
      return jsonRes({ notes });
    }

    if (path === '/api/topics' && method === 'POST') {
      const nt = { id: Date.now(), title: body.title || '新选题', stage: '找', source_ref: body.source_ref || '手动添加', body: body.body || '', hooks: [], picked_hook: 0, trash: false };
      DB.topics.unshift(nt);
      return jsonRes(nt);
    }
    if (path.startsWith('/api/topics/') && method === 'PATCH') {
      const id = Number(path.split('/').pop());
      const hit = DB.topics.find(t => t.id === id);
      if (hit) Object.assign(hit, body);
      return jsonRes({ ok: true, topic: hit || body });
    }

    if (path === '/api/ai/hooks') {
      return jsonRes({
        ok: true,
        backend: 'Gemini CLI (演示)',
        hooks: [
          '一期视频发 7 个平台太折磨？我用本机 Agent 做成了零 API 费的开源工作台',
          '我把 4 个内容效率工具合成 1 个本地 App：找题、粗剪、填表、复盘全在硬盘里',
          '别再为 SaaS 积分焦虑了：用你电脑里已有的 Coding Agent 跑通全平台内容流水线',
        ],
      });
    }
    if (path === '/api/ai/audit') {
      return jsonRes({
        ok: true,
        backend: 'Gemini CLI (演示)',
        audit: {
          value: { score: 9.2, note: '痛点具体，直接给出开源方案与安全护栏机制，信息密度高。' },
          resonance: { score: 8.8, note: '一人创作者多平台填表痛点极强，建议补充一句自己曾经花 2 小时手动上传的真实经历。' },
          pacing: { score: 8.6, note: '前 10 秒进入演示画面很快；中段目录结构说明可压缩至 20 秒以内。' },
          revised: (body.body || '') + '\n\n【三路审稿优化建议】第一句直接展示 7 平台自动填表进度条，结尾引导观众体验免注册在线 Demo。',
        },
      });
    }

    if (path.startsWith('/api/collect/followers')) return jsonRes({ ok: true, collected: 7, followersLive: DB.followersLive });
    if (path.startsWith('/api/collect/metrics')) {
      return jsonRes({ ok: true, collected: 42, last_metrics_at: '刚刚（在线演示）', analytics: DB.analytics, chromeStatus: DB.chromeStatus, daemonLogs: DB.daemonLogs });
    }
    if (path === '/api/onboarding/complete' && method === 'POST') {
      const enabled = new Set(Array.isArray(body.platforms) ? body.platforms : []);
      Object.keys(DB.platformStatus).forEach(pid => {
        DB.platformStatus[pid].disabled = !enabled.has(pid);
      });
      return jsonRes({ ok: true, platformStatus: DB.platformStatus, config: { onboardingDone: true, aiBackend: body.aiBackend || 'gemini' } });
    }
    if (path === '/api/platforms/check') return jsonRes({ ok: true, checked: 12, chromeStatus: DB.chromeStatus });
    if (path === '/api/platforms/login') return jsonRes({ ok: true, message: '在线演示模式：本地部署后会拉起专用 Chrome (:9333) 打开对应创作者后台登录页。' });
    if (path.startsWith('/api/platforms/') && method === 'PATCH') {
      const pid = path.split('/').pop();
      if (DB.platformStatus[pid] && typeof body.disabled === 'boolean') DB.platformStatus[pid].disabled = body.disabled;
      return jsonRes({ ok: true, platformStatus: DB.platformStatus });
    }
    if (path === '/api/projects') return jsonRes(DB.projects);
    if (path.startsWith('/api/publish/')) {
      return jsonRes({ ok: true, demo: true, message: '在线演示模式：本地部署后将调用专用 Chrome CDP 自动填表并存档提交前截图。', publishEpisodes: DB.publishEpisodes });
    }
    if (path.startsWith('/api/cut/')) {
      return jsonRes({ ok: true, env: DB.cutEnv, job: { id: 'demo-job', status: 'done', progress: 100, logs: ['[Demo] 离线转写完成', '[Demo] 生成 14 条镜头表 Spec Table', '[Demo] 已导出 worktable.json'] } });
    }

    return jsonRes({ ok: true, demo: true });
  };
})();
