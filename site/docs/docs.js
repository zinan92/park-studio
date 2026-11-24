/* Park Studio Docs — Bilingual ZH/EN, 3-Column Layout, ⌘K Search, Dark/Light Theme */
(function () {
  'use strict';

  const DOCS = [
    {
      id: 'quickstart',
      group: { zh: '开始使用', en: 'Getting Started' },
      title: { zh: '快速开始', en: 'Quick Start' },
      lead: {
        zh: '5 分钟在你的 macOS 或 Linux 上启动 Park Studio，零云端账号、零强制 API 费。',
        en: 'Launch Park Studio locally on macOS or Linux in 5 minutes — zero accounts, zero forced API fees.',
      },
      sections: [
        {
          id: 'prereq',
          h: { zh: '环境要求', en: 'Prerequisites' },
          body: {
            zh: `<ul><li>Python <code>&gt;= 3.11</code></li><li>Chrome 或 Chromium（用于专用 CDP <code>:9333</code> 7 平台填表，绝不碰你的日常浏览器）</li><li>可选：任意已安装的本机 Coding Agent CLI（<code>gemini</code> / <code>claude</code> / <code>codex</code> / <code>agy</code>）</li><li>可选：<code>ffmpeg</code> 与 <code>mlx-whisper</code>（用于 Apple Silicon 本地一键粗剪）</li></ul>`,
            en: `<ul><li>Python <code>&gt;= 3.11</code></li><li>Chrome or Chromium (for the isolated CDP <code>:9333</code> autofill profile)</li><li>Optional: Any local Coding Agent CLI (<code>gemini</code> / <code>claude</code> / <code>codex</code> / <code>agy</code>)</li><li>Optional: <code>ffmpeg</code> and <code>mlx-whisper</code> for local rough cutting</li></ul>`,
          },
        },
        {
          id: 'install-script',
          h: { zh: '一键脚本安装', en: 'One-Line Script Install' },
          code: {
            lang: 'bash',
            src: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh`,
          },
          body: {
            zh: `<p>脚本会自动初始化虚拟环境、安装依赖并启动 <code>http://127.0.0.1:8792/</code>。所有配置与 SQLite 数据库均存放在 <code>~/.park-studio/</code>。</p>`,
            en: `<p>The script creates a virtual environment, installs dependencies, and starts <code>http://127.0.0.1:8792/</code>. All config and SQLite data live inside <code>~/.park-studio/</code>.</p>`,
          },
        },
        {
          id: 'autostart',
          h: { zh: 'macOS 开机自启（launchd）', en: 'macOS Auto-Start (launchd)' },
          body: {
            zh: `<p>进入工作台右上角「系统」页点击「安装开机自启」，或直接调用 <code>POST http://127.0.0.1:8792/api/daemon/install-launchd</code>，守护进程会在后台静默运行并按时保活与采数。</p>`,
            en: `<p>Open Settings in the app or call <code>POST http://127.0.0.1:8792/api/daemon/install-launchd</code> to run Park Studio cleanly as a macOS LaunchAgent.</p>`,
          },
        },
      ],
    },
    {
      id: 'ai-install',
      group: { zh: '开始使用', en: 'Getting Started' },
      title: { zh: 'AI 助手一键安装', en: 'Install via AI Agent' },
      lead: {
        zh: '把一段现成指令复制发给 Gemini CLI、Claude Code、Codex 或 Cursor，让它帮你完成克隆、体检、配置与启动。',
        en: 'Paste one prompt into Gemini CLI, Claude Code, Codex, or Cursor to install and configure everything automatically.',
      },
      sections: [
        {
          id: 'prompt',
          h: { zh: '复制这段 Prompt', en: 'Copy This Prompt' },
          code: {
            lang: 'prompt',
            src: `请帮我在本机安装并启动开源项目 Park Studio（本地内容中控）：
1. 克隆仓库到 ~/work/park-studio（如果还没有）：
   git clone https://github.com/zinan92/park-studio.git ~/work/park-studio
2. 检查 python3 (>=3.11) 并确保依赖已装（fastapi uvicorn pyyaml httpx websockets pydantic）。
3. 询问我三个本地配置并写入 ~/.park-studio/config.yaml：
   - 我的 Obsidian 笔记库目录路径（可选，不填也能用）
   - 我的视频成片工程目录（默认 ~/Movies/ParkStudio）
   - 我想用的本机 Coding Agent CLI（gemini / claude / codex / agy，零 API 费）
4. 启动服务 http://127.0.0.1:8792/，或运行 bash scripts/build-macos-app.sh 编译原生 Mac App。`,
          },
          body: {
            zh: `<div class="callout good"><b>零心智负担：</b>你也可以直接把仓库里的 <code>agent-install.md</code> 丢给你的 Coding Agent，它同时包含了标准工程目录约定。</div>`,
            en: `<div class="callout good"><b>Zero friction:</b> You can also point your Coding Agent straight at <code>agent-install.md</code> in the repository root.</div>`,
          },
        },
      ],
    },
    {
      id: 'mac-app',
      group: { zh: '开始使用', en: 'Getting Started' },
      title: { zh: 'Mac 原生桌面 App', en: 'Native macOS App' },
      lead: {
        zh: '不用下载几百 MB 的 Electron，直接用 macOS 自带 Swift 编译器构建纯原生透明标题栏桌面 App。',
        en: 'Compile a lightweight native WKWebView macOS app using Apple\'s built-in Swift compiler — zero Electron bloat.',
      },
      sections: [
        {
          id: 'build-mac',
          h: { zh: '一键编译与运行', en: 'Build & Launch' },
          code: {
            lang: 'bash',
            src: `bash scripts/build-macos-app.sh
open "dist/Park Studio.app"`,
          },
          body: {
            zh: `<p>编译完成后会将原生 <code>.app</code>（及可选 <code>.dmg</code>）生成在 <code>dist/</code> 目录。前端会自动识别 <code>ParkStudioMacApp</code> User-Agent，为左上角红绿灯留出精致的呼吸间距。</p>`,
            en: `<p>Outputs <code>dist/Park Studio.app</code>. The UI automatically detects the native WKWebView wrapper and adds clean spacing for macOS traffic-light buttons.</p>`,
          },
        },
      ],
    },
    {
      id: 'hub',
      group: { zh: '五个视图', en: 'Five Views' },
      title: { zh: '中控与运营大屏', en: 'Command Hub & Dashboard' },
      lead: {
        zh: '打开第一屏同时看到两件事：你现在正在推进哪一步，以及 7 平台全网运营盘面。',
        en: 'One first screen showing both where you left off right now and your real cross-platform growth.',
      },
      sections: [
        {
          id: 'wip',
          h: { zh: '顶部「正在做」推进条', en: 'Top "In Progress" Strip' },
          body: {
            zh: `<p>中控顶部固定 3 张推进卡，一键直达：<b>正在剪的集数</b>（当前停在镜头表哪一镜）、<b>待确认发布的平台</b>（已填表等你亲自点发）、以及<b>今日 AI 日报头条</b>。</p>`,
            en: `<p>Three live shortcut cards jump directly to your active cut, platforms awaiting your final publish click, and today\'s top AI briefing item.</p>`,
          },
        },
        {
          id: 'fans',
          h: { zh: '全平台总粉丝与人话结论', en: 'Stacked Followers & Plain-English Insights' },
          body: {
            zh: `<p>所有粉丝数与单期播放数据均来自你本机专用 Chrome 实测采集，写入本地 SQLite 后实时绘制按平台堆叠涨粉图（带发布日虚线标记）与 7 平台独立走势卡。</p>`,
            en: `<p>All follower counts and episode view metrics are synced locally into SQLite and rendered as stacked daily growth bars with episode release markers.</p>`,
          },
        },
      ],
    },
    {
      id: 'topic',
      group: { zh: '五个视图', en: 'Five Views' },
      title: { zh: '选题与 Obsidian 只读', en: 'Topics & Read-Only Obsidian' },
      lead: {
        zh: '严格只读挂载本地 Obsidian，结合对标爆款库与本机 Coding Agent 完成找题、写稿、三路审稿。',
        en: 'Mount your local Obsidian vault strictly read-only, pair with breakout benchmarks, and draft using local Coding Agents.',
      },
      sections: [
        {
          id: 'obsidian-ro',
          h: { zh: 'Obsidian 严格只读承诺', en: 'Strict Read-Only Vault' },
          body: {
            zh: `<div class="callout good"><b>绝不改写原文件：</b>Park Studio 仅读取你勾选的 Obsidian 目录（日报、原始输出、拆解笔记），所有「加入选题」、写稿草稿与审稿结论均存入独立 SQLite 数据库。</div>`,
            en: `<div class="callout good"><b>Never mutates your vault:</b> Park Studio only reads selected Obsidian folders. Topic states, drafts, and audits live strictly in SQLite.</div>`,
          },
        },
        {
          id: 'audit3',
          h: { zh: '三路审稿诊断与零 API 费', en: '3-Axis Audit with Zero API Fees' },
          body: {
            zh: `<p>在「系统」页选择你电脑里已安装的 <code>gemini</code> / <code>claude</code> / <code>codex</code> / <code>agy</code> CLI，一键生成 3–5 个备选开头钩子，并输出「价值 / 共鸣 / 节奏」三路量化诊断与最小改法。</p>`,
            en: `<p>Select any installed local CLI (<code>gemini</code>, <code>claude</code>, <code>codex</code>, <code>agy</code>) in Settings to generate hooks and Value / Resonance / Pacing audits without extra SaaS token charges.</p>`,
          },
        },
      ],
    },
    {
      id: 'cut',
      group: { zh: '五个视图', en: 'Five Views' },
      title: { zh: '双模式本地剪辑', en: 'Dual-Mode Local Cutting' },
      lead: {
        zh: '支持「一键离线粗剪」与「高级镜头表 Spec Table」双模式，并可拆分独立的剪辑 Agent。',
        en: 'Choose between one-click offline rough cutting and Spec Table motion editing with an independent Cut Agent.',
      },
      sections: [
        {
          id: 'rough-cut',
          h: { zh: '模式一：一键离线粗剪', en: 'Mode 1: One-Click Rough Cut' },
          body: {
            zh: `<p>拖入原片后调用本机 <code>mlx-whisper</code>（Apple Silicon）或 <code>faster-whisper</code> 转写，自动识别重说口误与超长停顿气口，确认后由 <code>ffmpeg</code> 执行两遍 <code>-16 LUFS</code> 响度标准化、ASS 字幕烧录与 <code>faststart</code> 落盘。</p>`,
            en: `<p>Drop raw footage for offline transcription via <code>mlx-whisper</code> or <code>faster-whisper</code>, auto-flag retakes and pauses, and render normalized <code>-16 LUFS</code> faststart MP4s with burned-in ASS subtitles.</p>`,
          },
        },
        {
          id: 'spec-table',
          h: { zh: '模式二：镜头表与独立剪辑 Agent', en: 'Mode 2: Spec Table & Cut Agent' },
          body: {
            zh: `<p>支持在「系统」中为剪辑单独指定 Agent（例如全局用 Gemini CLI，剪辑单独用 Codex 或 Claude Code），一键导出 <code>worktable.json</code> 并实时查看后台渲染任务日志。</p>`,
            en: `<p>Assign a dedicated Cut Agent independently from your main writing Agent, export <code>worktable.json</code>, and stream live job logs directly in the UI.</p>`,
          },
        },
      ],
    },
    {
      id: 'publish',
      group: { zh: '五个视图', en: 'Five Views' },
      title: { zh: '7 平台 CDP 安全发布', en: '7-Platform Safe CDP Publishing' },
      lead: {
        zh: '100% MIT 自研专用 Chrome CDP 填表引擎，零闭源插件依赖，国内 4 平台严格「只填不点发」。',
        en: '100% MIT Chrome CDP autofill engine with strict human-in-the-loop guardrails on domestic Chinese platforms.',
      },
      sections: [
        {
          id: 'guardrail',
          h: { zh: '为什么国内 4 平台严格「只填不点发」？', en: 'Human-in-the-Loop Guardrail' },
          body: {
            zh: `<div class="callout warn"><b>安全护栏：</b>抖音、小红书、B站、视频号由专用 Chrome（<code>~/.park-studio/chrome-profile</code>，CDP <code>:9333</code>）自动上传成片、封面、标题、正文与话题，并自动截取提交前 JPEG 存档，<b>但绝不替你点最后一下发布按钮</b>——避免平台风控与误发事故。</div>`,
            en: `<div class="callout warn"><b>Safety guardrail:</b> Douyin, Xiaohongshu, Bilibili, and Channels are autofilled with video, covers, copy, and tags plus a pre-submit JPEG archive — then paused right before the final publish click for human confirmation.</div>`,
          },
        },
        {
          id: 'plat-matrix',
          h: { zh: '7 平台支持矩阵', en: '7-Platform Matrix' },
          body: {
            zh: `<table class="d-tbl"><thead><tr><th>平台</th><th>自动化策略</th><th>发后采数</th></tr></thead><tbody>
              <tr><td>抖音 / 小红书 / B站 / 视频号</td><td>自动填表 + 提交前截图，人工点发</td><td>自动回填链接、播放、互动与粉丝</td></tr>
              <tr><td>YouTube Studio</td><td>填表并回读校验一致后可自动定时</td><td>自动同步播放与订阅增量</td></tr>
              <tr><td>X (Twitter)</td><td>自动发帖并附 UTM 追踪参数</td><td>自动同步曝光与互动</td></tr>
              <tr><td>微信公众号</td><td>自动排版存入草稿箱</td><td>自动同步阅读与粉丝</td></tr>
            </tbody></table>`,
            en: `<table class="d-tbl"><thead><tr><th>Platform</th><th>Automation Mode</th><th>Post-Publish Sync</th></tr></thead><tbody>
              <tr><td>Douyin / XHS / Bilibili / Channels</td><td>Autofill + JPEG proof; human final click</td><td>Syncs URLs, views, engagement, followers</td></tr>
              <tr><td>YouTube Studio</td><td>Autofill + read-back verification schedule</td><td>Syncs views & subscriber deltas</td></tr>
              <tr><td>X (Twitter)</td><td>Auto-post with UTM campaign tags</td><td>Syncs impressions & engagement</td></tr>
              <tr><td>WeChat Official</td><td>Formatted draft saved to Draft Box</td><td>Syncs reads & followers</td></tr>
            </tbody></table>`,
          },
        },
      ],
    },
    {
      id: 'review',
      group: { zh: '五个视图', en: 'Five Views' },
      title: { zh: '1 / 3 / 7 天同龄复盘', en: 'Day-1 / 3 / 7 Cohort Review' },
      lead: {
        zh: '不拿刚发 1 天的视频去和发了半年的老视频比，用同龄基准看清每一期的真实进步。',
        en: 'Compare episodes at equal age (Day 1, Day 3, Day 7) against your channel median instead of misleading lifetime totals.',
      },
      sections: [
        {
          id: 'cohort',
          h: { zh: '同龄对比与抖音时长散点', en: 'Same-Age Cohorts & Duration Scatter' },
          body: {
            zh: `<p>每期发布后自动归并 7 平台播放、点赞、收藏与评论，计算综合互动率与收藏/赞比值；抖音分析页提供「视频时长 × 播放量」散点图与账号中位数基线，自动用金色标出 <code>3×</code> 以上爆款。</p>`,
            en: `<p>Consolidates cross-platform views, likes, favorites, and comments per episode, plus a Douyin duration-vs-views scatter plot highlighting <code>3×</code> breakout outliers.</p>`,
          },
        },
      ],
    },
    {
      id: 'directory',
      group: { zh: '工程与规范', en: 'Engineering' },
      title: { zh: '统一工程目录与 API', en: 'Project Directory Spec & API' },
      lead: {
        zh: '所有 AI Agent 与发布引擎共用同一套标准目录结构，人类无需操心文件夹怎么命名。',
        en: 'One predictable folder layout shared by every AI agent and the 7-platform publisher.',
      },
      sections: [
        {
          id: 'tree',
          h: { zh: '标准期次目录树', en: 'Standard Episode Directory Tree' },
          code: {
            lang: 'text',
            src: `<projectRoot>/YYYY-MM-DD_<作品标题>/
├── 拍摄提纲.md
├── cut-plan.json
├── subtitles/source.srt
├── analysis/worktable.json
└── final/上传/
    ├── 视频（抖音、视频号、小红书、B站、YouTube）.mp4
    ├── 竖封面（抖音、视频号）.png
    ├── 横封面（抖音、小红书）.png
    ├── 16比9封面（B站、YouTube）.png
    ├── 文案.txt
    └── publish.json`,
          },
          body: {
            zh: `<p>任何外部 Coding Agent 只要按此约定落盘素材，打开 Park Studio「发布 → 打包」即可零配置自动识别。</p>`,
            en: `<p>Any external agent that drops assets into <code>final/上传/</code> is automatically picked up by Park Studio\'s Publish → Pack step.</p>`,
          },
        },
        {
          id: 'rest-api',
          h: { zh: '常用本机 REST API', en: 'Key Local REST Endpoints' },
          body: {
            zh: `<table class="d-tbl"><thead><tr><th>接口</th><th>用途</th></tr></thead><tbody>
              <tr><td><code>GET /api/bootstrap</code></td><td>拉取全量工作台状态、选题、发布任务与实测运营数据</td></tr>
              <tr><td><code>POST /api/topics</code></td><td>从外部脚本或 Agent 写入一条新选题</td></tr>
              <tr><td><code>POST /api/ai/hooks</code> / <code>/api/ai/audit</code></td><td>调用本机 Coding Agent 生成开头钩子或三路审稿</td></tr>
              <tr><td><code>POST /api/publish/from-project</code></td><td>从标准工程目录一键载入待发布期次</td></tr>
              <tr><td><code>POST /api/publish/{id}/fill</code></td><td>触发专用 Chrome CDP 对指定平台自动填表</td></tr>
              <tr><td><code>POST /api/collect/metrics</code></td><td>采集各平台最新作品播放与粉丝增量</td></tr>
            </tbody></table>`,
            en: `<table class="d-tbl"><thead><tr><th>Endpoint</th><th>Purpose</th></tr></thead><tbody>
              <tr><td><code>GET /api/bootstrap</code></td><td>Fetch full studio state, topics, publish jobs, and analytics</td></tr>
              <tr><td><code>POST /api/topics</code></td><td>Create a new topic from scripts or agents</td></tr>
              <tr><td><code>POST /api/ai/hooks</code> / <code>/api/ai/audit</code></td><td>Generate hooks or 3-axis audits via local Coding Agent</td></tr>
              <tr><td><code>POST /api/publish/from-project</code></td><td>Load a standardized project directory for publishing</td></tr>
              <tr><td><code>POST /api/publish/{id}/fill</code></td><td>Trigger isolated Chrome CDP autofill for a platform</td></tr>
              <tr><td><code>POST /api/collect/metrics</code></td><td>Sync fresh cross-platform views and follower counts</td></tr>
            </tbody></table>`,
          },
        },
      ],
    },
    {
      id: 'privacy',
      group: { zh: '工程与规范', en: 'Engineering' },
      title: { zh: '隐私与本地承诺', en: 'Privacy & Local-First Pledge' },
      lead: {
        zh: '没有云端数据库，没有追踪埋点，你的笔记、稿件、原片和账号 Cookie 永远属于你。',
        en: 'No cloud database, no telemetry — your notes, raw footage, scripts, and session cookies never leave your machine.',
      },
      sections: [
        {
          id: 'pledge',
          h: { zh: '三项硬性承诺', en: 'Three Hard Commitments' },
          body: {
            zh: `<ul><li><b>数据 100% 留在本机：</b>所有配置、SQLite 数据库与专用 Chrome Profile 仅存于 <code>~/.park-studio/</code>。</li><li><b>Obsidian 严格只读：</b>绝不修改或覆写你的任何 Markdown 笔记。</li><li><b>MIT 完全开源：</b>全部代码公开可审计，零闭源插件或强制云端鉴权。</li></ul>`,
            en: `<ul><li><b>100% local storage:</b> Config, SQLite DB, and isolated Chrome profile live strictly in <code>~/.park-studio/</code>.</li><li><b>Read-only Obsidian:</b> Never alters your Markdown files.</li><li><b>MIT Licensed:</b> Fully auditable open-source code with zero closed-source plugins.</li></ul>`,
          },
        },
      ],
    },
    {
      id: 'faq',
      group: { zh: '工程与规范', en: 'Engineering' },
      title: { zh: '常见问题 FAQ', en: 'FAQ' },
      lead: {
        zh: '关于安装、零 API 费、浏览器隔离和开源协议的高频问题解答。',
        en: 'Answers to common questions on setup, local Coding Agents, browser isolation, and licensing.',
      },
      sections: [
        {
          id: 'q1',
          h: { zh: '需要购买额外的 API Key 吗？', en: 'Do I need to pay for extra API keys?' },
          body: {
            zh: `<p>不需要。如果你电脑上已经装了 Gemini CLI、Claude Code、Codex 或 Antigravity CLI，Park Studio 可以直接调用它们完成拆解、写稿、审稿和镜头表规划，完全零额外 API 费用。当然也支持自定义 OpenAI / Gemini API Key。</p>`,
            en: `<p>No. Park Studio directly invokes your installed Gemini CLI, Claude Code, Codex, or Antigravity CLI with zero extra API billing, while also supporting custom Gemini or OpenAI-compatible API keys.</p>`,
          },
        },
        {
          id: 'q2',
          h: { zh: '专用 Chrome 会不会影响我日常使用的浏览器？', en: 'Will the dedicated Chrome touch my personal browser?' },
          body: {
            zh: `<p>完全隔离。Park Studio 启动的是指向 <code>~/.park-studio/chrome-profile</code> 的独立浏览器实例（端口 <code>:9333</code>），不会读取你日常 Chrome 的历史记录、密码或书签。</p>`,
            en: `<p>Completely isolated. Park Studio launches a separate profile in <code>~/.park-studio/chrome-profile</code> on CDP port <code>:9333</code> without touching your everyday browser.</p>`,
          },
        },
        {
          id: 'q3',
          h: { zh: '没有 Obsidian 也能用吗？', en: 'Can I use Park Studio without Obsidian?' },
          body: {
            zh: `<p>完全可以。Obsidian 目录是可选项，你依然可以正常使用手动选题、对标爆款库、写稿审稿、双模式剪辑、7 平台自动填表与全网复盘大屏。</p>`,
            en: `<p>Yes. Obsidian is optional — manual topics, benchmark teardowns, scripting, cutting, 7-platform autofill, and analytics all work standalone.</p>`,
          },
        },
      ],
    },
  ];

  let lang = 'zh';
  try {
    const saved = localStorage.getItem('ps:site:lang');
    if (saved === 'en' || saved === 'zh') lang = saved;
  } catch (e) {}
  if (new URLSearchParams(location.search).get('lang') === 'en') lang = 'en';

  let theme = 'dark';
  try {
    const t = localStorage.getItem('ps:theme');
    if (t === 'light' || t === 'dark') theme = t;
  } catch (e) {}
  document.documentElement.dataset.theme = theme;

  const BRAND_SVG = `<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--cta-bg)"/>
    <rect x="8.5" y="8.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)"/>
    <rect x="17.5" y="8.5" width="6" height="6" rx="1.8" fill="var(--accent)"/>
    <rect x="8.5" y="17.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)" fill-opacity=".38"/>
    <rect x="17.5" y="17.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)" fill-opacity=".82"/>
  </svg>`;

  function curDocId() {
    const h = (location.hash || '#quickstart').replace(/^#/, '');
    return DOCS.some(d => d.id === h) ? h : 'quickstart';
  }

  function render() {
    const id = curDocId();
    const idx = DOCS.findIndex(d => d.id === id);
    const doc = DOCS[idx];
    const prev = idx > 0 ? DOCS[idx - 1] : null;
    const next = idx < DOCS.length - 1 ? DOCS[idx + 1] : null;
    const isEn = lang === 'en';

    document.documentElement.lang = isEn ? 'en' : 'zh-CN';
    document.title = `${doc.title[lang]} · Park Studio Docs`;

    const groups = [];
    for (const d of DOCS) {
      const gName = d.group[lang];
      let g = groups.find(x => x.name === gName);
      if (!g) { g = { name: gName, items: [] }; groups.push(g); }
      g.items.push(d);
    }

    document.getElementById('docsRoot').innerHTML = `
      <header class="d-nav">
        <div style="display:flex;align-items:center;gap:16px">
          <a class="d-brand" href="../">${BRAND_SVG}<span>Park Studio</span><span class="tag">Docs</span></a>
          <button type="button" class="d-search-btn" id="openSearch">
            <span>${isEn ? 'Search docs…' : '搜索文档…'}</span><kbd>⌘K</kbd>
          </button>
        </div>
        <div class="d-right">
          <button type="button" class="d-util" id="docLang">${isEn ? '中文' : 'EN'}</button>
          <button type="button" class="d-util" id="docTheme">${theme === 'dark' ? '☀' : '☾'}</button>
          <a class="d-util" href="https://github.com/zinan92/park-studio" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="d-cta" href="../demo/">${isEn ? 'Live demo' : '在线演示'}</a>
        </div>
      </header>

      <div class="d-shell">
        <aside class="d-side" aria-label="Documentation navigation">
          ${groups.map(g => `
            <div>
              <div class="d-grp-lbl">${g.name}</div>
              ${g.items.map(it => `<a href="#${it.id}" class="${it.id === id ? 'on' : ''}">${it.title[lang]}</a>`).join('')}
            </div>`).join('')}
        </aside>

        <article class="d-art">
          <div class="d-crumb">${doc.group[lang]}</div>
          <h1>${doc.title[lang]}</h1>
          <p class="d-lead">${doc.lead[lang]}</p>

          ${doc.sections.map((s, si) => `
            <h2 id="sec-${s.id}">${s.h[lang]}</h2>
            ${s.code ? `
              <div class="code-box">
                <div class="code-h"><span>${s.code.lang}</span><button type="button" class="code-copy" data-ci="${si}">${isEn ? 'Copy' : '复制'}</button></div>
                <pre data-code-src="${si}"></pre>
              </div>` : ''}
            ${s.body ? s.body[lang] : ''}
          `).join('')}

          <nav class="d-pager">
            ${prev ? `<a class="d-page-card" href="#${prev.id}"><span>← ${isEn ? 'Previous' : '上一篇'}</span><b>${prev.title[lang]}</b></a>` : '<div></div>'}
            ${next ? `<a class="d-page-card next" href="#${next.id}"><span>${isEn ? 'Next' : '下一篇'} →</span><b>${next.title[lang]}</b></a>` : '<div></div>'}
          </nav>
        </article>

        <aside class="d-toc">
          <div class="d-toc-title">${isEn ? 'On this page' : '本页目录'}</div>
          ${doc.sections.map(s => `<a href="#sec-${s.id}" data-jump="sec-${s.id}">${s.h[lang]}</a>`).join('')}
        </aside>
      </div>
    `;

    doc.sections.forEach((s, si) => {
      if (!s.code) return;
      const pre = document.querySelector(`[data-code-src="${si}"]`);
      if (pre) pre.textContent = s.code.src;
    });

    document.querySelectorAll('.code-copy').forEach(btn => {
      btn.onclick = async () => {
        const s = doc.sections[+btn.dataset.ci];
        if (!s?.code) return;
        try { await navigator.clipboard.writeText(s.code.src); } catch (e) {}
        const old = btn.textContent;
        btn.textContent = isEn ? 'Copied ✓' : '已复制 ✓';
        setTimeout(() => { btn.textContent = old; }, 1600);
      };
    });

    document.querySelectorAll('[data-jump]').forEach(a => {
      a.onclick = e => {
        e.preventDefault();
        document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });

    document.getElementById('docLang').onclick = () => {
      lang = lang === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('ps:site:lang', lang); } catch (e) {}
      render();
    };
    document.getElementById('docTheme').onclick = () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem('ps:theme', theme); } catch (e) {}
      render();
    };
    document.getElementById('openSearch').onclick = openSearchModal;
  }

  function openSearchModal() {
    const isEn = lang === 'en';
    const bg = document.createElement('div');
    bg.className = 'd-modal-bg';
    bg.innerHTML = `<div class="d-modal"><input type="search" placeholder="${isEn ? 'Search Park Studio docs…' : '搜索 Park Studio 文档…'}" autofocus><ul class="d-res"></ul></div>`;
    const inp = bg.querySelector('input'), ul = bg.querySelector('ul');
    const entries = DOCS.flatMap(d => [
      { id: d.id, label: d.title[lang], sub: d.group[lang], text: `${d.title.zh} ${d.title.en} ${d.lead.zh} ${d.lead.en}`.toLowerCase() },
      ...d.sections.map(s => ({ id: d.id, label: `${d.title[lang]} · ${s.h[lang]}`, sub: d.group[lang], text: `${s.h.zh} ${s.h.en} ${d.title.zh} ${d.title.en}`.toLowerCase() })),
    ]);
    let list = entries.slice(0, 10), idx = 0;
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      list = entries.filter(e => !q || e.text.includes(q)).slice(0, 12);
      idx = Math.min(idx, Math.max(0, list.length - 1));
      ul.innerHTML = list.length ? list.map((x, i) => `<li class="${i === idx ? 'on' : ''}" data-i="${i}"><span>${x.label}</span><small>${x.sub}</small></li>`).join('') : `<li style="color:var(--ink-3)">${isEn ? 'No results' : '无匹配文档'}</li>`;
    };
    const pick = i => { const x = list[i]; if (!x) return; bg.remove(); location.hash = `#${x.id}`; };
    inp.oninput = () => { idx = 0; draw(); };
    inp.onkeydown = e => {
      if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, list.length - 1); draw(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); draw(); e.preventDefault(); }
      if (e.key === 'Enter') pick(idx);
      if (e.key === 'Escape') bg.remove();
    };
    ul.onclick = e => { const li = e.target.closest('[data-i]'); if (li) pick(+li.dataset.i); };
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    document.body.appendChild(bg);
    draw();
    inp.focus();
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearchModal(); }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
})();
