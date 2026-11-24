/* Park Studio Landing — Bilingual (ZH/EN), Live 5-View Interactive Previews, Real SVG Bento Charts */
(function () {
  'use strict';

  const GITHUB_REPO = 'zinan92/park-studio';
  const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

  const I18N = {
    zh: {
      title: 'Park Studio · 开源本地内容生产线与多平台运营中控',
      desc: '100% MIT 开源本地内容工作台：找选题、拆爆款、写口播稿、双模式剪辑、7 平台 CDP 安全自动填表发布与全网运营大屏。零强制 API 费。',
      nav: { features: '功能', charts: '图表', ai: 'AI 协作', deploy: '本地部署', community: '社群与定制', docs: '文档', demo: '在线演示', langLabel: 'EN' },
      hero: {
        eyebrow: '开源 · MIT 协议 · 本地运行 · 零 API 费',
        h1a: '把一人内容工厂，',
        h1b: '收进一个工作台。',
        lead: '选题散在日报、对标和 Obsidian 里，发布散在 7 个创作者后台。Park Studio 把它们收拢成一条本地流水线：找题、写稿、剪辑、填表、复盘，数据 100% 留在你的硬盘。',
        ctaDemo: '在线演示',
        ctaDeploy: '部署你自己的',
        subJoin: '需要安装兜底、最新工作流或团队定制？',
        subLink: '加入 ¥199 实战微信群 / 聊 ¥10,000+ 定制 →',
      },
      features: {
        eyebrow: '功能',
        h2: '一套工作台，五个视图',
        lead: '中控、选题、剪辑、发布、复盘，同一条内容从灵感到复盘，换个视角接着干。',
        tabs: [
          {
            key: 'hub', label: '中控',
            h3: '打开第一屏，就知道今天停在哪一步',
            p: '顶部「正在做」推进条直达当前剪到一半的集数、待确认发布的平台和今日 AI 日报头条；下方实时呈现全平台总粉丝堆叠走势、7 平台最新一期进度与 AI 一句话人话结论。',
            linkText: '了解中控与运营大屏 →', linkHref: 'docs/#hub',
          },
          {
            key: 'topic', label: '选题',
            h3: '只读接入 Obsidian，每天早上排好今天拍什么',
            p: '按期解析 AI 日报、搞钱日报与开发日报，同步对标爆款库（按「比平时火几倍」排序并一键 AI 拆解）。写稿调用本机 Coding Agent 生成开头钩子与「价值 / 共鸣 / 节奏」三路审稿诊断。',
            linkText: 'Obsidian 只读与选题流程 →', linkHref: 'docs/#topic',
          },
          {
            key: 'cut', label: '剪辑',
            h3: '一键粗剪 + 高级镜头表，双模式本地出片',
            p: '离线 mlx-whisper / faster-whisper 转写，自动标出口误与气口，ffmpeg 两遍 -16 LUFS 响度与 ASS 字幕烧录；高级模式生成 Spec Table 镜头表并导出 worktable.json 交给独立剪辑 Agent 渲染。',
            linkText: '双模式本地剪辑说明 →', linkHref: 'docs/#cut',
          },
          {
            key: 'publish', label: '发布',
            h3: '自研 CDP 7 平台填表，国内严格只填不点发',
            p: '独立专用 Chrome（:9333），不碰你的日常浏览器，一次扫码长期保活。自动传成片、封面、标题与话题并截提交前 JPEG 存档；国内 4 平台停在发布按钮前由你亲自确认，发完自动取链接采数。',
            linkText: '7 平台安全护栏说明 →', linkHref: 'docs/#publish',
          },
          {
            key: 'review', label: '复盘',
            h3: '1 / 3 / 7 天同龄对比，每一期都能越做越好',
            p: '自动采集抖音、小红书、B站、视频号、YouTube、X、公众号实测播放与涨粉，按发布后同龄天数横向对照历史中位数，附抖音时长 × 播放散点图一眼定位黄金时长。',
            linkText: '多平台采数与复盘算法 →', linkHref: 'docs/#review',
          },
        ],
      },
      charts: {
        eyebrow: '图表',
        h2: '全网数据，画给你看',
        lead: '每张图都由你本机 SQLite 采集的真实数据实时算出。下面就是内置演示工作台的样子。',
        link: '查看数据采集与隐私承诺 →',
        streamTitle: '7 平台每月新增粉丝',
        streamSub: '按平台堆叠走势，右侧浅色虚线为按当前发片频率推算的未来 3 个月预期。点击图例可高亮单平台。',
        sankeyTitle: '选题来源 → 成片形态 → 流量去向',
        sankeySub: '看清哪类信源贡献了最高效的爆款产出。',
        radarTitle: '12 个月发布与播放节律',
        radarSub: '实线为近 12 个月，虚线为去年同期。',
        bubbleTitle: '全网粉丝分布',
        bubbleSub: '7 平台矩阵占比，一眼看清主力阵地。',
        waterfallTitle: 'EP42 播放变动归因',
        waterfallSub: '相对账号中位数，Hook、完播与跨平台分发分别贡献了多少增量。',
        baselineTitle: '近 10 期实测 vs 中位数',
        baselineSub: '柱子为单期全网播放，虚线为近 30 天账号中位数基线。',
        heatTitle: '逐日创作与发布热力图',
        heatSub: '今年每一天的写稿、剪辑与发片活跃度，颜色越深产出越密。',
      },
      ai: {
        eyebrow: 'AI 协作',
        h2: '用你电脑里已有的 AI，零强制 API 费',
        lead: '不需要再买一份 SaaS 订阅积分。Park Studio 原生调度你本机的 Coding Agent，也可以独立拆分全局 Agent 与剪辑 Agent。',
        leftEyebrow: '本机 Coding Agent',
        leftH3: '拆解、写稿、三路审稿，直接跑在你本机',
        leftList: [
          '支持 Gemini CLI、Claude Code、Codex、Antigravity CLI 与自定义 API',
          'Obsidian 笔记库严格只读，结合「我说过的话」写稿不洗稿、不编造',
          '独立配置剪辑 Agent，后台实时查看切镜头表与渲染日志',
        ],
        leftLink: '查看 Agent 配置指南 →',
        leftFoot: '零云端中转 · 你的稿件与 API Key 只存在 ~/.park-studio/',
        rightEyebrow: '统一工程目录 + 本地 REST API',
        rightH3: '让你的 AI 直接交付成片，一句触发发布',
        rightP: '从定稿自动按统一规范建目录。任何外部 AI Agent 只要把成片、三套封面和文案写进 final/上传/，Park Studio 就会自动识别并可通过本机 REST API 直接触发 7 平台填表。',
        rightBubble: '帮我把 EP42 粗剪渲染成片，并按规范落盘填好 7 个平台草稿',
        rightLink: '工程目录规范与 REST API →',
      },
      deploy: {
        eyebrow: '本地部署',
        h2: '部署你自己的 Park Studio',
        lead: '没有注册，没有订阅费，没有云端抽成。代码 100% MIT 开源，数据只留在你自己的电脑里。',
        docsLink: '完整的部署说明 →',
        ghCta: '前往 GitHub',
        copy: '复制',
        copied: '已复制',
        bridgeText: '自己部署遇到环境问题，或者想给你的团队直接定制一套多账号/私有信源版本？',
        bridgeLink: '加入 ¥199 实战群 / 聊定制 →',
        tabs: [
          {
            key: 'ai', label: '交给你的 AI 助手', rec: '推荐',
            note: '把这段话发给 Gemini CLI、Claude Code、Codex 或 Cursor，它会自动完成安装、配置和启动。',
            foot: '安装完成后打开 http://127.0.0.1:8792/ 即可开始使用。',
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
            key: 'script', label: '本地一键脚本', rec: '5 分钟',
            note: 'macOS / Linux 终端直接运行，自动创建虚拟环境并启动本地工作台。',
            foot: '启动后浏览器打开 http://127.0.0.1:8792/，所有数据保存在 ~/.park-studio/。',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh`,
          },
          {
            key: 'mac', label: 'Mac 原生桌面 App', rec: '纯 Swift · 无 Electron',
            note: '无需安装 Rust 或 Electron，直接用 macOS 系统自带 Swift 编译透明标题栏原生桌面 App。',
            foot: '产物生成在 dist/Park Studio.app，拖进「应用程序」即可像原生软件一样使用。',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/build-macos-app.sh
open "dist/Park Studio.app"`,
          },
        ],
      },
      community: {
        eyebrow: '社群与定制',
        h2a: '开源代码 100% 免费，',
        h2b: '想跑得更快，可以直接找 Park。',
        lead: 'Park Studio 的全部核心代码按 MIT 协议永久开源，自己动手一分钱不用花。如果你希望有人兜底排障、跟着实战工作流迭代，或者想为你的团队定制私有版本，欢迎直接加我微信。',
        c1Tag: '个人创作者 · 独立开发者',
        c1Title: 'Park 实战微信群',
        c1Price: '¥199',
        c1Unit: '/ 一次性入群 · 无续费',
        c1Desc: '一道极轻的认真度门槛，把真正跑通本地 AI 内容生产线的创作者聚在一起，高频交流排障与变现。',
        c1List: [
          '<b>安装与使用答疑：</b>本地环境、Coding Agent 与专用 Chrome CDP 遇到问题直接群里问',
          '<b>持续工作流同步：</b>同步 Park 每天自用的最新 Prompt、剪辑镜头表配置与版本内测',
          '<b>实战信息差交流：</b>群友共创一人内容工厂、爆款拆解案例与 AI 变现实战复盘',
          '<b>直达作者本人：</b>有共性需求或产品建议，第一时间反馈并进入开源迭代',
        ],
        c1Note: '适合个人使用与日常交流；如果你有明确的企业/团队定制开发需求，请直接看右侧方案。',
        c1Cta: '扫码加 Park 微信（备注 199）',
        c2Tag: 'MCN · 企业 IP 团队 · 工作室定制',
        c2Title: '小 B / 团队定制开发',
        c2Price: '¥10,000',
        c2Unit: '起 / 按项目范围评估',
        c2Desc: '由 Park 亲自架构与交付，把开源版 Park Studio 深度改造成完全贴合你公司业务的私有内容生产与分发系统。',
        c2List: [
          '<b>多账号矩阵与审批流：</b>多达人隔离 Chrome Profile、排期看板、飞书 / 企微通知与数据日报',
          '<b>私有信源与知识库：</b>对接内部飞书文档、Notion、业务数据库或行业专属爆款监控脚本',
          '<b>品牌专属剪辑流水线：</b>定制企业 VI 字幕动效、专属镜头表规则与封面自动生成模板',
          '<b>私有化落地与培训：</b>帮团队全员装好本地 Agent 工作流并完成 1v1 交付陪跑',
        ],
        c2Note: '明确门槛：定制开发单项目 ¥10,000 起（支持有预算的个人 IP 按同标准定制）；轻量答疑欢迎先入 ¥199 实战群。',
        c2Cta: '加微信聊定制需求（备注 定制）',
        qrTitle: '手机在手边？直接微信扫码找 Park（新加坡）',
        qrDesc: '开源答疑与实战交流请备注「199进群」；团队私有化与定制开发（¥10,000 起）请备注「定制」并简单说明你的团队规模与目标。',
        qrBtn: '放大二维码 / 复制备注',
      },
      foot: {
        desc: '100% MIT 开源的本地内容生产线与多平台运营中控。零强制 API 费，数据永远留在你本机。',
        cols: [
          { h: '产品', links: [['在线演示', 'demo/'], ['五个视图', '#features'], ['数据图表', '#charts'], ['本地部署', '#deploy']] },
          { h: '社群与服务', links: [['¥199 实战微信群', '#community'], ['¥10,000+ 团队定制', '#community'], ['快速开始文档', 'docs/#quickstart'], ['7 平台安全护栏', 'docs/#publish']] },
          { h: '开源与安全', links: [['GitHub 仓库', GITHUB_URL], ['MIT 开源协议', `${GITHUB_URL}/blob/main/LICENSE`], ['隐私与本地承诺', 'docs/#privacy'], ['常见问题 FAQ', 'docs/#faq']] },
        ],
        colophon: 'Park Studio · 开源免费用，社群陪跑，小 B 定制交付。',
        license: 'MIT License · Made by Park (@Park的AI世界 · 新加坡)',
      },
    },
    en: {
      title: 'Park Studio · Open-Source Local Content Studio & 7-Platform Command Center',
      desc: '100% MIT open-source local content pipeline: topic sourcing, script drafting, dual-mode video cutting, 7-platform safe CDP autofill publishing, and analytics. Zero forced API fees.',
      nav: { features: 'Features', charts: 'Charts', ai: 'AI Agents', deploy: 'Self-host', community: 'Community & Custom', docs: 'Docs', demo: 'Live demo', langLabel: '中文' },
      hero: {
        eyebrow: 'Open source · MIT · Local-first · Zero API fees',
        h1a: 'One local studio for your',
        h1b: 'entire content pipeline.',
        lead: 'Topics live in newsletters and Obsidian; publishing lives across 7 creator studios. Park Studio unifies sourcing, scripting, cutting, safe autofill publishing, and analytics — 100% local on your machine.',
        ctaDemo: 'Live demo',
        ctaDeploy: 'Self-host it',
        subJoin: 'Want setup support, Park\'s live workflows, or a tailored team build?',
        subLink: 'Join Creator Group (¥199) / Custom Dev ($1,500+) →',
      },
      features: {
        eyebrow: 'Features',
        h2: 'One studio, five views',
        lead: 'Command Hub, Topics, Cut, Publish, Review — follow every episode end to end without switching tools.',
        tabs: [
          {
            key: 'hub', label: 'Overview',
            h3: 'Open the first screen and know exactly where you left off',
            p: 'The top "In Progress" strip jumps straight to your active cut, pending publish confirmations, and today\'s AI brief — paired with live 7-platform stacked follower curves and plain-English takeaways.',
            linkText: 'Explore the Command Hub →', linkHref: 'docs/#hub',
          },
          {
            key: 'topic', label: 'Topics',
            h3: 'Read-only Obsidian vault plus daily breakout benchmarks',
            p: 'Parses daily AI & builder briefings alongside breakout benchmark videos ranked by multiplier over channel median. Drafts hooks and runs a 3-axis audit (Value / Resonance / Pacing) via your local Coding Agent.',
            linkText: 'Read-only Obsidian & sourcing →', linkHref: 'docs/#topic',
          },
          {
            key: 'cut', label: 'Cut',
            h3: 'One-click rough cut or Spec Table motion workflow',
            p: 'Offline mlx-whisper / faster-whisper transcription automatically flags retakes and pauses before two-pass -16 LUFS & ASS subtitle rendering — or export worktable.json to a dedicated Cut Agent.',
            linkText: 'Dual-mode local cutting →', linkHref: 'docs/#cut',
          },
          {
            key: 'publish', label: 'Publish',
            h3: 'Dedicated Chrome CDP autofill with strict human guardrails',
            p: 'An isolated Chrome profile (:9333) keeps logins alive without touching your personal browser. Uploads video, covers, copy, and tags with pre-submit JPEG proof — pausing before the final publish click on domestic platforms.',
            linkText: '7-platform safety guardrails →', linkHref: 'docs/#publish',
          },
          {
            key: 'review', label: 'Review',
            h3: 'Day-1 / Day-3 / Day-7 cohort comparisons that compound',
            p: 'Syncs real views, likes, and follower deltas across Douyin, Xiaohongshu, Bilibili, Channels, YouTube, X, and WeChat — comparing same-age performance against your historical median.',
            linkText: 'Analytics & cohort methodology →', linkHref: 'docs/#review',
          },
        ],
      },
      charts: {
        eyebrow: 'Charts',
        h2: 'Where your reach grows, drawn',
        lead: 'Every visualization is computed live from your local SQLite database. Nothing is uploaded to any third-party cloud.',
        link: 'Privacy & local data model →',
        streamTitle: 'Monthly follower growth across 7 platforms',
        streamSub: 'Stacked monthly net followers; translucent dashed zone projects the next 3 months at current cadence. Click legend to isolate.',
        sankeyTitle: 'Source → Format → Platform reach',
        sankeySub: 'See which intelligence sources produce your highest-leverage episodes.',
        radarTitle: '12-month publishing cadence',
        radarSub: 'Solid indigo: trailing 12 months · Dashed: prior year.',
        bubbleTitle: 'Audience share by platform',
        bubbleSub: 'Total followers across all 7 connected channels.',
        waterfallTitle: 'EP42 view gain attribution',
        waterfallSub: 'How hook retention, completion rate, and cross-posting lifted views over median.',
        baselineTitle: 'Last 10 episodes vs. median baseline',
        baselineSub: 'Bars show actual cross-platform views; dashed line marks your 30-day median.',
        heatTitle: 'Daily creation & publishing heatmap',
        heatSub: 'Drafts, cuts, and published episodes across the year — darker indigo means higher output.',
      },
      ai: {
        eyebrow: 'AI Native',
        h2: 'Use the AI agents already on your machine',
        lead: 'No bundled token markups or SaaS credit packs. Park Studio orchestrates your local Coding Agent CLIs and lets you assign a separate Cut Agent.',
        leftEyebrow: 'Local Coding Agents',
        leftH3: 'Teardown, draft, and 3-axis audit — zero API fees',
        leftList: [
          'First-class support for Gemini CLI, Claude Code, Codex, Antigravity CLI, or custom APIs',
          'Strict read-only Obsidian access — drafts stay faithful to your own stories and voice',
          'Independent Cut Agent configuration with live background render logs',
        ],
        leftLink: 'Configure local AI backends →',
        leftFoot: 'Zero cloud relay · Notes, drafts, and keys stay inside ~/.park-studio/',
        rightEyebrow: 'Standard Project Spec + Local REST API',
        rightH3: 'Let your agent drop finals and trigger 7-platform autofill',
        rightP: 'Finalizing a script scaffolds one clean directory convention. Any AI agent writes the rendered video, three cover ratios, and copy into final/上传/ and drives autofill via localhost REST API.',
        rightBubble: 'Rough-cut EP42, export all three covers, and pre-fill all 7 platform drafts',
        rightLink: 'Directory spec & REST API →',
      },
      deploy: {
        eyebrow: 'Self-host',
        h2: 'Run your own Park Studio',
        lead: 'No signup, no subscription, no lock-in. 100% MIT open source — your notes, scripts, and browser cookies never leave your machine.',
        docsLink: 'Full deployment guide →',
        ghCta: 'View on GitHub',
        copy: 'Copy',
        copied: 'Copied',
        bridgeText: 'Need setup help, ongoing workflows, or a custom team build tailored to your studio?',
        bridgeLink: 'Join Creator Group / Custom Dev →',
        tabs: [
          {
            key: 'ai', label: 'Give it to your AI assistant', rec: 'Recommended',
            note: 'Send this prompt to Gemini CLI, Claude Code, Codex, or Cursor — it installs, configures, and launches Park Studio automatically.',
            foot: 'Once running, open http://127.0.0.1:8792/ in your browser.',
            code: `Install and launch the open-source Park Studio local content workbench on my machine:
1. Clone https://github.com/zinan92/park-studio.git to ~/work/park-studio if not present.
2. Verify python3 (>=3.11) and install dependencies (fastapi uvicorn pyyaml httpx websockets pydantic).
3. Ask me for three local preferences and save to ~/.park-studio/config.yaml:
   - My Obsidian vault path (optional, read-only)
   - My video projects root (default ~/Movies/ParkStudio)
   - My preferred local Coding Agent CLI (gemini / claude / codex / agy)
4. Start the local server on http://127.0.0.1:8792/ or build the native macOS app via bash scripts/build-macos-app.sh.
5. On macOS, optionally enable auto-start via POST /api/daemon/install-launchd.`,
          },
          {
            key: 'script', label: 'One-line Local Script', rec: '5 min',
            note: 'Run in macOS or Linux terminal to set up a clean environment and launch localhost:8792.',
            foot: 'All config and SQLite data stay inside ~/.park-studio/.',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh`,
          },
          {
            key: 'mac', label: 'Native macOS App', rec: 'Pure Swift · No Electron',
            note: 'Compiles a lightweight transparent-titlebar native Mac app using Apple\'s built-in Swift compiler — zero Electron bloat.',
            foot: 'Outputs dist/Park Studio.app ready for your Applications folder.',
            code: `git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/build-macos-app.sh
open "dist/Park Studio.app"`,
          },
        ],
      },
      community: {
        eyebrow: 'Community & Custom Builds',
        h2a: '100% free & MIT open source —',
        h2b: 'work directly with Park when you want speed.',
        lead: 'Every core feature is open source forever. Join Park\'s private WeChat builder group for setup support & live workflows, or engage Park directly for custom studio/team builds.',
        c1Tag: 'Solo Creators · Indie Builders',
        c1Title: 'Park Creator WeChat Group',
        c1Price: '¥199',
        c1Unit: 'one-time (~$29) · No renewal',
        c1Desc: 'A curated, high-signal WeChat group for creators actually running local AI content pipelines.',
        c1List: [
          '<b>Setup & Troubleshooting:</b> Direct help on local installs, Coding Agents, and Chrome CDP profiles',
          '<b>Live Workflow Drops:</b> Park\'s latest prompts, cutting presets, and early release previews',
          '<b>Creator Playbooks:</b> Peer teardowns, solo-studio ops, and real AI monetization discussions',
          '<b>Direct Access to Park:</b> Share feature ideas straight into the open-source roadmap',
        ],
        c1Note: 'Best for individual creators & general Q&A. For bespoke team development, see Custom Studio Builds.',
        c1Cta: 'Scan WeChat QR (Note: 199)',
        c2Tag: 'MCNs · Brand Studios · Teams',
        c2Title: 'Custom Studio & B2B Development',
        c2Price: '¥10,000+',
        c2Unit: 'per project (~$1,500+)',
        c2Desc: 'Architected and delivered directly by Park to adapt Park Studio into your team\'s private content factory.',
        c2List: [
          '<b>Multi-Account Matrix & Approvals:</b> Isolated creator profiles, shared calendars, Feishu/WeCom alerts',
          '<b>Private Intelligence & Knowledge Bases:</b> Integrate internal Feishu Docs, Notion, or industry scrapers',
          '<b>Brand-Specific Cutting & Covers:</b> Custom motion templates, subtitle branding, and cover pipelines',
          '<b>Team Rollout & 1-on-1 Handover:</b> Full local agent onboarding and training for your content team',
        ],
        c2Note: 'Minimum engagement starts at ¥10,000 (~$1,500). Individual creators with commercial budgets are welcome on the same terms.',
        c2Cta: 'Connect on WeChat (Note: Custom)',
        qrTitle: 'Ready to connect? Scan WeChat to reach Park (Singapore)',
        qrDesc: 'Note "199" to join the creator group, or "Custom" with your team size and workflow goals for ¥10,000+ bespoke builds.',
        qrBtn: 'Enlarge QR / Copy Note',
      },
      foot: {
        desc: '100% MIT open-source local content pipeline & 7-platform command center. Zero forced API fees; your data stays on disk.',
        cols: [
          { h: 'Product', links: [['Live demo', 'demo/'], ['Five views', '#features'], ['Charts', '#charts'], ['Self-host', '#deploy']] },
          { h: 'Community & Custom', links: [['¥199 Creator Group', '#community'], ['¥10,000+ Custom Dev', '#community'], ['Quick start', 'docs/#quickstart'], ['7-platform guardrails', 'docs/#publish']] },
          { h: 'Open Source', links: [['GitHub', GITHUB_URL], ['MIT License', `${GITHUB_URL}/blob/main/LICENSE`], ['Privacy pledge', 'docs/#privacy'], ['FAQ', 'docs/#faq']] },
        ],
        colophon: 'Park Studio · MIT Open Source · Community-backed · Custom-built for Studios.',
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
  let activeStreamFilter = null;
  let activeTopicFilter = 'all';
  let activeCutMode = 'spec';
  let wxModalMode = null;

  function renderWeChatModal() {
    if (!wxModalMode) return '';
    const isEn = lang === 'en';
    const isCustom = wxModalMode === 'custom';
    const title = isCustom
      ? (isEn ? 'Custom Studio Build (¥10,000+)' : '加 Park 微信 · 聊团队定制（¥10,000 起）')
      : (isEn ? 'Join Park Creator Group (¥199)' : '加 Park 微信 · ¥199 实战群');
    const remark = isCustom
      ? (isEn ? 'Hi Park, I want to discuss a custom Park Studio build (¥10,000+ budget). Our team/workflow goal is: ' : '你好 Park，我想咨询 Park Studio 定制开发（预算 ¥10,000+），我们的团队与需求是：')
      : (isEn ? '199 Group' : '199进群');
    const hint = isCustom
      ? (isEn ? 'Scan with WeChat to connect with Park (Singapore). Copy the template below as your friend note:' : '用微信扫一扫添加 Park（新加坡），复制下方备注发送即可直接沟通需求：')
      : (isEn ? 'Scan with WeChat to add Park (Singapore) and send note "199 Group":' : '用微信扫一扫添加 Park（新加坡），备注「199进群」即可拉你入群：');

    return `<div class="wx-modal-bg" id="wxModalBg">
      <div class="wx-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="wx-modal-h">
          <h3>${title}</h3>
          <button type="button" class="wx-close" id="wxClose" aria-label="Close">✕</button>
        </div>
        <p style="margin:0;font-size:13.5px;color:var(--label-2);line-height:1.6">${hint}</p>
        <div class="wx-qr-frame">
          <img src="${rel('assets/park-wechat-qr.jpg')}" alt="Park WeChat QR Code">
        </div>
        <div class="wx-remark-box">
          <div>${isEn ? 'Suggested Note:' : '建议备注暗号：'}<br><b id="wxRemarkTxt">${remark}</b></div>
          <button type="button" class="copy-btn" id="copyWxRemark">${isEn ? 'Copy' : '复制'}</button>
        </div>
      </div>
    </div>`;
  }

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

  function buildHeroBubbles() {
    const items = [
      { id: 'DY', name: '抖音', val: '43.4k', x: 118, y: 88, r: 34, c: '#EDEDED', tc: '#0F0F10' },
      { id: 'BL', name: 'B站', val: '24.2k', x: 184, y: 74, r: 27, c: '#00A1D6', tc: '#fff' },
      { id: 'WX', name: '公众号', val: '19.1k', x: 174, y: 132, r: 24, c: '#30A46C', tc: '#fff' },
      { id: 'X',  name: 'X',     val: '17.4k', x: 64,  y: 62,  r: 23, c: '#2D2D32', tc: '#fff' },
      { id: 'XH', name: '小红书', val: '16.2k', x: 64,  y: 122, r: 22, c: '#E5484D', tc: '#fff' },
      { id: 'SP', name: '视频号', val: '11.9k', x: 118, y: 148, r: 20, c: '#F59E0B', tc: '#0F0F10' },
      { id: 'YT', name: 'YT',    val: '9.2k',  x: 118, y: 34,  r: 18, c: '#E52D27', tc: '#fff' },
    ];
    return `<svg viewBox="0 0 240 184" class="chart-svg" aria-label="Platform cluster">
      ${items.map(b => `
        <g data-tip="${b.name} · ${b.val}">
          <circle cx="${b.x}" cy="${b.y}" r="${b.r + 5}" fill="${b.c}" fill-opacity=".10"/>
          <circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.c}" fill-opacity=".92"/>
          <text x="${b.x}" y="${b.y - 2}" text-anchor="middle" style="fill:${b.tc};font-weight:700;font-size:${b.r > 25 ? 11.5 : 10}px">${b.id}</text>
          <text x="${b.x}" y="${b.y + 11}" text-anchor="middle" style="fill:${b.tc};opacity:.85;font-size:9px">${b.val}</text>
        </g>`).join('')}
    </svg>`;
  }

  function renderFeaturePreview(key) {
    const isEn = lang === 'en';
    if (key === 'hub') {
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Command Hub · In Progress & Multi-Platform Overview' : '中控大屏 · 正在做与全网总览'}</div>
          <div class="pv-chips">
            <span class="pv-chip on">${isEn ? '7 platforms live' : '7 平台在线'}</span>
            <span class="pv-chip">${isEn ? '141,420 followers' : '全网 141,420 粉'}</span>
          </div>
        </div>
        <div class="pv-grid-3" style="margin-bottom:12px">
          <div class="pv-card">
            <div class="pv-card-top"><span class="pv-tag">${isEn ? 'Cutting' : '剪辑中'}</span><span class="pv-meta">EP42</span></div>
            <h4>${isEn ? 'One Local Studio Replacing 4 Workflows' : '把 4 个内容工作台合并成 1 个开源本地中控'}</h4>
            <div class="pv-meta">${isEn ? 'Spec Table · 14 shots · -16 LUFS' : '停在镜头表 · 14 镜 · 待渲染'}</div>
          </div>
          <div class="pv-card">
            <div class="pv-card-top"><span class="pv-tag amber">${isEn ? '2 awaiting click' : '2 平台待点发'}</span><span class="pv-meta">EP41</span></div>
            <h4>${isEn ? 'Local Chrome Autofill Across 7 Platforms' : '本地专用 Chrome 半自动填表闭环'}</h4>
            <div class="pv-meta">${isEn ? 'XHS & Channels filled · JPEG proof saved' : '小红书 / 视频号已填表 · 已存档截图'}</div>
          </div>
          <div class="pv-card">
            <div class="pv-card-top"><span class="pv-tag good">${isEn ? 'Today Brief' : '今日 AI 日报'}</span><span class="pv-meta">28 items</span></div>
            <h4>${isEn ? 'Local Coding Agents & Video Cut Automation' : '本地 Agent 零 API 费接管内容生产'}</h4>
            <div class="pv-meta">${isEn ? 'Obsidian read-only synced · 09:30' : 'Obsidian 只读已同步 · 09:30'}</div>
          </div>
        </div>
        <div class="pv-grid-2">
          <div class="pv-card">
            <div class="pv-card-top"><b style="font-size:13px">${isEn ? 'Total Audience Growth' : '全平台总粉丝'}</b><span class="pv-tag good">+2,840 / 30d</span></div>
            <div style="font-size:26px;font-weight:700;font-family:var(--mono);letter-spacing:-.02em;margin:4px 0 10px">141,420</div>
            <svg viewBox="0 0 360 66" class="chart-svg">
              <defs><linearGradient id="pvG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E63DD" stop-opacity=".28"/><stop offset="1" stop-color="#3E63DD" stop-opacity="0"/></linearGradient></defs>
              <path d="M0 54 L42 50 L85 45 L128 42 L170 33 L212 31 L255 21 L298 15 L360 8 L360 66 L0 66 Z" fill="url(#pvG)"/>
              <path d="M0 54 L42 50 L85 45 L128 42 L170 33 L212 31 L255 21 L298 15 L360 8" fill="none" stroke="#3E63DD" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="pv-card">
            <div class="pv-card-top"><b style="font-size:13px">${isEn ? 'Plain-English Takeaways' : 'AI 一句话人话结论'}</b><span class="pv-meta">EP41</span></div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#3F3F46;line-height:1.5">
              <div><span class="pv-tag good">${isEn ? 'Reach' : '播放'}</span> ${isEn ? 'Day-1 views hit 114k (+66% vs EP40); Bilibili favorites ratio leads at 8.5%.' : '发布 24 小时全网破 11.4 万（较上期 +66%），B站收藏率 8.5% 领先。'}</div>
              <div><span class="pv-tag">${isEn ? 'Hook' : '开头'}</span> ${isEn ? 'Direct workflow demo in first 6s lifted Douyin completion rate to 34.2%.' : '前 6 秒直接演示自动填表画面，抖音完播率拉升至 34.2%。'}</div>
            </div>
          </div>
        </div>`;
    }
    if (key === 'topic') {
      const items = [
        { cat: 'bench', tag: '4.6×', title: isEn ? 'Why Solo Creators Are Moving From SaaS Back to Local Agents' : '为什么一人博主正在放弃 SaaS 回到本地 Agent 工作流', meta: 'YouTube · 182k views · 4.6× median', score: isEn ? 'Value 9.4 · Resonance 9.1 · Pace 8.8' : '价值 9.4 · 共鸣 9.1 · 节奏 8.8' },
        { cat: 'daily', tag: isEn ? 'AI Brief' : 'AI 日报', title: isEn ? 'Open-Source Local Whisper + FFmpeg Rough-Cut Pipelines' : '开源离线转写 + 自动删口误粗剪成为创作者标配', meta: 'Obsidian · 2026-11-24 · Read-only', score: isEn ? 'Value 9.1 · Resonance 8.4 · Pace 8.9' : '价值 9.1 · 共鸣 8.4 · 节奏 8.9' },
        { cat: 'bench', tag: '3.8×', title: isEn ? 'Zero-API-Cost Content Factory Using Gemini CLI + Obsidian' : '零 API 费内容工厂：Gemini CLI 直读 Obsidian 写口播稿', meta: 'Bilibili · 94k views · 3.8× median', score: isEn ? 'Value 9.3 · Resonance 8.9 · Pace 8.5' : '价值 9.3 · 共鸣 8.9 · 节奏 8.5' },
        { cat: 'daily', tag: isEn ? 'Builder' : '搞钱日报', title: isEn ? 'Open-Source Tools Winning Distribution With Live Interactive Demos' : '开源工具怎么靠「免注册在线 Demo + AI 一键部署」拿 Star', meta: 'Saved · Deep Read attached', score: isEn ? 'Value 8.9 · Resonance 9.2 · Pace 8.7' : '价值 8.9 · 共鸣 9.2 · 节奏 8.7' },
      ].filter(x => activeTopicFilter === 'all' || x.cat === activeTopicFilter);
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Topic Sourcing & 3-Axis Audit' : '日报 · 对标爆款 · 三路审稿'}</div>
          <div class="pv-chips">
            <button type="button" class="pv-chip ${activeTopicFilter === 'all' ? 'on' : ''}" data-tf="all">${isEn ? 'All (4)' : '全部 (4)'}</button>
            <button type="button" class="pv-chip ${activeTopicFilter === 'bench' ? 'on' : ''}" data-tf="bench">${isEn ? 'Breakouts 3×+' : '对标爆款 3×+'}</button>
            <button type="button" class="pv-chip ${activeTopicFilter === 'daily' ? 'on' : ''}" data-tf="daily">${isEn ? 'Daily Briefs' : 'Obsidian 日报'}</button>
          </div>
        </div>
        <div class="pv-grid-2">
          ${items.map(it => `
            <div class="pv-card">
              <div class="pv-card-top"><span class="pv-tag">${it.tag}</span><span class="pv-meta">${it.meta}</span></div>
              <h4>${it.title}</h4>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
                <span class="pv-meta">${it.score}</span>
                <span class="pv-tag good">+ ${isEn ? 'Add to Pool' : '加入选题'}</span>
              </div>
            </div>`).join('')}
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
        ${activeCutMode === 'rough' ? `
          <div class="pv-card">
            <div class="pv-card-top"><b style="font-size:13px">${isEn ? 'mlx-whisper Transcript · Auto Retake & Pause Removal' : 'mlx-whisper 离线转写 · 自动标口误与长停顿'}</b><span class="pv-tag good">-16 LUFS · faststart</span></div>
            <div style="font-size:13px;line-height:1.9;color:#1F1F24">
              <span class="pv-meta">[00:00.4]</span> ${isEn ? 'If you publish to 7 platforms every week, ' : '如果你每周都要把一条视频发到 7 个平台，'}
              <span class="pv-strike">${isEn ? 'uhh wait let me rephrase that (1.8s pause) ' : '呃等一下我重新说这句（停顿 1.8s）'}</span>
              <b>${isEn ? 'you already know the real bottleneck is never filming.' : '你一定知道真正的瓶颈从来不是拍摄。'}</b><br>
              <span class="pv-meta">[00:09.2]</span> ${isEn ? 'Today I open-sourced my local studio that runs the whole pipeline with zero API fees.' : '今天我把自己每天用的本地内容中控完全开源了，零 API 费跑通找写剪发盘。'}
            </div>
          </div>` : `
          <table class="pv-table">
            <thead><tr><th>${isEn ? 'Timecode' : '时间段'}</th><th>${isEn ? 'Voiceover' : '口播原句'}</th><th>${isEn ? 'Motion / Visual' : '画面与动效指令'}</th><th>${isEn ? 'Density' : '节奏'}</th></tr></thead>
            <tbody>
              <tr><td class="pv-meta">00:00–00:07</td><td><b>${isEn ? 'Hook: 7 platforms autofilled in 60s' : 'Hook：一期视频 60 秒填完 7 个平台'}</b></td><td><span class="pv-tag">Zoom-in Screen</span> Chrome CDP live fill</td><td><span class="pv-tag amber">High</span></td></tr>
              <tr><td class="pv-meta">00:07–00:22</td><td>${isEn ? 'Why local agents beat cloud SaaS credits' : '为什么本机 Coding Agent 比云端积分更省心'}</td><td><span class="pv-tag">Split Card</span> Obsidian → SQLite</td><td><span class="pv-tag">Medium</span></td></tr>
              <tr><td class="pv-meta">00:22–00:41</td><td>${isEn ? 'One unified directory spec for every agent' : '一套统一工程目录，所有 Agent 共用'}</td><td><span class="pv-tag good">Tree Reveal</span> final/上传/</td><td><span class="pv-tag">Medium</span></td></tr>
            </tbody>
          </table>`}`;
    }
    if (key === 'publish') {
      const plats = [
        { n: isEn ? 'Douyin' : '抖音', st: 'wait', txt: isEn ? 'Filled · Awaiting click' : '已填表 · 待你点发', note: 'JPEG proof saved' },
        { n: isEn ? 'Xiaohongshu' : '小红书', st: 'wait', txt: isEn ? 'Filled · Awaiting click' : '已填表 · 待你点发', note: '5 topics attached' },
        { n: 'Bilibili', st: 'good', txt: isEn ? 'Published · Synced' : '已发布 · 已回填链接', note: '21.6k views' },
        { n: isEn ? 'Channels' : '视频号', st: 'wait', txt: isEn ? 'Filled · Awaiting click' : '已填表 · 待你点发', note: 'Schedule verified' },
        { n: 'YouTube', st: 'good', txt: isEn ? 'Scheduled · Verified' : '已定时 · 回读一致', note: '16:9 cover ok' },
        { n: 'X', st: 'good', txt: isEn ? 'Published · UTM' : '已发布 · 带 UTM', note: '44.1k views' },
      ];
      return `
        <div class="pv-bar">
          <div class="pv-title">${isEn ? 'Dedicated Chrome CDP (:9333) · Safe 7-Platform Autofill' : '专用 Chrome CDP (:9333) · 7 平台安全填表闭环'}</div>
          <div class="pv-chips"><span class="pv-chip on">${isEn ? 'Guardrail: Never auto-click Publish on CN platforms' : '安全护栏：国内 4 平台严格只填不点发'}</span></div>
        </div>
        <div class="pv-grid-3">
          ${plats.map(p => `
            <div class="pv-card">
              <div class="pv-card-top"><b>${p.n}</b><span class="pv-tag ${p.st === 'good' ? 'good' : 'amber'}">${p.txt}</span></div>
              <div class="pv-meta">${p.note}</div>
            </div>`).join('')}
        </div>`;
    }
    // review
    return `
      <div class="pv-bar">
        <div class="pv-title">${isEn ? 'Day-1 / Day-3 / Day-7 Same-Age Cohort Review' : '1 / 3 / 7 天同龄复盘与抖音时长分析'}</div>
        <div class="pv-chips"><span class="pv-chip on">EP41 · +66% vs median</span></div>
      </div>
      <div class="pv-grid-2">
        <div class="pv-card">
          <div class="pv-card-top"><b>${isEn ? 'Day-1 Cross-Platform Cohort' : '发布 24h 全网同龄对比'}</b><span class="pv-tag good">+66.8%</span></div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;font-size:12px">
            <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>EP41 (${isEn ? 'Current' : '本期'})</span><b>114,060</b></div><div style="height:8px;border-radius:99px;background:#E8E8EE;overflow:hidden"><div style="width:92%;height:100%;background:#3E63DD;border-radius:99px"></div></div></div>
            <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>EP40 (${isEn ? 'Previous' : '上期'})</span><b>68,400</b></div><div style="height:8px;border-radius:99px;background:#E8E8EE;overflow:hidden"><div style="width:55%;height:100%;background:#A1A1AA;border-radius:99px"></div></div></div>
            <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>${isEn ? '30d Median' : '近 30 天中位数'}</span><b>61,200</b></div><div style="height:8px;border-radius:99px;background:#E8E8EE;overflow:hidden"><div style="width:49%;height:100%;background:#D4D4D8;border-radius:99px"></div></div></div>
          </div>
        </div>
        <div class="pv-card">
          <div class="pv-card-top"><b>${isEn ? 'Douyin Duration × Views Sweet Spot' : '抖音时长 × 播放黄金区间'}</b><span class="pv-meta">5–8 min</span></div>
          <svg viewBox="0 0 320 110" class="chart-svg">
            <line x1="20" y1="68" x2="305" y2="68" stroke="#D4D4D8" stroke-dasharray="4 3"/>
            <text x="305" y="62" text-anchor="end" style="fill:#71717A;font-size:9.5px">${isEn ? 'Median 24k' : '中位数 2.4万'}</text>
            ${[[48,84,5,'#3E63DD'],[86,74,5,'#3E63DD'],[134,58,6,'#3E63DD'],[168,32,8,'#D97706'],[195,22,9,'#D97706'],[228,44,6,'#3E63DD'],[272,78,5,'#3E63DD']].map(([x,y,r,c]) =>
              `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".86" stroke="#fff" stroke-width="1.5"/>`).join('')}
          </svg>
        </div>
      </div>`;
  }

  function renderStreamgraph() {
    const series = [
      { key: 'douyin',   label: lang === 'en' ? 'Douyin' : '抖音',     color: '#7C9BF5', vals: [18,22,20,28,26,34,39,32,36,41,38,44,42,46] },
      { key: 'bilibili', label: 'Bilibili',                            color: '#38BDF8', vals: [11,13,12,15,17,22,24,18,21,25,22,26,25,28] },
      { key: 'xhs',      label: lang === 'en' ? 'XHS' : '小红书',       color: '#F87171', vals: [9,10,13,12,16,19,17,15,18,20,19,22,21,23] },
      { key: 'x',        label: 'X',                                   color: '#A78BFA', vals: [7,9,8,11,12,14,16,13,15,17,16,19,18,20] },
      { key: 'wechat',   label: lang === 'en' ? 'WeChat' : '公众号',    color: '#3DD68C', vals: [6,7,8,8,10,11,12,10,11,13,12,14,13,15] },
      { key: 'channels', label: lang === 'en' ? 'Channels' : '视频号',  color: '#F5A524', vals: [5,6,6,7,9,10,11,9,10,12,11,13,12,14] },
    ];
    const W = 880, H = 220, n = 14, splitX = W * (9.5 / (n - 1));
    const totals = Array.from({ length: n }, (_, i) => series.reduce((s, sr) => s + sr.vals[i], 0));
    const maxT = Math.max(...totals) * 1.12;
    const X = i => 14 + (i / (n - 1)) * (W - 28);
    const scaleY = v => (v / maxT) * (H - 48);

    const smoothPath = pts => {
      let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const mx = ((x0 + x1) / 2).toFixed(1);
        d += ` C ${mx} ${y0.toFixed(1)}, ${mx} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      return d;
    };

    const cumBottom = Array.from({ length: n }, (_, i) => (H - 22) / 2 + scaleY(totals[i]) / 2);
    const paths = series.map(sr => {
      const topPts = [];
      const botPts = [];
      for (let i = 0; i < n; i++) {
        const b = cumBottom[i];
        const t = b - scaleY(sr.vals[i]);
        botPts.push([X(i), b]);
        topPts.push([X(i), t]);
        cumBottom[i] = t;
      }
      const d = `${smoothPath(topPts)} L ${botPts[n - 1][0].toFixed(1)} ${botPts[n - 1][1].toFixed(1)} ${smoothPath([...botPts].reverse()).replace(/^M/, 'L')} Z`;
      const dim = activeStreamFilter && activeStreamFilter !== sr.key;
      return `<path d="${d}" fill="${sr.color}" fill-opacity="${dim ? 0.16 : 0.88}" data-tip="${sr.label} · ${lang === 'en' ? 'Peak' : '峰值'} +${Math.max(...sr.vals) * 40}/mo" style="transition:fill-opacity .2s"/>`;
    }).join('');

    const months = lang === 'en'
      ? ['Feb', 'May', 'Aug', 'Nov', 'Feb', 'May']
      : ['2月', '5月', '8月', '11月', '2月', '5月'];
    const mXs = [90, 240, 390, 560, 710, 830];

    return {
      legend: series.map(sr => `<button type="button" class="legend-btn ${activeStreamFilter && activeStreamFilter !== sr.key ? 'dim' : ''}" data-sf="${sr.key}"><i class="ldot" style="background:${sr.color}"></i>${sr.label}</button>`).join(''),
      svg: `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">
        <defs>
          <clipPath id="stPast"><rect x="0" y="0" width="${splitX.toFixed(1)}" height="${H}"/></clipPath>
          <clipPath id="stFut"><rect x="${splitX.toFixed(1)}" y="0" width="${(W - splitX).toFixed(1)}" height="${H}"/></clipPath>
        </defs>
        <g clip-path="url(#stPast)">${paths}</g>
        <g clip-path="url(#stFut)" opacity="0.42">${paths}</g>
        <line x1="${splitX.toFixed(1)}" x2="${splitX.toFixed(1)}" y1="10" y2="${H - 26}" stroke="rgba(255,255,255,.32)" stroke-dasharray="4 4"/>
        ${months.map((m, idx) => `<text x="${mXs[idx]}" y="${H - 4}" text-anchor="middle">${m}</text>`).join('')}
      </svg>`,
    };
  }

  function renderSankey() {
    const isEn = lang === 'en';
    const L = [
      { y: 18, h: 48, lbl: isEn ? 'AI Briefs' : 'AI 日报', c: '#7C9BF5' },
      { y: 78, h: 42, lbl: isEn ? 'Breakouts' : '对标拆解', c: '#A78BFA' },
      { y: 132, h: 36, lbl: 'Obsidian', c: '#3DD68C' },
    ];
    const R = [
      { y: 14, h: 44, lbl: isEn ? 'Douyin' : '抖音', c: '#EDEDED' },
      { y: 66, h: 34, lbl: 'Bilibili', c: '#38BDF8' },
      { y: 108, h: 28, lbl: isEn ? 'XHS' : '小红书', c: '#F87171' },
      { y: 144, h: 28, lbl: 'YouTube / X', c: '#F5A524' },
    ];
    const flows = [
      [0, 0, 22], [0, 1, 14], [0, 3, 12],
      [1, 0, 16], [1, 2, 16], [1, 1, 10],
      [2, 1, 10], [2, 2, 12], [2, 3, 14],
    ];
    const lOff = L.map(x => x.y), rOff = R.map(x => x.y);
    const bands = flows.map(([li, ri, w]) => {
      const y1 = lOff[li] + w / 2; lOff[li] += w;
      const y2 = rOff[ri] + w / 2; rOff[ri] += w;
      return `<path d="M 96 ${y1} C 190 ${y1}, 210 ${y2}, 304 ${y2}" fill="none" stroke="${L[li].c}" stroke-width="${w * 0.72}" stroke-opacity=".28" data-tip="${L[li].lbl} → ${R[ri].lbl}"/>`;
    }).join('');
    return `<svg viewBox="0 0 420 186" class="chart-svg">
      ${bands}
      ${L.map(n => `<rect x="84" y="${n.y}" width="10" height="${n.h}" rx="3" fill="${n.c}"/><text x="76" y="${n.y + n.h / 2 + 4}" text-anchor="end">${n.lbl}</text>`).join('')}
      ${R.map(n => `<rect x="306" y="${n.y}" width="10" height="${n.h}" rx="3" fill="${n.c}"/><text x="324" y="${n.y + n.h / 2 + 4}">${n.lbl}</text>`).join('')}
    </svg>`;
  }

  function renderRadar() {
    const cx = 150, cy = 96, R = 68;
    const cur = [0.65, 0.72, 0.68, 0.78, 0.84, 0.80, 0.92, 0.88, 0.86, 0.94, 0.90, 0.96];
    const prv = [0.44, 0.50, 0.48, 0.54, 0.58, 0.62, 0.60, 0.65, 0.61, 0.68, 0.64, 0.70];
    const poly = arr => arr.map((v, i) => {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      return `${(cx + Math.cos(a) * R * v).toFixed(1)},${(cy + Math.sin(a) * R * v).toFixed(1)}`;
    }).join(' ');
    const rings = [0.33, 0.66, 1].map(r => `<circle cx="${cx}" cy="${cy}" r="${(R * r).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.08)"/>`).join('');
    const labels = [1, 4, 7, 10].map((m, idx) => {
      const a = -Math.PI / 2 + (idx / 4) * Math.PI * 2;
      const x = cx + Math.cos(a) * (R + 14), y = cy + Math.sin(a) * (R + 14) + 3;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${lang === 'en' ? ['Jan','Apr','Jul','Oct'][idx] : m + '月'}</text>`;
    }).join('');
    return `<svg viewBox="0 0 300 192" class="chart-svg">
      ${rings}
      <polygon points="${poly(prv)}" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 3" stroke-width="1.3"/>
      <polygon points="${poly(cur)}" fill="rgba(124,155,245,.20)" stroke="#7C9BF5" stroke-width="2"/>
      ${labels}
    </svg>`;
  }

  function renderWaterfall() {
    const isEn = lang === 'en';
    const bars = [
      { lbl: isEn ? 'Median' : '中位数', y: 90, h: 66, val: '68.4k', c: '#C8C8CE' },
      { lbl: 'Hook', y: 66, h: 24, val: '+18.2k', c: '#3DD68C' },
      { lbl: isEn ? 'Pace' : '完播', y: 46, h: 20, val: '+14.8k', c: '#3DD68C' },
      { lbl: isEn ? '7-Plat' : '矩阵', y: 30, h: 16, val: '+12.6k', c: '#7C9BF5' },
      { lbl: 'EP41', y: 30, h: 126, val: '114.0k', c: '#EDEDED' },
    ];
    return `<svg viewBox="0 0 280 184" class="chart-svg">
      ${bars.map((b, i) => {
        const x = 14 + i * 52;
        return `<g data-tip="${b.lbl}: ${b.val}">
          <rect x="${x}" y="${b.y}" width="34" height="${b.h}" rx="5" fill="${b.c}" fill-opacity=".9"/>
          <text x="${x + 17}" y="${b.y - 6}" text-anchor="middle" style="fill:${b.c};font-size:10px">${b.val}</text>
          <text x="${x + 17}" y="174" text-anchor="middle">${b.lbl}</text>
        </g>`;
      }).join('')}
    </svg>`;
  }

  function renderBaseline() {
    const vals = [52, 64, 58, 76, 82, 69, 91, 108, 68, 114];
    const med = [54, 57, 58, 62, 65, 66, 69, 73, 72, 75];
    const linePts = med.map((v, i) => `${(20 + i * 26).toFixed(1)},${(156 - v * 1.1).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 280 184" class="chart-svg">
      ${vals.map((v, i) => {
        const x = 11 + i * 26, h = v * 1.1, y = 156 - h;
        return `<rect x="${x}" y="${y.toFixed(1)}" width="18" height="${h.toFixed(1)}" rx="4" fill="${i === 9 ? '#7C9BF5' : '#C8C8CE'}" fill-opacity="${i === 9 ? 0.95 : 0.72}" data-tip="EP${32 + i} · ${v}k"/>`;
      }).join('')}
      <polyline points="${linePts}" fill="none" stroke="#7C9BF5" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="16" y="174">EP32</text><text x="136" y="174">EP37</text><text x="242" y="174">EP41</text>
    </svg>`;
  }

  function renderHeatmap() {
    const cols = 42, rows = 7, cell = 15, gap = 5;
    const W = cols * (cell + gap), H = rows * (cell + gap) + 22;
    const tones = ['#202023', '#283152', '#3A4E8C', '#5674D1', '#7C9BF5'];
    let rects = '';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const seed = (c * 17 + r * 31 + (c % 5) * 7) % 13;
        const lv = seed < 5 ? 0 : seed < 8 ? 1 : seed < 10 ? 2 : seed < 12 ? 3 : 4;
        const x = c * (cell + gap), y = r * (cell + gap);
        const isToday = c === cols - 3 && r === 1;
        rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3.5" fill="${tones[lv]}" ${isToday ? 'stroke="#FF5A5F" stroke-width="1.5"' : ''} data-tip="W${c + 1} · ${lv ? lv + (lang === 'en' ? ' actions' : ' 次推进') : (lang === 'en' ? 'Rest day' : '休整日')}"/>`;
      }
    }
    const ms = lang === 'en' ? ['Jan','Mar','May','Jul','Sep','Nov'] : ['1月','3月','5月','7月','9月','11月'];
    const labels = ms.map((m, i) => `<text x="${i * (W / 6) + 8}" y="${H - 2}">${m}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">${rects}${labels}</svg>`;
  }

  function renderAll() {
    const t = I18N[lang];
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.title = t.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t.desc;

    const feat = t.features.tabs.find(x => x.key === activeFeat) || t.features.tabs[0];
    const dep = t.deploy.tabs.find(x => x.key === activeDeploy) || t.deploy.tabs[0];
    const stream = renderStreamgraph();

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
            <a class="nav-util" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">
              ${GH_SVG}<span id="ghStars">MIT</span>
            </a>
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
                    <div class="ms-item on"><span>${lang === 'en' ? 'Overview' : '中控大屏'}</span><span class="ms-cnt">7/7</span></div>
                    <div class="ms-item"><span>${lang === 'en' ? 'Topics' : '选题'}</span><span class="ms-cnt">12</span></div>
                    <div class="ms-item"><span>${lang === 'en' ? 'Cut' : '剪辑'}</span><span class="ms-cnt">EP42</span></div>
                    <div class="ms-item"><span>${lang === 'en' ? 'Publish' : '发布'}</span><span class="ms-cnt" style="color:var(--amber)">2</span></div>
                    <div class="ms-item"><span>${lang === 'en' ? 'Review' : '复盘'}</span><span class="ms-cnt">+66%</span></div>
                    <div class="ms-sec">${lang === 'en' ? 'Local Daemon' : '本机守护'}</div>
                    <div class="ms-up"><span>Chrome :9333</span><span style="color:var(--green)">Live</span></div>
                    <div class="ms-up"><span>Obsidian</span><span style="color:var(--green)">RO</span></div>
                    <div class="ms-up"><span>Gemini CLI</span><span>Ready</span></div>
                  </aside>
                  <div class="mac-main">
                    <div class="mm-head">
                      <h3>${lang === 'en' ? 'Overview' : '中控总览'}</h3>
                      <span class="mm-pill">● ${lang === 'en' ? 'Local SQLite · Zero API Fees' : '本机 SQLite · 零 API 费'}</span>
                    </div>
                    <div class="mm-hero-card">
                      <div>
                        <div class="mm-kpi-lbl">${lang === 'en' ? 'Total followers across 7 platforms' : '7 平台实测总粉丝'}</div>
                        <div class="mm-kpi-val">141,420</div>
                        <div class="mm-delta">↑ +2,840 · 30d</div>
                        <div class="mm-mini-grid">
                          <div><span>${lang === 'en' ? 'EP41 Day-1 views' : 'EP41 首日播放'}</span><b>114,060</b></div>
                          <div><span>${lang === 'en' ? 'Vs. median' : '较账号中位数'}</span><b style="color:var(--green)">+66.8%</b></div>
                          <div><span>${lang === 'en' ? 'Awaiting click' : '待你点发'}</span><b style="color:var(--amber)">2 plats</b></div>
                          <div><span>${lang === 'en' ? 'Daily brief' : '今日 AI 日报'}</span><b>28 items</b></div>
                        </div>
                      </div>
                      <div class="mm-bubbles">${buildHeroBubbles()}</div>
                    </div>
                    <div class="mm-timeline">
                      <div class="mm-tl-head"><span>${lang === 'en' ? 'EP41 · 7-Platform Publish Matrix' : 'EP41 · 7 平台发布闭环状态'}</span><span>${lang === 'en' ? '5 published · 2 awaiting human click' : '5 平台已发 · 2 平台待人工点发'}</span></div>
                      <div class="mm-tl-row">
                        <div class="mm-plat-pill ok"><b>${lang === 'en' ? 'Douyin' : '抖音'}</b><span>38.4k</span></div>
                        <div class="mm-plat-pill wait"><b>${lang === 'en' ? 'XHS' : '小红书'}</b><span>${lang === 'en' ? 'Filled' : '待点发'}</span></div>
                        <div class="mm-plat-pill ok"><b>B站</b><span>21.6k</span></div>
                        <div class="mm-plat-pill wait"><b>${lang === 'en' ? 'Channels' : '视频号'}</b><span>${lang === 'en' ? 'Filled' : '待点发'}</span></div>
                        <div class="mm-plat-pill ok"><b>YouTube</b><span>9.8k</span></div>
                        <div class="mm-plat-pill ok"><b>X</b><span>44.1k</span></div>
                        <div class="mm-plat-pill ok"><b>${lang === 'en' ? 'WeChat' : '公众号'}</b><span>${lang === 'en' ? 'Draft' : '草稿箱'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="float-card float-left">
                <div class="fl-head"><span>${lang === 'en' ? 'Breakout Radar' : '对标爆款雷达'}</span><span class="fl-badge">3×+</span></div>
                <div class="fl-item">
                  <b>${lang === 'en' ? 'Local Coding Agents Replace Paid SaaS Workflows' : '用本机 Coding Agent 替代所有收费工作流'}</b>
                  <small><span>Bilibili · 94k</span><span class="fl-mult">4.6×</span></small>
                </div>
                <div class="fl-item">
                  <b>${lang === 'en' ? '1 Script → 7 Platforms With Strict Human Guardrails' : '一条口播稿跑通 7 平台发布闭环'}</b>
                  <small><span>Douyin · 128k</span><span class="fl-mult">3.8×</span></small>
                </div>
              </div>

              <div class="float-card float-right">
                <div class="fr-head"><b>EP42 · ${lang === 'en' ? 'Publish Queue' : '发布护栏'}</b><span>CDP :9333</span></div>
                <div class="fr-rows">
                  <div class="fr-row"><span><i class="fr-dot wait"></i>${lang === 'en' ? 'Xiaohongshu · Draft filled' : '小红书 · 已传片填话题'}</span><span class="fr-tag">${lang === 'en' ? 'Click' : '待点发'}</span></div>
                  <div class="fr-row"><span><i class="fr-dot wait"></i>${lang === 'en' ? 'Channels · Schedule checked' : '视频号 · 已核对定时'}</span><span class="fr-tag">${lang === 'en' ? 'Click' : '待点发'}</span></div>
                  <div class="fr-row"><span><i class="fr-dot ok"></i>YouTube Studio · Verified</span><span class="fr-tag">19:00</span></div>
                </div>
                <div class="fr-foot"><span>🛡</span><span>${lang === 'en' ? 'CN platforms pause before final publish click' : '国内 4 平台严格只填不点发 · 存档提交前截图'}</span></div>
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
                <div class="eyebrow">${t.charts.eyebrow}</div>
                <h2>${t.charts.h2}</h2>
              </div>
              <div>
                <p>${t.charts.lead}</p>
                <a class="inline-link" href="${rel('docs/#privacy')}">${t.charts.link}</a>
              </div>
            </div>

            <div class="bento-stack">
              <div class="bcard">
                <div class="bcard-h">
                  <div><h3>${t.charts.streamTitle}</h3><p>${t.charts.streamSub}</p></div>
                  <div class="legend">${stream.legend}</div>
                </div>
                ${stream.svg}
              </div>

              <div class="bento-2">
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.charts.sankeyTitle}</h3><p>${t.charts.sankeySub}</p></div></div>
                  ${renderSankey()}
                </div>
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.charts.radarTitle}</h3><p>${t.charts.radarSub}</p></div></div>
                  ${renderRadar()}
                </div>
              </div>

              <div class="bento-3">
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.charts.bubbleTitle}</h3><p>${t.charts.bubbleSub}</p></div></div>
                  ${buildHeroBubbles()}
                  <div class="globe-legend">
                    <span><b>${lang === 'en' ? 'Douyin' : '抖音'}</b>31%</span><span><b>Bilibili</b>17%</span>
                    <span><b>${lang === 'en' ? 'WeChat' : '公众号'}</b>14%</span><span><b>X</b>12%</span>
                    <span><b>${lang === 'en' ? 'XHS' : '小红书'}</b>11%</span><span><b>YouTube</b>7%</span>
                  </div>
                </div>
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.charts.waterfallTitle}</h3><p>${t.charts.waterfallSub}</p></div><div class="bcard-stat">+66.8%</div></div>
                  ${renderWaterfall()}
                </div>
                <div class="bcard">
                  <div class="bcard-h"><div><h3>${t.charts.baselineTitle}</h3><p>${t.charts.baselineSub}</p></div></div>
                  ${renderBaseline()}
                </div>
              </div>

              <div class="bcard">
                <div class="bcard-h"><div><h3>${t.charts.heatTitle}</h3><p>${t.charts.heatSub}</p></div></div>
                ${renderHeatmap()}
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
                    <ul class="ai-list">
                      ${t.ai.leftList.map(li => `<li><span class="ai-check">✓</span><span>${li}</span></li>`).join('')}
                    </ul>
                    <a class="inline-link" href="${rel('docs/#topic')}">${t.ai.leftLink}</a>
                  </div>
                  <div class="audit-mock">
                    <div style="display:flex;justify-content:space-between;color:var(--label-3);font-family:var(--mono);font-size:11px"><span>3-AXIS AUDIT</span><span style="color:var(--green)">Gemini CLI</span></div>
                    <div class="audit-score-row">
                      <div class="audit-score"><span>${lang === 'en' ? 'Value' : '价值'}</span><b>9.2</b></div>
                      <div class="audit-score"><span>${lang === 'en' ? 'Resonance' : '共鸣'}</span><b>8.8</b></div>
                      <div class="audit-score"><span>${lang === 'en' ? 'Pacing' : '节奏'}</span><b>8.6</b></div>
                    </div>
                    <div class="audit-diff">
                      <b>${lang === 'en' ? 'Suggested Hook Rewrite:' : '最小改法建议：'}</b><br>
                      ${lang === 'en' ? 'Lead with the 60-second autofill clip instead of background context.' : '删掉前 18 秒背景铺垫，第一句直接抛「60 秒自动填完 7 个平台」结果画面。'}
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
                  <div class="dir-box"><b>2026-11-24_EP42/final/上传/</b><br>├── 视频（5平台通用）.mp4 <em>faststart</em><br>├── 竖封面（抖音、视频号）.png<br>├── 横封面（抖音、小红书）.png<br>├── 16比9封面（B站、YouTube）.png<br>└── 文案.txt · publish.json <em>✓ Ready</em></div>
                </div>
                <div class="ai-foot">
                  <a class="inline-link" href="${rel('docs/#directory')}">${t.ai.rightLink}</a>
                </div>
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
              <div class="deploy-note">
                <span class="rec-tag">${dep.rec}</span>
                <span>${dep.note}</span>
              </div>
              <div class="term">
                <div class="term-h">
                  <div class="term-dots"><i></i><i></i><i></i></div>
                  <button type="button" class="copy-btn" id="copyDeployBtn">${t.deploy.copy}</button>
                </div>
                <pre id="deployCode"></pre>
              </div>
              <div class="deploy-foot">
                <span>${dep.foot}</span>
                <a class="btn-pill solid" href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${t.deploy.ghCta} →</a>
              </div>
              <div class="deploy-bridge">
                <span>${t.deploy.bridgeText}</span>
                <a class="inline-link" style="color:var(--accent)" href="#community">${t.deploy.bridgeLink}</a>
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
                  <div class="biz-note">${t.community.c1Note}</div>
                  <div class="biz-actions">
                    <button type="button" class="btn-pill ghost lg" style="width:100%" data-open-wx="group">${t.community.c1Cta}</button>
                  </div>
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
                  <div class="biz-actions">
                    <button type="button" class="btn-pill solid lg" style="width:100%" data-open-wx="custom">${t.community.c2Cta}</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="qr-strip">
              <div class="qr-thumb-box" data-open-wx="group" title="${lang === 'en' ? 'Click to enlarge QR' : '点击放大二维码'}">
                <img src="${rel('assets/park-wechat-qr.jpg')}" alt="Park WeChat QR Code">
              </div>
              <div>
                <h4>${t.community.qrTitle}</h4>
                <p>${t.community.qrDesc}</p>
                <div class="qr-tags">
                  <span class="qr-tag">${lang === 'en' ? 'Note: 199 Group' : '入群备注：199进群'}</span>
                  <span class="qr-tag">${lang === 'en' ? 'Note: Custom (¥10,000+)' : '定制备注：定制（¥10,000 起）'}</span>
                  <span class="qr-tag">Park · ${lang === 'en' ? 'Singapore' : '新加坡'}</span>
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
            <div>
              <a class="brand" href="#top">${BRAND_SVG}<span>Park Studio</span></a>
              <p class="foot-desc">${t.foot.desc}</p>
            </div>
            ${t.foot.cols.map(col => `
              <div>
                <h4>${col.h}</h4>
                <ul>${col.links.map(([lbl, href]) => `<li><a href="${rel(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${lbl}</a></li>`).join('')}</ul>
              </div>`).join('')}
          </div>
          <div class="colophon">
            <span>${t.foot.colophon}</span>
            <span>${t.foot.license}</span>
          </div>
        </div>
      </footer>
      ${renderWeChatModal()}
    `;

    document.getElementById('deployCode').textContent = dep.code;

    // Bindings
    document.getElementById('langBtn').onclick = () => {
      lang = lang === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('ps:site:lang', lang); } catch (e) {}
      renderAll();
    };
    document.querySelectorAll('[data-feat]').forEach(btn => {
      btn.onclick = () => { activeFeat = btn.dataset.feat; renderAll(); };
    });
    document.querySelectorAll('[data-dep]').forEach(btn => {
      btn.onclick = () => { activeDeploy = btn.dataset.dep; renderAll(); };
    });
    document.querySelectorAll('[data-sf]').forEach(btn => {
      btn.onclick = () => {
        activeStreamFilter = activeStreamFilter === btn.dataset.sf ? null : btn.dataset.sf;
        renderAll();
      };
    });
    document.querySelectorAll('[data-tf]').forEach(btn => {
      btn.onclick = () => { activeTopicFilter = btn.dataset.tf; renderAll(); };
    });
    document.querySelectorAll('[data-cm]').forEach(btn => {
      btn.onclick = () => { activeCutMode = btn.dataset.cm; renderAll(); };
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
        cBtn.textContent = lang === 'en' ? 'Copied ✓' : '已复制 ✓';
        cBtn.classList.add('ok');
        setTimeout(() => { cBtn.textContent = lang === 'en' ? 'Copy' : '复制'; cBtn.classList.remove('ok'); }, 1600);
      };
    }

    updateStarsText();
    setupScrollspy();
  }

  let cachedStars = null;
  function updateStarsText() {
    const el = document.getElementById('ghStars');
    if (el && cachedStars != null) el.textContent = String(cachedStars);
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
    if (e.key === 'Escape' && wxModalMode) { wxModalMode = null; renderAll(); }
  });

  // Hover tooltips for live SVG charts
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
