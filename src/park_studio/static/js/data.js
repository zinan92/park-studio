/* Park Studio 完整演示数据集（带 localStorage 持久化，所有页面交互真实改变状态） */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});

  function dayStr(offsetDays) {
    const d = new Date(Date.now() + offsetDays * 864e5);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function buildFollowers() {
    const base = {
      douyin: 41200, xhs: 14800, bilibili: 22900, channels: 11200, youtube: 8650, x: 16400, wechat: 18500,
    };
    const dailyMean = {
      douyin: 58, xhs: 44, bilibili: 35, channels: 22, youtube: 18, x: 31, wechat: 16,
    };
    // 发布日放大因子
    const boostDays = { [-24]: 2.8, [-17]: 3.2, [-10]: 2.6, [-3]: 4.1, [-1]: 2.3 };
    const out = {};
    for (const p of PS.PLAT_ORDER) out[p] = {};
    const cur = { ...base };
    for (let i = -29; i <= 0; i++) {
      const d = dayStr(i);
      const b = boostDays[i] || 1;
      for (const p of PS.PLAT_ORDER) {
        const wave = 0.78 + ((Math.abs(i * 17 + p.length * 13) % 10) / 20);
        const gain = Math.round(dailyMean[p] * b * wave);
        if (i > -29) cur[p] += gain;
        out[p][d] = cur[p];
      }
    }
    return out;
  }

  PS.defaultState = function () {
    const d0 = dayStr(0), d1 = dayStr(-1), d3 = dayStr(-3), d10 = dayStr(-10), d17 = dayStr(-17), dNext = dayStr(2);
    return {
      meta: {
        owner: 'Park',
        workspaceName: 'Park Studio',
        version: 'v0.1.0-preview',
        demoMode: true,
        runtimeMode: 'localhost', // localhost | desktop-app
      },
      daemon: {
        running: true,
        chromeOnline: true,
        chromePort: 9333,
        chromeProfile: '~/.park-studio/chrome-profile',
        lastMetricsAt: '今天 09:32',
        nextSyncMin: 18,
        feishuEnabled: true,
        feishuWebhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-park-studio',
        wechatIlinkEnabled: true,
        remindMinutes: 20,
        scheduleTamperAlert: true,
      },
      settings: {
        aiBackend: 'claude', // claude | codex | api
        aiModel: 'claude-sonnet-4-5',
        apiKeySet: false,
        obsidianPath: '~/Documents/ParkVault',
        obsidianWritingDir: '01_我的写作',
        projectRoot: '~/Movies/ParkStudio发布工程',
        transcribeEngine: 'mlx-whisper',
        tikhubOptionalKey: '',
        siteEnabled: true,
        siteName: 'Park 知识站',
        siteUrl: 'https://xuanti.park-ai-intel.com',
        siteAdminPath: '/admin',
        siteDashApi: '/api/admin/dashboard',
        feishuLogin: true,
        communityKey: 'PK-COMM-8F29A',
        sharedBenchmarkOptIn: true,
        sharedBenchmarkCount: 486,
        sharedContributed: 14,
        telemetryOptIn: true,
        learnLinks: true,
        modules: {
          source: true,
          tree: true,
          clients: true,
          site: true,
          kline: true,
          conversion: true,
        },
      },
      releases: [
        { ver: 'v0.1.2', date: '2026-11-22', tag: '最新', title: '四大工作台极简架构 + Apple 风格系统台 + 共享对标库机制', notes: ['左栏收敛为「选题 / 剪辑 / 发布 / 复盘」四大工作台，每次仅露出 3–4 步，零视觉压迫', '新增 Apple 风格「系统」页：守护进程 / 本地目录 / 专用浏览器 / 7 平台体检与一键打开登录页', '新增自愿制「共享对标库」：只同步公开爆款元数据，绝不上传 Cookie，人人利他换取全社区爆款流'] },
        { ver: 'v0.1.1', date: '2026-11-18', tag: '功能', title: '剪辑工作台 3 步镜头表（Spec Table）与 worktable.json 交接', notes: ['支持 Hook 原句勾选、低/中/高动效密度切换与逐字稿双栏联动', '一键复制指令交给本机 Claude Code / Codex + park-video-v2 渲染成片'] },
        { ver: 'v0.1.0', date: '2026-11-12', tag: '首发', title: 'Park Studio MIT 全功能开源基线发布', notes: ['合并 Topic Studio 管理员版与 4 个历史 Content Studio 分支为唯一开源本地工作台', '零强制外部付费 API：默认直连本机 Coding Agent 与本地语音转写'] },
      ],
      platformStatus: {
        douyin:   { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 创作者后台正常', disabled: false },
        xhs:      { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 保守滚动模式', disabled: false },
        bilibili: { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 投稿与采数正常', disabled: false },
        channels: { state: 'warn', checkedAt: '09:30', detail: '视频号登录将过期，建议保活或重扫', disabled: false },
        youtube:  { state: 'ok',   checkedAt: '09:30', detail: 'Studio 正常 · 支持校验后自动定时', disabled: false },
        x:        { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 支持自动发布', disabled: false },
        wechat:   { state: 'ok',   checkedAt: '09:30', detail: '已登录 · 自动存草稿箱', disabled: false },
      },
      followers: buildFollowers(),
      doing: {
        id: 105,
        episode: 42,
        title: '我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通找写剪发盘',
        stage: 'write',
        steps: { find: 'done', chai: 'done', write: 'now', audit: '' },
      },
      // 核心作品与发布工程（供 运营大屏 / 发布中控 / 作品矩阵 / 1-3-7 复盘 共用）
      episodes: [
        {
          id: 104,
          episode: 41,
          nick: '本地 Agent 自动填 7 平台',
          title: '一期视频发 7 个平台太折磨？我用本地专用 Chrome + Agent 做成了半自动发布闭环',
          schedule: `${d1}T19:00:00+08:00`,
          finalAt: d1,
          chars: 1840,
          durationSec: 462,
          videoName: 'EP41-多平台发布闭环-成片.mp4',
          videoSizeMb: 418,
          coverGrad: 'linear-gradient(145deg,#C2480A 0%,#1F242D 65%,#0E1116 100%)',
          coverTitle: '7 平台发布\n彻底闭环',
          campaign: 'ep41-local-pub',
          packed: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x', 'wechat'],
          tasks: {
            douyin:   { state: 'published',     detail: '已回填链接', url: 'https://www.douyin.com/video/743901', updatedAt: '昨天 19:12', m: { views: 38420, likes: 1640, comments: 218, favorites: 1290, shares: 312, completion: 34.2, fans: 186 } },
            xhs:      { state: 'awaiting_user', detail: '已填完视频、封面和 5 个话题，等你点「发布」', url: '', updatedAt: '12 分钟前', m: null },
            bilibili: { state: 'published',     detail: '已回填链接', url: 'https://www.bilibili.com/video/BV1park41', updatedAt: '昨天 19:15', m: { views: 21680, likes: 1490, comments: 196, favorites: 1840, shares: 210, completion: 41.5, fans: 142 } },
            channels: { state: 'awaiting_user', detail: '已填完草稿（定时已核对），等你点「发表」', url: '', updatedAt: '10 分钟前', m: null },
            youtube:  { state: 'published',     detail: '回读核对一致，已自动定时上线', url: 'https://youtu.be/parkEP41', updatedAt: '昨天 19:00', m: { views: 9840, likes: 620, comments: 84, favorites: 0, shares: 95, completion: 46.8, fans: 78 } },
            x:        { state: 'published',     detail: '已自动发出并带 UTM 链接', url: 'https://x.com/park/status/189941', updatedAt: '昨天 19:02', m: { views: 44120, likes: 812, comments: 97, favorites: 645, shares: 168, completion: 0, fans: 118 } },
            wechat:   { state: 'scheduled',     detail: '已排版存进公众号草稿箱，待今晚 20:30 群发', url: '', updatedAt: '今天 10:15', m: null },
          },
          conv: { reg: 148, vip: 19, orders: 21, revenue: 4180 },
          reviews: [
            { age: 1, partial: false, views: 114060, inter: 7165, prevNick: 'AI 知识树怎么搭', prevViews: 68400, fans: 524, convReg: 148, convRev: 4180 },
          ],
          publishJson: {
            episode: 41,
            nick: '本地 Agent 自动填 7 平台',
            schedule: `${d1}T19:00:00+08:00`,
            video: 'projects/EP41/EP41-多平台发布闭环-成片.mp4',
            faststartOk: true,
            cover3x4: 'projects/EP41/cover-3x4.jpg',
            cover16x9: 'projects/EP41/cover-16x9.jpg',
            platforms: {
              douyin: { title: '一期视频发 7 个平台太折磨？本地专用 Chrome 彻底闭环', topics: ['AI工作流', '自媒体效率', '开源工具', 'ClaudeCode'] },
              xhs: { title: '一个人管 7 个自媒体号，我把发布做成了全自动填表', topics: ['自媒体干货', 'AI提效', '独立开发', '效率工具', '内容运营'] },
              bilibili: { title: '【开源】一人内容生产线：从选题写稿到 7 平台自动填表与数据大屏', tags: ['AI Agent', '开源项目', '自媒体运营', '效率工具'] },
              youtube: { title: 'Open-Source Local Content Studio: 1 Script -> 7 Platforms Closed Loop', utm: 'utm_campaign=ep41-local-pub' },
              x: { text: '刚把 7 平台自动填表 + 运营大屏接进 Park Studio，国内只填不点发保安全，发完自动取链接采数。项目 MIT 全开源 → https://github.com/zinan92/park-studio?utm_campaign=ep41-local-pub' },
            },
          },
        },
        {
          id: 103,
          episode: 40,
          nick: 'AI 知识树怎么搭',
          title: '别再收藏吃灰了：我用「知识树 + 内化」让 AI 写口播稿越写越像我自己',
          schedule: `${d3}T19:00:00+08:00`,
          finalAt: d3,
          chars: 2120,
          durationSec: 518,
          videoName: 'EP40-AI知识树内化-成片.mp4',
          videoSizeMb: 486,
          coverGrad: 'linear-gradient(145deg,#1D4ED8 0%,#151822 70%,#0B0D12 100%)',
          coverTitle: '知识树内化\n越写越像你',
          campaign: 'ep40-knowledge-tree',
          packed: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x', 'wechat'],
          tasks: {
            douyin:   { state: 'published', detail: '已回填链接', url: 'https://www.douyin.com/video/743840', updatedAt: '3 天前', m: { views: 62400, likes: 2910, comments: 342, favorites: 2480, shares: 510, completion: 38.6, fans: 312 } },
            xhs:      { state: 'published', detail: '已回填链接', url: 'https://www.xiaohongshu.com/explore/ep40', updatedAt: '3 天前', m: { views: 28900, likes: 1840, comments: 265, favorites: 2910, shares: 430, completion: 0, fans: 286 } },
            bilibili: { state: 'published', detail: '已回填链接', url: 'https://www.bilibili.com/video/BV1park40', updatedAt: '3 天前', m: { views: 34200, likes: 2180, comments: 289, favorites: 3120, shares: 290, completion: 44.1, fans: 214 } },
            channels: { state: 'published', detail: '已回填链接', url: 'https://channels.weixin.qq.com/ep40', updatedAt: '3 天前', m: { views: 19400, likes: 890, comments: 112, favorites: 640, shares: 380, completion: 35.0, fans: 128 } },
            youtube:  { state: 'published', detail: '已回填链接', url: 'https://youtu.be/parkEP40', updatedAt: '3 天前', m: { views: 14200, likes: 810, comments: 108, favorites: 0, shares: 114, completion: 49.2, fans: 112 } },
            x:        { state: 'published', detail: '已回填链接', url: 'https://x.com/park/status/189940', updatedAt: '3 天前', m: { views: 51300, likes: 940, comments: 134, favorites: 820, shares: 215, completion: 0, fans: 144 } },
            wechat:   { state: 'published', detail: '已群发', url: 'https://mp.weixin.qq.com/s/park40', updatedAt: '2 天前', m: { views: 8420, likes: 312, comments: 48, favorites: 520, shares: 264, completion: 0, fans: 96 } },
          },
          conv: { reg: 236, vip: 34, orders: 36, revenue: 7180 },
          reviews: [
            { age: 1, partial: false, views: 68400, inter: 5120, prevNick: '三路审稿单拆解', prevViews: 59200, fans: 382, convReg: 96, convRev: 2680 },
            { age: 3, partial: false, views: 218820, inter: 19738, prevNick: '三路审稿单拆解', prevViews: 142000, fans: 1292, convReg: 236, convRev: 7180 },
          ],
          publishJson: { episode: 40, nick: 'AI 知识树怎么搭', schedule: `${d3}T19:00:00+08:00`, faststartOk: true, platforms: {} },
        },
        {
          id: 102,
          episode: 39,
          nick: '三路审稿单拆解',
          title: '口播稿为什么留不住人？我用三路 AI 并行审稿，把完播率拉高了 11%',
          schedule: `${d10}T19:00:00+08:00`,
          finalAt: d10,
          chars: 1690,
          durationSec: 395,
          videoName: 'EP39-三路审稿单-成片.mp4',
          videoSizeMb: 352,
          coverGrad: 'linear-gradient(145deg,#0B7F57 0%,#16201D 70%,#0B0F0E 100%)',
          coverTitle: '三路审稿\n完播 +11%',
          campaign: 'ep39-audit-v2',
          packed: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x'],
          tasks: {
            douyin:   { state: 'published', detail: '', url: 'https://www.douyin.com/video/743839', updatedAt: '10 天前', m: { views: 89100, likes: 4120, comments: 418, favorites: 3620, shares: 740, completion: 41.8, fans: 492 } },
            xhs:      { state: 'published', detail: '', url: 'https://www.xiaohongshu.com/explore/ep39', updatedAt: '10 天前', m: { views: 22400, likes: 1320, comments: 194, favorites: 1980, shares: 280, completion: 0, fans: 198 } },
            bilibili: { state: 'published', detail: '', url: 'https://www.bilibili.com/video/BV1park39', updatedAt: '10 天前', m: { views: 29800, likes: 1760, comments: 210, favorites: 2240, shares: 198, completion: 43.2, fans: 174 } },
            channels: { state: 'published', detail: '', url: 'https://channels.weixin.qq.com/ep39', updatedAt: '10 天前', m: { views: 15200, likes: 620, comments: 84, favorites: 410, shares: 245, completion: 33.4, fans: 92 } },
            youtube:  { state: 'published', detail: '', url: 'https://youtu.be/parkEP39', updatedAt: '10 天前', m: { views: 12600, likes: 680, comments: 76, favorites: 0, shares: 88, completion: 47.0, fans: 84 } },
            x:        { state: 'published', detail: '', url: 'https://x.com/park/status/189939', updatedAt: '10 天前', m: { views: 36800, likes: 710, comments: 88, favorites: 540, shares: 142, completion: 0, fans: 102 } },
          },
          conv: { reg: 192, vip: 27, orders: 29, revenue: 5790 },
          reviews: [
            { age: 1, partial: false, views: 59200, inter: 4610, prevNick: 'Obsidian 接进 AI 工作台', prevViews: 51400, fans: 310, convReg: 78, convRev: 1980 },
            { age: 3, partial: false, views: 142000, inter: 12180, prevNick: 'Obsidian 接进 AI 工作台', prevViews: 118000, fans: 790, convReg: 148, convRev: 4120 },
            { age: 7, partial: false, views: 205900, inter: 19823, prevNick: 'Obsidian 接进 AI 工作台', prevViews: 164000, fans: 1142, convReg: 192, convRev: 5790 },
          ],
          publishJson: { episode: 39, nick: '三路审稿单拆解', schedule: `${d10}T19:00:00+08:00`, faststartOk: true, platforms: {} },
        },
        {
          id: 105,
          episode: 42,
          nick: 'Park Studio 全开源发布',
          title: '我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通找写剪发盘',
          schedule: `${dNext}T19:00:00+08:00`,
          finalAt: null,
          chars: 1520,
          durationSec: 420,
          videoName: '',
          videoSizeMb: 0,
          coverGrad: 'linear-gradient(145deg,#6B4BD6 0%,#1E1B2E 68%,#101317 100%)',
          coverTitle: 'Park Studio\n全功能开源',
          campaign: 'ep42-park-studio',
          packed: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x', 'wechat'],
          tasks: {
            douyin:   { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            xhs:      { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            bilibili: { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            channels: { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            youtube:  { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            x:        { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
            wechat:   { state: 'planned', detail: '排期中 · 等待成片与填表', url: '', updatedAt: '今天', m: null },
          },
          conv: { reg: 0, vip: 0, orders: 0, revenue: 0 },
          reviews: [],
          publishJson: {
            episode: 42,
            nick: 'Park Studio 全开源发布',
            schedule: `${dNext}T19:00:00+08:00`,
            video: 'projects/EP42/Park-Studio-开源发布.mp4',
            faststartOk: true,
            platforms: {
              douyin: { title: '零 API 费！我把自己的内容生产线全部开源成了 Park Studio', topics: ['开源项目', 'AI工作流', '自媒体'] },
              xhs: { title: '彻底开源！一人自媒体从找题到 7 平台发布的本地工作台', topics: ['AI工具', '开源', '自媒体效率', '内容运营'] },
              bilibili: { title: '【MIT全开源】Park Studio：选题、写稿、审稿、7平台自动填表与运营大屏合一', tags: ['开源', 'AI Agent', '自媒体'] },
              youtube: { title: 'Park Studio (MIT): Local-First Content OS for Solo Creators', utm: 'utm_campaign=ep42-park-studio' },
              x: { text: '今天正式把 Park Studio 全部开源（MIT）：Topic Studio 的找写审 + 本地 Coding Agent + 7 平台自动填表 + 运营大屏。零 API 费即可本机跑通。' },
            },
          },
        },
      ],
      // 找：爆款流、X 热榜、Obsidian 笔记
      feed: [
        { id: 1, platform: 'douyin', author: '老麦聊AI', title: '一个人做 7 个平台差点崩溃，直到我把浏览器自动化接进本地工作流', multiple: 6.4, likes: 18400, median: 2860, ago: '5 小时前', why: '精准踩中多平台博主「重复填表+数据割裂」的共鸣痛点，用真实后台录屏做反差。', angle: '对比「云端 SaaS 只到口播稿」和「Park Studio 本地闭环」，演示 47 秒填完 7 家。' },
        { id: 2, platform: 'xhs', author: '独立开发阿哲', title: '别再交 AI API 智商税了：把 Claude Code 当成你本地软件的后端引擎', multiple: 4.8, likes: 9600, median: 2000, ago: '9 小时前', why: '「省钱+零门槛」认知反差极强，评论区 80% 在问怎么配置本地 CLI。', angle: '展示 Park Studio 直接调用本机 Claude/Codex CLI 写稿、审稿和生成发布包的实录。' },
        { id: 3, platform: 'bilibili', author: '极客工具箱', title: '【深度】为什么 90% 的个人知识库最终都成了收藏夹坟墓？', multiple: 3.9, likes: 14200, median: 3640, ago: '昨天', why: '直击 Obsidian 用户痛点：只囤不产出，缺少把笔记直接转成作品的引擎。', angle: '演示 Park Studio 只读接入 Obsidian + 知识树内化，如何让旧笔记自动进选题和口播稿。' },
        { id: 4, platform: 'x', author: '@czzzzzzJ_', title: '开源了我每天在用的多平台发布中控「麦田」：专用 Chrome 填表 + 运营大屏 + 飞书卡片', multiple: 8.2, likes: 3120, median: 380, ago: '2 天前', why: '运营大屏的视觉冲击力 + 「国内只填不点发」的极高实操可信度。', angle: '拆解我们在 Park Studio 里吸收其闭环思想、并从零自研开源填表引擎的设计。' },
      ],
      obsidianNotes: [
        { id: 'ob1', file: '01_我的写作/2026-11-22-为什么开源Park-Studio.md', words: 1280, updated: '2 小时前', excerpt: '以前同时维护 Topic Studio 和 4 个 Content Studio 变体，真正让我自己离不开的其实是管理员版的工作流加上后半段的发布闭环…' },
        { id: 'ob2', file: '01_我的写作/2026-11-19-零API本地Agent实战复盘.md', words: 940, updated: '3 天前', excerpt: '只要把后台重活（拆解、写稿、三路审稿）交给本机 Codex / Claude CLI，普通人不用配一堆 API Key 也能把整条内容生产线跑起来。' },
        { id: 'ob3', file: '02_灵感剪藏/多平台风控边界清单.md', words: 620, updated: '5 天前', excerpt: '抖音/小红书/B站/视频号绝不自动点最终发布，只自动填好、截图存档并每 20 分钟飞书催发；防重校验是保命线。' },
      ],
      // 拆解报告
      reports: [
        {
          id: 201,
          sourceTitle: '一个人做 7 个平台差点崩溃，直到我把浏览器自动化接进本地工作流',
          platform: 'douyin',
          author: '老麦聊AI',
          likes: 18400,
          median: 2860,
          multiple: 6.4,
          sourceExcerpt: '做自媒体最消耗人的根本不是拍视频，而是你剪完片子以后，要打开抖音、小红书、B站、视频号、YouTube、X 七个后台，每个平台改标题、切封面比例、填话题、排定时。发完还得隔两天手动挨个抄播放量……所以我写了个本地守护进程，开一个专用 Chrome……',
          mainLine: '用「创作者最烦的重复上架劳动」切入，用“本地专用 Chrome 自动填表 + 运营大屏”给出可复制的解放方案。',
          hook: '前 5 秒直接晒出 7 个平台上传页同时打开的崩溃画面，第 6 秒切到一行命令自动填表。',
          motives: ['情绪共鸣：把「内容创作」与「机械上架」切开，替博主喊出委屈', '信任锚点：明确交代“国内只填不点发”，消除观众对封号的恐惧', '结果可视化：最后 10 秒直接给运营大屏和涨粉柱状图，制造强烈获得感'],
          angles: [
            { title: '合并与开源视角：我把 4 个工作台合体做成全开源的 Park Studio', fit: '极契合你的定位与最近动作' },
            { title: '省钱视角：不用 TikHub 和 DeepSeek API，纯靠本地 Coding Agent 跑通整条线', fit: '极易触发评论区追问与转发' },
            { title: '数据闭环视角：为什么 99% 的 AI 写作工具没人复盘？因为发布环节是断的', fit: '适合讲方法论与产品设计' },
          ],
        },
      ],
      // 当前口播稿与审稿
      script: {
        id: 105,
        title: '我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通找写剪发盘',
        body: `很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？\n\n说实话，以前我也割裂。前半段找选题、拆爆款、写口播稿、三路审稿，我最习惯用 Topic Studio 的管理员版；但一到定稿之后，发七个平台、贴链接、看全网涨粉，这一段以前是断的——我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。\n\n所以我干脆做了一个决定：把以前 4 个本地仓库全部收拢，以我最顺手的管理员版样式为底座，再把多平台自动填表、专用 Chrome 采数、1/3/7 天同龄复盘和运营大屏全部打通，做成唯一一个完全开源的本地工作台——Park Studio。\n\n最关键的是两件事：第一，本地版不需要你买一堆 API Key，直接接你电脑上的 Claude Code 或 Codex 就能跑；第二，国内抖音、小红书、B站、视频号只自动填好、截图存档，最后一下由你自己点发，安全又省事，发完守护进程自动取回链接，直接点亮你的运营大屏。\n\n如果你也是一个人做多平台内容，评论区留个「开源」，我把仓库地址和一键装机指引发你。`,
        spokenRaw: `嗯就是很多人经常问我啊，说 Park 你那个线上选题工作台，还有本地那个 Content Studio，你自己平时到底用哪一个？呃其实说实话，以前我自己也很割裂。前半段找选题、拆爆款、写口播稿，我最顺手的是 Topic Studio 管理员版；但是一旦定稿之后，要发七个平台、贴链接、看全网涨粉，这段其实是断的……`,
        checklistScore: [
          { name: '前 3 秒钩子抓人', score: 92, note: '用「同时维护多套工具到底用哪套」的真实冲突开场，没有废话铺垫。' },
          { name: '事实与数字密度', score: 88, note: '给出了「4 个仓库」「7 个平台」「贴链接 ≈ 0」「1/3/7 天复盘」4 个硬锚点。' },
          { name: '口语节奏与短句', score: 84, note: '第三段偏长（126 字），建议拆成两句停顿，方便镜头切大屏演示。' },
          { name: '行动号召自然度', score: 90, note: '结尾自然引出开源仓库与一键装机指引，无硬广感。' },
        ],
        audit: {
          value: '核心价值极其清晰：直击「前半段 AI 写稿」与「后半段多平台发布/复盘」断裂的行业真痛点，给出“全功能开源 + 零 API 费”的强交付。',
          resonance: '「写完稿手动贴回链接几乎为零」这句话是全篇最强共鸣点，建议往前提到第 20 秒并配一个真实界面特写。',
          rhythm: '第 3 段信息密度略拥挤，把「专用 Chrome 填表」和「零 API 费」拆成两个清晰小节，观众不容易走神。',
          revised: [
            { tag: '留', text: '很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？' },
            { tag: '改', text: '说实话，我以前也割裂：前半段找题、拆解、写稿、审稿全在 Topic Studio；可一到发 7 个平台、贴链接复盘就断了——我们实测过，写完稿愿意手动贴回链接的人，几乎为零。' },
            { tag: '新', text: '所以今天，我把之前 4 个本地仓库全部合并，做成唯一一个 MIT 全开源的本地内容中控：Park Studio。' },
            { tag: '待填', text: '【这里补一句你在自己电脑上实测：一期视频从填完 7 个平台到取回链接，总共省了多少分钟？】' },
            { tag: '改', text: '它只解决两件最硬的事：一是不强制你买 API Key，直接调本机 Claude Code / Codex 就能跑；二是国内四家只自动填表不代点发，发完守护进程自动取链接、每天采数，直接点亮你的运营大屏。' },
            { tag: '留', text: '如果你也是一个人做多平台内容，评论区留个「开源」，我把仓库地址和一键装机指引发你。' },
          ],
        },
      },
      // 我说过的话
      said: [
        { id: 1, topic: '产品原则', text: '我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。', from: 'EP41 复盘语音 · 02:14', muted: false },
        { id: 2, topic: '风控边界', text: '国内四家平台绝不做全自动静默发布，只把视频、封面、文案、话题全部填好，最后一下人点。', from: 'Obsidian 笔记 · 多平台风控边界', muted: false },
        { id: 3, topic: 'AI 工作流', text: '不要让 AI 替你编案例，编出来的东西观众三秒就能听出塑料味。', from: 'EP39 口播 · 04:08', muted: false },
        { id: 4, topic: '开源理念', text: '所有我自己每天用的功能全部放进 Park Studio 开源版，不搞半残阉割版。', from: '今日录音 · 00:45', muted: false },
      ],
      // Park 信源
      sources: {
        newsletter: [
          { id: 'n1', tag: 'AI 日报', title: 'Tauri 2.x 打包本地 Python/Node 桌面工作台最佳实践汇总', date: '今天 08:15', body: '越来越多开源本地 AI 工具正从纯命令行转向「本地 Web 服务 + Tauri 轻壳（<15MB）」：既保留浏览器 localhost 远程访问，又提供系统托盘常驻、开机自启与原生文件拖入体验。' },
          { id: 'n2', tag: 'AI 日报', title: 'Coding Agent 正在吞掉传统 SaaS 中间件：CLI 作为通用本地推理引擎', date: '今天 08:10', body: '当创作者电脑上已经登录 Claude Code / Codex 后，本地工具直接复用 CLI 订阅比要求用户配置 4 个 API Key 的转化率高出 3.4 倍。' },
          { id: 'n3', tag: 'AI 日报', title: 'Chrome DevTools Protocol（CDP）在隔离 Profile 下的多账号防风控实测', date: '昨天', body: '使用独立 --user-data-dir 隔离业务窗口，避免注入 --enable-automation 标记，并严格限制抓取频次，是目前个人创作者后台自动化最稳妥的工程方案。' },
        ],
        saved: [
          { id: 's1', tag: '搞钱日报', title: '开源工具 + 知识站/陪跑闭环：麦田 7 天 1.2k Star 背后的 UTM 转化路径拆解', date: '今天', body: '开源项目本体完全 MIT 解决刚需（多平台发布 + 运营大屏），并在转化页演示如何接入自有知识站，自然带动高意向精准注册，付费转化率是泛流量的 6.2 倍。' },
          { id: 's2', tag: '搞钱日报', title: '知识型博主高客单咨询漏斗：用公开作品数据大屏建立不可伪造的专业信任', date: '昨天', body: '与其在简介里写“全网百万播放”，不如直接晒持续更新的同龄复盘曲线与单期涨粉数据。' },
        ],
        dev: [
          { id: 'd1', tag: '开发日报', title: 'Park Studio 前端完整架构落地：融合 Topic Studio 管理员版与运营指挥大屏', date: '今天', body: '完成首页、运营大屏、写一条四步、发布中控（含分发日历与自研填表流程）、作品全景、1/3/7 天同龄复盘、转化漏斗、知识树、CRM 及系统设置全套交互前端。' },
          { id: 'd2', tag: '开发日报', title: '统一专用 Chrome 管理器设计完成，准备替代旧版 3 个外挂仓库', date: '昨天', body: '将原本散落在 douyin-chrome / social-auto-upload / content-ops 的多套 Cookie 统一收敛到 ~/.park-studio/chrome-profile。' },
        ],
        materials: [
          { id: 'm1', cat: '给视频加动效', title: '数据飙升数字滚动 + 3D 卡片浮现（Remotion / 剪映模板）', hint: '含提示词 + JSON 镜头参数' },
          { id: 'm2', cat: '做封面配图', title: '焦橙 × 深炭黑极简科技封面（3:4 & 16:9 双比例）', hint: '含风格 Prompt 与安全字区参考' },
          { id: 'm3', cat: '做一条新视频', title: '桌面工作台录屏 + 画中画口播双轨模板', hint: '含分镜节奏表（前 5 秒高密切换）' },
        ],
        kline: [
          { sym: 'BTC', price: '$98,420', chg: '+2.4%', note: '日线站稳 20 日均线' },
          { sym: 'NVDA', price: '$146.80', chg: '+1.8%', note: '财报前放量震荡' },
          { sym: 'TSLA', price: '$342.10', chg: '-0.9%', note: '高位回踩支撑位' },
          { sym: '沪深300', price: '4,085', chg: '+0.6%', note: '量能温和回升' },
          { sym: '黄金', price: '$2,718', chg: '+0.4%', note: '避险买盘延续' },
          { sym: '纳指100', price: '21,180', chg: '+1.1%', note: 'AI 权重领涨' },
        ],
      },
      // 知识树
      tree: [
        {
          slug: 'content-ops',
          name: '多平台内容运营与发布闭环',
          trunk: '内容生产是“找→拆→写→审→剪→发→盘”的单一流水线，任何一环靠手工记忆都会掉链子。',
          questions: ['这条内容的单一核心痛点是什么？', '哪些平台适合首发长视频，哪些适合图文切片？', '发完 24h / 72h / 7d 拿什么指标判断赢了还是输了？'],
          standards: ['国内四家坚持“填完不代发”，零封号红线', '每期发布前强制过 faststart 与封面比例校验', '复盘只看“同龄对比”（第 N 天对第 N 天），不拿刚发的和发了一个月的硬比'],
          pitfalls: ['在多平台重复上传同一文件触发风控', '把“总粉丝数”当增长指标，忽略日净增与发布日放大倍数'],
          sources: ['mdldm-maitian 实战总结', 'Topic Studio 线上用户行为观察（贴链接 ≈ 0）'],
        },
        {
          slug: 'script-writing',
          name: '知识型口播写作与三路审稿',
          trunk: '好口播不是 AI 堆辞藻，而是用你的真实经历和数字，装进经过验证的节奏骨架里。',
          questions: ['前 5 秒有没有给观众停下来的理由？', '整篇稿子里有几个不可替代的真实数字或亲历故事？'],
          standards: ['原话占比 > 75%，绝不编造经历', '单段口播不超过 80 字，每 20 秒一个认知小钩子'],
          pitfalls: ['开头先自我介绍 15 秒', '堆砌抽象方法论却没有具体画面'],
          sources: ['park-writing 清单', 'dbskill · dbs-script-flow'],
        },
        {
          slug: 'local-agent',
          name: '本地 AI 工具与开源产品工程',
          trunk: '能复用用户本机已登录的 Coding Agent 和浏览器，就不要逼用户买一堆 API Key 和交密码。',
          questions: ['新用户能不能在 3 分钟内先跑出 Demo 数据看到价值？', '能不能给用户的 AI 写一份 agent-install.md 自动装机？'],
          standards: ['SQLite 单文件落盘，所有配置与隐私不出本机', '缺失可选依赖时优雅降级并明说怎么修，绝不整站崩溃'],
          pitfalls: ['把外部仓库和本机路径写死在代码里', '强制要求特定芯片或复杂环境才能看到首屏'],
          sources: ['content-studio-open 验收单体系', 'Park Studio 架构规范'],
        },
      ],
      // 咨询客户 CRM
      clients: [
        { id: 1, name: '周洋帆', niche: '情感 / 知识IP', stage: '已成交', amount: 2000, source: '抖音 EP39', next: '本周五定位复盘会', note: '已跑通对标爆款流，希望接入本地版自动填表' },
        { id: 2, name: '林晨', niche: 'AI 独立开发', stage: '已约时间', amount: 2000, source: 'X EP41', next: '明天 15:00 腾讯会议', note: '关注知识树内化 + 自有站 UTM 转化归因' },
        { id: 3, name: '陈思远', niche: '财经科普', stage: '新线索', amount: 0, source: 'B站 EP40', next: '待发定位诊断表', note: '团队 2 人，想把现有 Obsidian 笔记库接进 Park Studio' },
      ],
      // 转化渠道明细
      siteChannels: [
        { source: 'bilibili', label: 'B站', reg: 196, vip: 28, orders: 31, revenue: 6180 },
        { source: 'x', label: 'X', reg: 164, vip: 24, orders: 26, revenue: 5190 },
        { source: 'douyin', label: '抖音', reg: 142, vip: 14, orders: 15, revenue: 2990 },
        { source: 'xhs', label: '小红书', reg: 118, vip: 17, orders: 18, revenue: 3580 },
        { source: 'youtube', label: 'YouTube', reg: 64, vip: 11, orders: 12, revenue: 2410 },
      ],
      // 总览选题池
      topics: [
        { id: 105, title: '我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通找写剪发盘', stage: '写', score: 15, updated: '10 分钟前', trash: false },
        { id: 106, title: '为什么 90% 的个人知识库最终成了收藏夹坟墓？（Obsidian 实战）', stage: '找', score: 13, updated: '2 小时前', trash: false },
        { id: 104, title: '一期视频发 7 个平台太折磨？本地专用 Chrome + Agent 半自动发布闭环', stage: '发', score: 14, updated: '昨天', trash: false },
        { id: 103, title: '别再收藏吃灰了：用「知识树 + 内化」让 AI 写口播稿越写越像我自己', stage: '盘', score: 14, updated: '3 天前', trash: false },
        { id: 102, title: '口播稿为什么留不住人？三路 AI 并行审稿拉高完播率 11%', stage: '盘', score: 13, updated: '10 天前', trash: false },
        { id: 99, title: '（旧草稿）纯手动搬运公众号排版踩坑记录', stage: '找', score: 8, updated: '14 天前', trash: true },
      ],
      // 猜想与早会
      guesses: [
        { id: 1, text: '我猜：小红书封面换成「白底大黑字 + 运营大屏局部截图」，收藏率能从 8% 提到 12% 以上', due: '明天到期', status: '验证中' },
        { id: 2, text: '我猜：B 站标题带【MIT开源】且简介放带 UTM 的 GitHub 链接，知识站注册转化翻倍', due: '已验证', status: '成立' },
      ],
      // 通知与守护进程日志
      notifications: [
        { id: 1, kind: 'warn', title: 'EP41 有 2 个平台（小红书、视频号）已填好，等你点最后一下「发布」', link: '#publish', time: '10 分钟前', read: false },
        { id: 2, kind: 'alert', title: '视频号登录态保活提醒：距离上次扫码已 6 天，建议刷新防掉线', link: '#settings/platforms', time: '28 分钟前', read: false },
        { id: 3, kind: 'good', title: 'EP41 第 1 天复盘已生成并推至飞书：全平台 11.4 万播放（上期同龄 1.7 倍）', link: '#review', time: '2 小时前', read: false },
        { id: 4, kind: 'info', title: '本地守护进程完成 09:30 全平台粉丝采集：今日净增 +418', link: '#dashboard', time: '今天 09:32', read: true },
      ],
      daemonLogs: [
        { ts: '21:30', ep: 'EP41', plat: '小红书', action: '催点发布', result: '已推飞书卡片（第 1 次提醒）' },
        { ts: '21:28', ep: 'EP41', plat: '视频号', action: '填表存档', result: '已截提交前快照 · 等待点发' },
        { ts: '21:15', ep: 'EP41', plat: '公众号', action: '存草稿箱', result: '已排版入草稿箱' },
        { ts: '19:15', ep: 'EP41', plat: 'B站', action: '自动取链', result: '已回填 BV1park41 到「作品」页' },
        { ts: '19:12', ep: 'EP41', plat: '抖音', action: '自动取链', result: '已回填作品链接并启动 6h 采样' },
        { ts: '09:32', ep: '全平台', plat: '7 平台', action: '每日采数', result: '总粉 142,840（今日 +418）' },
      ],
      wendyMsgs: [
        {
          role: 'ai',
          text: '早安 Park！今天有 3 件最值得先动的事：\n1. **EP41** 在小红书和视频号已经由专用 Chrome 填好了，点一下就能发完闭环；\n2. 你的 **EP42《Park Studio 开源发布》** 停在「写」，刚审出 3 条改法；\n3. 近 7 天涨粉最快是 **小红书（+512）**，EP41 首日播放已是上期同龄的 **1.7 倍**。',
          card: { title: '建议下一步动作', desc: '去「发布中控」把 EP41 剩余 2 个平台点发并自动回填链接', hash: '#publish', btn: '打开发布中控' },
        },
      ],
      positioning: {
        who: 'Park · AI 实战派创作者与开源工具作者（Topic Studio & Park Studio 发起人）',
        money: '开源免费工具（Park Studio）建立信任 → 线上 SaaS（Topic Studio）+ 1v1 内容定位咨询 + 知识站会员',
        diff: '不讲空泛提示词，只晒自己每天真实在跑的生产线、真实数据大屏与可一键部署的开源代码',
        rules: '不编造案例、不碰客户平台密码、国内四家坚持人点最后一下、所有数据可追溯',
        bio: '把一个人的内容团队做成开源软件：选题、剪辑、7 平台填表发布与运营复盘合一。',
      },
      // 剪辑工作台：Hook 选句 + 镜头表（Spec Table）+ 交给本地 Agent
      cutProject: {
        id: 105,
        episode: 42,
        title: '我把 4 个内容工作台合并成 1 个开源本地中控',
        sourceFile: 'EP42-原始口播.mov',
        duration: '7 分 18 秒',
        density: '中', // 低 | 中 | 高
        burnSubs: true,
        hookIdx: [1, 4],
        selectedShot: 1,
        lines: [
          { i: 0, ts: '00:00', text: '很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？', shot: 1 },
          { i: 1, ts: '00:14', text: '我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。', shot: 2 },
          { i: 2, ts: '00:26', text: '所以我把以前 4 个本地仓库全部收拢，做成唯一一个完全开源的本地内容中控——Park Studio。', shot: 3 },
          { i: 3, ts: '00:44', text: '它分为四个极其干净的工作台：选题、剪辑、发布、复盘。', shot: 4 },
          { i: 4, ts: '00:58', text: '本地版零 API 费，直接接你电脑上的 Claude Code 或 Codex 就能跑；国内四家只自动填好、截图存档，最后一下你自己点发。', shot: 5 },
          { i: 5, ts: '01:22', text: '发完之后，守护进程自动取回链接，每天采集 7 平台粉丝和 1/3/7 天同龄复盘，直接点亮你的运营大屏。', shot: 6 },
        ],
        shots: [
          { id: 1, ts: '00:00–00:14', style: '画中画 · 居中大字弹出', preview: '「线上 vs 本地，到底用哪套？」', reason: '前 14 秒抓注意力，用极简双词对比卡交代冲突。' },
          { id: 2, ts: '00:14–00:26', style: '数据高亮卡（焦橙冲击）', preview: '贴回链接率 ≈ 0%', reason: '核心反差事实，放大数字并配轻微音效停顿。' },
          { id: 3, ts: '00:26–00:44', style: '录屏放大 · 4 仓合一动效', preview: '4 个旧仓 → Park Studio (MIT)', reason: '直观展示架构收敛，建立开源可信度。' },
          { id: 4, ts: '00:44–00:58', style: '四格导航高亮追踪', preview: '[ 选题 | 剪辑 | 发布 | 复盘 ]', reason: '镜头聚焦左栏四宫格切换，降低观众理解门槛。' },
          { id: 5, ts: '00:58–01:22', style: '分屏实录 · 专用 Chrome 自动填表', preview: '国内只填不点发 · 零 API 费', reason: '同时解决观众对「贵」和「封号」的两大顾虑。' },
          { id: 6, ts: '01:22–01:45', style: '运营大屏推镜 + 涨粉曲线动画', preview: '142,359 粉丝 · 同龄 1.7×', reason: '结尾视觉高潮，给足“我也想装一套”的获得感。' },
        ],
        hooks: [
          '我们线上验证过，写完稿愿意手动贴链接复盘的人几乎为零——所以我把发布和大屏做成开源本地中控了。',
          '别再同时维护 4 套工具和买一堆 API Key 了：我开源了 Park Studio，只接你本机 Claude/Codex 就能跑完 7 平台。',
          '一期视频发 7 个平台差点崩溃？看我如何用 4 个极简工作台（选题/剪辑/发布/复盘）彻底闭环。',
          '我把我自己每天在用的管理员工作台全功能 MIT 开源了，零阉割、零 API 费。',
        ],
        pickedHook: 0,
      },
    };
  };
})();
