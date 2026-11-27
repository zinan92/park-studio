/* Park Studio 初始空态骨架（严格零假数据：全部真实数据由本地 FastAPI + SQLite + 专用 Chrome 实时驱动） */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});

  function emptySync(worksUnsupported = false) {
    return {
      followers: { status: 'never', count: 0, error: '', lastAttemptAt: '', lastSuccessAt: '' },
      works: {
        status: worksUnsupported ? 'unsupported' : 'never',
        count: 0,
        error: worksUnsupported ? '支持辅助发布与粉丝采集；暂不支持作品明细采数' : '',
        lastAttemptAt: '',
        lastSuccessAt: '',
      },
    };
  }

  PS.defaultState = function () {
    return {
      meta: {
        owner: 'Creator',
        workspaceName: 'Park Studio',
        version: 'v0.5.0',
        demoMode: false,
        runtimeMode: 'localhost',
      },
      daemon: {
        running: true,
        chromeOnline: false,
        chromePort: 9333,
        chromeProfile: '~/.park-studio/chrome-profile',
        lastMetricsAt: '未采集',
        nextSyncMin: 18,
        feishuEnabled: false,
        feishuWebhook: '',
        wechatIlinkEnabled: false,
        remindMinutes: 20,
        scheduleTamperAlert: true,
      },
      settings: {
        aiBackend: 'gemini-api',
        aiModel: 'gemini-2.5-flash',
        apiBaseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        apiModel: 'deepseek-chat',
        geminiApiKey: '',
        apiKeySet: false,
        teardownMode: 'standard',
        teardownModules: ['mainline', 'opening', 'segments', 'angles7'],
        teardownCustomPrompt: '',
        obsidianPath: '~/Documents/Obsidian',
        obsidianWritingDir: '003_park原始输出',
        projectRoot: '~/Movies/ParkStudio',
        transcribeEngine: 'mlx-whisper',
        tikhubOptionalKey: '',
        siteEnabled: false,
        siteName: '',
        siteUrl: '',
        siteAdminPath: '/admin',
        siteDashApi: '/api/admin/dashboard',
        feishuLogin: false,
        communityKey: '',
        sharedBenchmarkOptIn: false,
        sharedBenchmarkCount: 0,
        sharedContributed: 0,
        telemetryOptIn: false,
        learnLinks: true,
        modules: {
          source: true,
          clients: true,
          site: true,
          kline: false,
          conversion: true,
        },
      },
      releases: [
        { ver: 'v0.5.1', date: '2026-11-27', tag: '最新', title: '零假数据彻底清零 + 静态预览图 + 全链路状态/报错/更新时间反馈 + 跨电脑 Cookie 迁移 + doctor 自检', notes: [
          '彻底清除残留演示假数据（转化归因、对标榜、虚构日报、虚构客户），空态全部配带「示例预览」角标的真实效果静态图与接入引导',
          '12 平台全面区分「未采集 / 未登录 / 采集失败（坏了）/ 暂不支持采数 / 真实为 0」五种状态，实时展示每次同步时间戳与具体报错原因',
          '新增跨平台单期手动合并/拆分入口，所有规则诊断标签明确标注样本量与「规则推断」依据',
          '新增 `park-studio doctor` 一键环境自检与 `park-studio cookies export/import` 跨电脑登录态迁移命令，移除了知识树模块与本机硬编码路径'
        ] },
        { ver: 'v0.5.0', date: '2026-11-27', tag: '历史', title: '内容全生命周期总览 + 6 动机备选标题 + 上来就拍一键 Autopilot + 海外 5 平台数据采集', notes: [
          '中控大屏升级「内容全生命周期总览（Content Lifecycle Pipeline）」：一屏看清 6 个阶段进度',
          '新增 6 个不同动机备选标题（反差感 / 真实冲突 / 硬数字 / 场景后果 / 悬念缺口 / 硬结果），一键联动封面大字',
          '新增「⚡ 上来就拍 · 一键全自动（Autopilot）」：原片一键转写 → 粗剪 → 6 标题 → 3 封面 → 多平台中英文案',
          '补齐 Instagram / Threads / LinkedIn / Meta / TikTok 的粉丝与作品 CDP 数据采集器，全部 12 平台纳入统一中控'
        ] },
        { ver: 'v0.4.0', date: '2026-11-27', tag: '历史', title: 'Standalone 全闭环升级：3 步引导装依赖 · 剪辑 Agent 真执行 · 封面工坊 · 内嵌播放器', notes: [
          '3 步式 Standalone Onboarding 引导：按需选 12 平台 → 分工写稿/剪辑 Agent → 一键体检并安装 FFmpeg / Whisper / yt-dlp / Node.js',
          '解锁剪辑 Agent 真执行模式 + 内置封面工坊（9:16 / 4:3 / 16:9 三比例）+ 链接拆解与爆款反推下期 3 选题'
        ] },
        { ver: 'v0.3.0', date: '2026-11-24', tag: '历史', title: '2,656 视觉素材库 + 7 角度可配拆解 + 12 平台支持 + API 可视化配置', notes: [
          '视觉素材库支持 4 标签分页与分类筛选，对标拆解升级 3 层可配置引擎与自定义 Prompt',
          '扩展至 12 平台，系统设置新增 DeepSeek / OpenAI / OpenRouter / Ollama 预设与 AI 连通性测试'
        ] },
      ],
      platformStatus: {
        douyin:    { state: 'warn', checkedAt: '未检查', detail: '尚未体检，点击「全部检查」验证专用 Chrome 登录态', disabled: false, sync: emptySync(false) },
        xhs:       { state: 'warn', checkedAt: '未检查', detail: '尚未体检，点击「全部检查」验证专用 Chrome 登录态', disabled: false, sync: emptySync(false) },
        bilibili:  { state: 'warn', checkedAt: '未检查', detail: '尚未体检，点击「全部检查」验证专用 Chrome 登录态', disabled: false, sync: emptySync(false) },
        channels:  { state: 'warn', checkedAt: '未检查', detail: '尚未体检，视频号需定期扫码保活', disabled: false, sync: emptySync(false) },
        youtube:   { state: 'warn', checkedAt: '未检查', detail: '尚未体检，点击「全部检查」验证 YouTube Studio 登录态', disabled: false, sync: emptySync(false) },
        x:         { state: 'warn', checkedAt: '未检查', detail: '尚未体检，点击「全部检查」验证 X 登录态', disabled: false, sync: emptySync(true) },
        wechat:    { state: 'warn', checkedAt: '未检查', detail: '尚未体检，公众号每次发布需扫码确认', disabled: false, sync: emptySync(true) },
        tiktok:    { state: 'warn', checkedAt: '未启用', detail: '海外可选平台 · 点「启用」接入 TikTok Studio', disabled: true, sync: emptySync(false) },
        instagram: { state: 'warn', checkedAt: '未启用', detail: '海外可选平台 · 点「启用」接入 Instagram Reels', disabled: true, sync: emptySync(false) },
        threads:   { state: 'warn', checkedAt: '未启用', detail: '海外可选平台 · 点「启用」接入 Threads', disabled: true, sync: emptySync(false) },
        linkedin:  { state: 'warn', checkedAt: '未启用', detail: '海外可选平台 · 点「启用」接入 LinkedIn', disabled: true, sync: emptySync(false) },
        meta:      { state: 'warn', checkedAt: '未启用', detail: '海外可选平台 · Meta Business Suite（IG + FB）', disabled: true, sync: emptySync(false) },
      },
      syncState: {},
      followers: { douyin: {}, xhs: {}, bilibili: {}, channels: {}, youtube: {}, x: {}, wechat: {}, tiktok: {}, instagram: {}, threads: {}, linkedin: {}, meta: {} },
      doing: { id: 0, episode: 1, title: '', stage: 'write', steps: { find: '', chai: '', write: '', audit: '' } },
      episodes: [],
      feed: [],
      obsidianNotes: [],
      reports: [],
      script: {
        id: 0,
        title: '',
        body: '',
        spokenRaw: '',
        checklistScore: [],
        audit: { value: '', resonance: '', rhythm: '', revised: [] },
      },
      said: [],
      sources: {
        newsletter: [],
        saved: [],
        dev: [],
        materials: [],
        kline: [],
      },
      clients: [],
      siteChannels: [],
      topics: [],
      guesses: [],
      notifications: [],
      daemonLogs: [],
      wendyMsgs: [],
      positioning: {
        who: '',
        money: '',
        diff: '',
        rules: '',
        bio: '',
      },
      cutProject: {
        id: 0,
        episode: 1,
        title: '',
        sourceFile: '',
        duration: '',
        density: '中',
        burnSubs: true,
        hookIdx: [],
        selectedShot: 1,
        lines: [],
        shots: [],
        hooks: [],
        pickedHook: 0,
      },
    };
  };
})();
