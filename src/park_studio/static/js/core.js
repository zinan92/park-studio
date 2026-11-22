/* Park Studio 核心框架 v2 — 严格对齐线上版四大工作台 [ 选题 | 剪辑 | 发布 | 复盘 ] + 极简底部设置浮层 */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const STORE_KEY = 'park-studio:state:v2';

  PS.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PS.fmt = n => (n == null || isNaN(n)) ? '–' : Math.round(n).toLocaleString('en-US');
  PS.kfmt = n => (n == null || isNaN(n)) ? '–' : n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}万` : PS.fmt(n);
  PS.sgn = n => (n == null ? '–' : (n > 0 ? '+' : '') + PS.fmt(n));
  PS.pct = (a, b, d = 1) => b ? `${((a / b) * 100).toFixed(d)}%` : '–';

  PS.loadState = function () {
    const def = PS.defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...def,
          ...parsed,
          settings: { ...def.settings, ...(parsed.settings || {}), modules: { ...def.settings.modules, ...(parsed.settings?.modules || {}) } },
          daemon: { ...def.daemon, ...(parsed.daemon || {}) },
          releases: parsed.releases || def.releases,
        };
      }
    } catch (e) {}
    return def;
  };
  PS.S = PS.loadState();
  PS.save = function () {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(PS.S)); } catch (e) {}
  };
  PS.resetDemo = function () {
    localStorage.removeItem(STORE_KEY);
    PS.S = PS.defaultState();
    PS.save();
    PS.toast('已重置为初始演示数据', 'good');
    PS.route();
  };

  PS.fanStats = function (p) {
    const map = PS.S.followers[p] || {};
    const days = Object.keys(map).sort();
    if (!days.length) return { total: 0, today: 0, d7: 0, d30: 0 };
    const last = map[days[days.length - 1]];
    const prev = days.length > 1 ? map[days[days.length - 2]] : last;
    const d7 = map[days[Math.max(0, days.length - 8)]] ?? last;
    const d30 = map[days[0]] ?? last;
    return { total: last, today: last - prev, d7: last - d7, d30: last - d30 };
  };
  PS.activePlats = () => PS.PLAT_ORDER.filter(id => !PS.S.platformStatus[id]?.disabled);

  PS.toast = function (msg, kind = 'good') {
    const host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, 2800);
  };

  PS.modal = function ({ title, body, foot = '', wide = false, onOpen }) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}">
      <div class="modal-h"><h3>${PS.esc(title)}</h3><button class="btn ghost icon" data-x>${PS.icon('x')}</button></div>
      <div class="modal-b">${body}</div>
      ${foot ? `<div class="modal-f">${foot}</div>` : ''}
    </div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x],[data-close]')) close(); });
    document.body.appendChild(bg);
    if (onOpen) onOpen(bg, close);
    return close;
  };

  PS.toggleTheme = function () {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    try { localStorage.setItem('ps:theme', cur); } catch (e) {}
    PS.toast(cur === 'dark' ? '已切换深色模式' : '已切换浅色模式');
  };

  // 四大工作台定义（与线上版完全一致，只显示当前阶段的 3-4 项！）
  const WS_META = {
    topic:   { name: '选题', sub: '选题工作台', def: '#source' },
    cut:     { name: '剪辑', sub: '剪辑工作台', def: '#cut' },
    publish: { name: '发布', sub: '发布工作台', def: '#pub-confirm' },
    review:  { name: '复盘', sub: '复盘工作台', def: '#dashboard' },
  };

  function wsOf(active) {
    if (['home', 'source', 'feed', 'chai', 'pool', 'write', 'audit', 'scripts', 'done'].includes(active)) return 'topic';
    if (['cut-todo', 'cut', 'cut-done'].includes(active)) return 'cut';
    if (['pub-todo', 'pub-pack', 'pub-confirm', 'pub-sent'].includes(active)) return 'publish';
    if (['dashboard', 'review', 'conversion'].includes(active)) return 'review';
    return PS._lastWs || 'topic';
  }

  function railNavItems(ws, active) {
    const ep41 = PS.S.episodes.find(e => e.episode === 41);
    const waitN = ep41 ? Object.values(ep41.tasks).filter(t => t.state === 'awaiting_user').length : 0;
    const poolN = PS.S.topics.filter(t => !t.trash && ['找', '写', '审'].includes(t.stage)).length;
    const doneN = PS.S.episodes.filter(e => e.finalAt).length;

    if (ws === 'topic') {
      return `
        <a class="navi ${active === 'home' ? 'on' : ''}" href="#home"><span><i class="st-b">今</i>今天想干什么</span></a>
        <a class="navi ${['source', 'feed', 'chai'].includes(active) ? 'on' : ''}" href="#source"><span><i class="st-b">找</i>日报 · 对标</span></a>
        <a class="navi ${['pool', 'write', 'audit'].includes(active) ? 'on' : ''}" href="#pool"><span><i class="st-b live">写</i>选题池</span><span class="count">${poolN}</span></a>
        <a class="navi ${['scripts', 'done'].includes(active) ? 'on' : ''}" href="#scripts"><span><i class="st-b">定</i>定稿</span><span class="count">${doneN}</span></a>
      `;
    }
    if (ws === 'cut') {
      return `
        <a class="rail-now" href="#cut"><small>正在剪 · EP${PS.S.cutProject.episode}</small><b>${PS.esc(PS.S.cutProject.title)}</b></a>
        <a class="navi ${active === 'cut-todo' ? 'on' : ''}" href="#cut-todo"><span><i class="st-b">待</i>待剪</span><span class="count">1</span></a>
        <a class="navi ${active === 'cut' ? 'on' : ''}" href="#cut"><span><i class="st-b hot">剪</i>剪辑中</span><span class="count hot">镜头表</span></a>
        <a class="navi ${active === 'cut-done' ? 'on' : ''}" href="#cut-done"><span><i class="st-b live">好</i>剪好了</span><span class="count">3</span></a>
      `;
    }
    if (ws === 'publish') {
      return `
        <a class="navi ${active === 'pub-todo' ? 'on' : ''}" href="#pub-todo"><span><i class="st-b">待</i>待发</span><span class="count">1</span></a>
        <a class="navi ${active === 'pub-pack' ? 'on' : ''}" href="#pub-pack"><span><i class="st-b">包</i>打包</span></a>
        <a class="navi ${active === 'pub-confirm' ? 'on' : ''}" href="#pub-confirm"><span><i class="st-b hot">确</i>确认</span>${waitN ? `<span class="count hot">${waitN} 待点发</span>` : ''}</a>
        <a class="navi ${active === 'pub-sent' ? 'on' : ''}" href="#pub-sent"><span><i class="st-b live">已</i>已发</span><span class="count">3</span></a>
      `;
    }
    return `
      <a class="navi ${active === 'dashboard' ? 'on' : ''}" href="#dashboard"><span><i class="st-b live">盘</i>运营大屏</span></a>
      <a class="navi ${active === 'review' ? 'on' : ''}" href="#review"><span><i class="st-b">析</i>同龄复盘 · 抖音分析</span></a>
      ${PS.S.settings.modules.conversion ? `<a class="navi ${active === 'conversion' ? 'on' : ''}" href="#conversion"><span><i class="st-b">转</i>转化归因</span></a>` : ''}
    `;
  }

  // ⌘K 完整跨工作台索引
  PS.cmdk = function () {
    const items = [
      { label: '首页 · 今天想干什么？', kind: '选题', hash: '#home' },
      { label: '日报 · 对标（AI 日报 / 搞钱 / 开发 / 爆款榜 / Obsidian）', kind: '选题', hash: '#source' },
      { label: '爆款榜 · 按几倍平时排', kind: '选题', hash: '#feed' },
      { label: '拆解报告', kind: '选题', hash: '#chai' },
      { label: '选题池 & 写稿骨架', kind: '选题', hash: '#pool' },
      { label: '审稿 / 改写（三路诊断）', kind: '选题', hash: '#audit' },
      { label: '定稿', kind: '选题', hash: '#scripts' },
      { label: '待剪', kind: '剪辑', hash: '#cut-todo' },
      { label: '剪辑中 · Hook / 镜头表 Spec Table / 交给 Agent', kind: '剪辑', hash: '#cut' },
      { label: '剪好了', kind: '剪辑', hash: '#cut-done' },
      { label: '待发 · 排期', kind: '发布', hash: '#pub-todo' },
      { label: '打包 · publish.json', kind: '发布', hash: '#pub-pack' },
      { label: '确认 · 专用 Chrome 自动填表', kind: '发布', hash: '#pub-confirm' },
      { label: '已发 · 7 平台矩阵与分发日历', kind: '发布', hash: '#pub-sent' },
      { label: '运营大屏 · 全平台粉丝与人话结论', kind: '复盘', hash: '#dashboard' },
      { label: '1/3/7 天同龄复盘 & 抖音作品分析', kind: '复盘', hash: '#review' },
      { label: '转化归因 · 自有站点漏斗', kind: '复盘', hash: '#conversion' },
      { label: '知识树 & 一键内化', kind: '资产', hash: '#tree' },
      { label: '我说过的话', kind: '资产', hash: '#said' },
      { label: '咨询客户 CRM', kind: '资产', hash: '#clients' },
      { label: '个人网站', kind: '资产', hash: '#site' },
      { label: '我的定位', kind: '定位', hash: '#position' },
      { label: '系统 · 守护进程 / 7 平台体检 / 集成与共享对标库', kind: '系统', hash: '#settings' },
      { label: '上新 · 版本更新与开源动态', kind: '系统', hash: '#releases' },
    ];
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="cmdk-box"><input type="search" placeholder="搜索页面、选题和作品…" autofocus><ul class="cmdk-list"></ul></div>`;
    const inp = bg.querySelector('input'), ul = bg.querySelector('ul');
    let list = items, idx = 0;
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      list = items.filter(x => !q || x.label.toLowerCase().includes(q) || x.kind.toLowerCase().includes(q)).slice(0, 14);
      idx = Math.min(idx, Math.max(0, list.length - 1));
      ul.innerHTML = list.length ? list.map((x, i) => `<li class="${i === idx ? 'on' : ''}" data-i="${i}"><span>${PS.esc(x.label)}</span><small class="sub">${PS.esc(x.kind)}</small></li>`).join('') : '<li class="sub">没有匹配的页面</li>';
    };
    const pick = i => { const x = list[i]; if (!x) return; bg.remove(); location.hash = x.hash; };
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
  };

  // Tooltip & 快捷键
  document.addEventListener('mousemove', e => {
    const t = e.target.closest?.('[data-tip]');
    const el = document.getElementById('tip');
    if (!el) return;
    if (!t) { el.style.display = 'none'; return; }
    el.textContent = t.dataset.tip;
    el.style.display = 'block';
    el.style.left = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 14, e.clientX + 14)) + 'px';
    el.style.top = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 14, e.clientY + 14)) + 'px';
  });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); PS.cmdk(); }
  });

  // Wendy 右侧抽屉
  PS.wendyOpen = false;
  PS.toggleWendy = function (force) {
    PS.wendyOpen = typeof force === 'boolean' ? force : !PS.wendyOpen;
    document.getElementById('wendyDrawer')?.classList.toggle('open', PS.wendyOpen);
  };
  function renderWendyDrawer() {
    const msgs = PS.S.wendyMsgs.map(m => `<div class="wd-msg ${m.role}">
      <div>${PS.esc(m.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>
      ${m.card ? `<div class="wd-card"><div style="font-weight:700;font-size:12.5px">${PS.esc(m.card.title)}</div><div class="sub" style="margin:3px 0 8px">${PS.esc(m.card.desc)}</div><a class="btn primary s" href="${m.card.hash}" onclick="PS.toggleWendy(false)">${PS.esc(m.card.btn)}</a></div>` : ''}
    </div>`).join('');
    return `<aside class="wendy-drawer ${PS.wendyOpen ? 'open' : ''}" id="wendyDrawer">
      <div class="wd-head">
        <span class="wendy-av">W</span>
        <div class="min0 grow"><b style="font-size:14px">Wendy · 本地助理</b><div class="sub" style="font-size:11.5px">${PS.S.settings.aiBackend === 'gemini' ? `本机 Gemini CLI (${PS.S.settings.aiModel || 'default'})` : PS.S.settings.aiBackend === 'claude' ? '本机 Claude Code CLI' : PS.S.settings.aiBackend === 'codex' ? '本机 Codex CLI' : '自定义 API'}</div></div>
        <button class="btn ghost icon" id="wdClose">${PS.icon('x')}</button>
      </div>
      <div class="wd-msgs" id="wdMsgs">${msgs}</div>
      <div class="wd-chips">
        <button class="wd-chip" data-wq="EP41 还差哪几个平台没点发？">EP41 差哪几个没发？</button>
        <button class="wd-chip" data-wq="帮我把 EP42 的剪辑镜头表密度调高一档">调整 EP42 镜头表</button>
        <button class="wd-chip" data-wq="看近 7 天哪个平台涨粉最快">近 7 天涨粉归因</button>
      </div>
      <form class="wd-in" id="wdForm"><input type="text" id="wdInput" placeholder="问 Wendy…"><button class="btn primary" type="submit">发</button></form>
    </aside>`;
  }
  function bindWendy() {
    document.getElementById('wdClose')?.addEventListener('click', () => PS.toggleWendy(false));
    document.querySelectorAll('[data-wq]').forEach(b => b.onclick = () => {
      const q = b.dataset.wq;
      PS.S.wendyMsgs.push({ role: 'me', text: q });
      let reply = { role: 'ai', text: `已收到「${q}」，我已为你定位到对应工作台。`, card: null };
      if (q.includes('EP41')) reply = { role: 'ai', text: 'EP41 目前 **小红书** 和 **视频号** 已由专用 Chrome 填表完毕，只等你点最后一下发布。', card: { title: '去发布工作台 · 确认', desc: '点发后自动取链回填', hash: '#pub-confirm', btn: '打开确认页' } };
      else if (q.includes('镜头表')) reply = { role: 'ai', text: '已准备把 EP42 的动效镜头表调到「高」密度，点下面直接进入剪辑台核对。', card: { title: '打开剪辑 · 镜头表', desc: 'EP42 当前 6 个动效镜头', hash: '#cut', btn: '去镜头表' } };
      else if (q.includes('7 天')) reply = { role: 'ai', text: '近 7 天全网涨粉最多的是 **抖音 (+673)** 和 **小红书 (+490)**，EP41 首日播放是上期同龄的 **1.7 倍**。', card: { title: '打开复盘 · 运营大屏', desc: '查看堆叠涨粉图与转化归因', hash: '#dashboard', btn: '看大屏' } };
      PS.S.wendyMsgs.push(reply);
      PS.save();
      document.getElementById('wendyDrawer').outerHTML = renderWendyDrawer();
      bindWendy();
    });
    document.getElementById('wdForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const inp = document.getElementById('wdInput');
      const v = inp.value.trim();
      if (!v) return;
      inp.value = '';
      PS.S.wendyMsgs.push({ role: 'me', text: v });
      PS.S.wendyMsgs.push({ role: 'ai', text: `正在调用本机 ${PS.S.settings.aiBackend} (${PS.S.settings.aiModel || '默认'}) 思考中…` });
      document.getElementById('wendyDrawer').outerHTML = renderWendyDrawer();
      bindWendy();
      try {
        const res = await PS.api('POST', '/api/ai/wendy', { prompt: v });
        PS.S.wendyMsgs[PS.S.wendyMsgs.length - 1] = { role: 'ai', text: `${res.reply}\n\n_(来自本机 ${res.backend}/${res.model})_` };
      } catch (err) {
        PS.S.wendyMsgs[PS.S.wendyMsgs.length - 1] = { role: 'ai', text: `调用本机 AI 失败：${err.message}` };
      }
      PS.save();
      document.getElementById('wendyDrawer').outerHTML = renderWendyDrawer();
      bindWendy();
    });
  }

  // 主外框 Shell（widthMode: '' | 'mid' | 'narrow'）
  PS.shell = function (active, crumbs, inner, widthMode = '') {
    const ws = wsOf(active);
    PS._lastWs = ws;
    const onlineN = PS.activePlats().filter(p => PS.S.platformStatus[p]?.state === 'ok').length;
    const activeN = PS.activePlats().length;
    const unread = PS.S.notifications.filter(n => !n.read).length;
    const isApp = PS.S.meta.runtimeMode === 'desktop-app';
    const crumbHTML = crumbs.map((c, i) =>
      i < crumbs.length - 1 ? `<a href="${c[1]}">${PS.esc(c[0])}</a>${PS.icon('right', 'sm')}` : `<b>${PS.esc(c[0])}</b>`
    ).join('');

    document.getElementById('app').innerHTML = `
      <div class="app">
        <aside class="side" id="side">
          <a class="rail-brand" href="#position" title="我的定位 · 我是谁 / 卖什么">
            <svg class="brand-mark" viewBox="0 0 120 120" aria-hidden="true">
              <path class="bm1" d="M14 66 Q30 28 48 86" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
              <path class="bm2" d="M48 86 Q76 88 106 22" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
              <circle class="bm3" cx="48" cy="86" r="9"/>
            </svg>
            <span class="brand-t">
              <b>Park Studio</b>
              <small>${PS.esc(WS_META[ws].sub)}</small>
            </span>
          </a>

          <div class="ws-tabs" role="tablist" aria-label="四大工作台">
            ${Object.entries(WS_META).map(([k, v]) => `<button type="button" class="ws-tab ${ws === k ? 'on' : ''}" data-ws="${k}">${v.name}</button>`).join('')}
          </div>

          <button type="button" class="rail-search" id="railSearch">
            <span>搜索页面和选题</span><kbd>⌘K</kbd>
          </button>

          <nav aria-label="当前工作台导航">
            ${railNavItems(ws, active)}
          </nav>

          <div class="rail-foot" id="railFoot">
            <a class="rail-daemon" href="#settings">
              <span class="dot ${PS.S.daemon.running ? 'live' : 'bad'}"></span>
              <span>系统 · ${onlineN}/${activeN} 平台在线</span>
            </a>
            <div class="rail-foot-row">
              <button type="button" class="rail-set-btn" id="setPopBtn"><span>系统与更多</span>${PS.icon('right', 'sm')}</button>
              <button type="button" class="theme-btn" id="themeBtn" title="切换深浅色">◐</button>
            </div>
          </div>
        </aside>

        <div class="main">
          <header class="topbar" id="topbar">
            <button class="btn ghost icon burger" id="burger">${PS.icon('menu')}</button>
            <div class="crumbs">${crumbHTML}</div>
            <button type="button" class="top-pill" id="runtimeBtn" title="切换预览浏览器 localhost / 桌面原生 App 形态">
              <i class="dot live"></i>
              <span>${isApp ? '桌面 App' : `Localhost :${location.port || 8792}`}</span>
            </button>
            <button type="button" class="top-pill" id="wendyBtn"><span class="wendy-av">W</span><span>问 Wendy</span></button>
            <div class="rel">
              <button class="btn ghost icon rel" id="bellBtn" aria-label="通知">${PS.icon('bell', 'lg')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
            </div>
          </header>
          <main class="page ${widthMode}" id="main">${inner}</main>
        </div>
      </div>
      ${renderWendyDrawer()}
    `;

    document.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => {
      location.hash = WS_META[b.dataset.ws].def;
    });
    document.getElementById('railSearch').onclick = () => PS.cmdk();
    document.getElementById('themeBtn').onclick = () => PS.toggleTheme();
    document.getElementById('wendyBtn').onclick = () => PS.toggleWendy();
    document.getElementById('burger').onclick = () => document.getElementById('side').classList.toggle('open');
    document.getElementById('runtimeBtn').onclick = () => {
      PS.S.meta.runtimeMode = isApp ? 'localhost' : 'desktop-app';
      PS.save();
      PS.toast(PS.S.meta.runtimeMode === 'desktop-app' ? '已切换预览：Tauri 本地桌面 App 形态' : '已切换预览：Localhost 本地网页形态');
      PS.route();
    };

    // 左下角白色浮层菜单（完整保留所有开源资产与扩展模块，不占左栏空间）
    document.getElementById('setPopBtn').onclick = e => {
      e.stopPropagation();
      const foot = document.getElementById('railFoot');
      if (foot.querySelector('.rail-pop')) return foot.querySelector('.rail-pop').remove();
      const m = PS.S.settings.modules;
      foot.insertAdjacentHTML('beforeend', `<div class="rail-pop" role="menu">
        <div class="rp-lbl">系统与开源社区</div>
        <a href="#settings">${PS.icon('sliders', 'sm')}系统（守护进程 · 平台 · 集成）</a>
        <a href="#releases">${PS.icon('spark', 'sm')}上新 · 版本动态 <span class="pill accent" style="margin-left:auto">v0.1.2</span></a>
        <div class="rp-sep"></div>
        <div class="rp-lbl">更多开源模块</div>
        ${m.tree ? `<a href="#tree">${PS.icon('tree', 'sm')}知识树与内化</a>` : ''}
        <a href="#said">${PS.icon('mic', 'sm')}我说过的话</a>
        <a href="#source/materials">${PS.icon('layers', 'sm')}视觉素材库</a>
        ${m.kline ? `<a href="#source/kline">${PS.icon('chart', 'sm')}K 线日报</a>` : ''}
        ${m.clients ? `<a href="#clients">${PS.icon('users', 'sm')}咨询客户 CRM</a>` : ''}
        ${m.site ? `<a href="#site">${PS.icon('globe', 'sm')}个人网站</a>` : ''}
        <a href="#position">${PS.icon('star', 'sm')}我的定位</a>
      </div>`);
    };

    document.getElementById('bellBtn').onclick = e => {
      e.stopPropagation();
      const host = e.currentTarget.parentElement;
      if (host.querySelector('.pop')) return host.querySelector('.pop').remove();
      host.insertAdjacentHTML('beforeend', `<div class="pop">
        <div class="pop-h"><b>通知</b><button class="btn ghost s" id="readAll">全部已读</button></div>
        <div class="pop-list">
          ${PS.S.notifications.map(n => `<a class="pop-item ${n.read ? '' : 'unread'}" href="${n.link === '#publish' ? '#pub-confirm' : n.link}" data-nid="${n.id}">
            ${PS.icon(n.kind === 'good' ? 'check' : 'alert')}
            <div><div>${PS.esc(n.title)}</div><small>${PS.esc(n.time)}</small></div>
          </a>`).join('')}
        </div>
      </div>`);
      host.querySelector('#readAll').onclick = () => { PS.S.notifications.forEach(n => (n.read = true)); PS.save(); host.querySelector('.pop')?.remove(); PS.route(); };
    };
    bindWendy();
    window.onscroll = () => document.getElementById('topbar')?.classList.toggle('scrolled', window.scrollY > 4);
    return document.getElementById('main');
  };

  document.addEventListener('click', e => {
    document.querySelectorAll('.pop,.rail-pop').forEach(p => { if (!p.parentElement.contains(e.target)) p.remove(); });
  });

  PS.pages = {};
  PS.route = function () {
    const raw = (location.hash || '#home').replace(/^#/, '');
    const [head, sub] = raw.split('/');
    const fn = PS.pages[head] || PS.pages.home;
    fn(sub);
    window.scrollTo(0, 0);
  };
  PS.api = async function (method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `请求失败 (${res.status})`);
    return data;
  };

  PS.syncFromBackend = async function () {
    try {
      const b = await PS.api('GET', '/api/bootstrap');
      PS.backendOnline = true;
      PS.S.vaultStatus = b.vaultStatus;
      PS.S.agents = b.agents;
      if (b.config) {
        PS.S.settings = { ...PS.S.settings, ...b.config, modules: { ...PS.S.settings.modules, ...(b.config.modules || {}) } };
        PS.S.daemon.chromePort = b.config.chromePort || 9333;
        PS.S.daemon.feishuEnabled = !!b.config.feishuEnabled;
        PS.S.daemon.feishuWebhook = b.config.feishuWebhook || '';
        PS.S.daemon.wechatIlinkEnabled = !!b.config.wechatIlinkEnabled;
      }
      if (b.vault) {
        if (b.vault.newsletter?.length) PS.S.sources.newsletter = b.vault.newsletter;
        if (b.vault.saved?.length) PS.S.sources.saved = b.vault.saved;
        if (b.vault.writing?.length) PS.S.obsidianNotes = b.vault.writing;
        if (b.vault.kline?.length) PS.S.sources.klineNotes = b.vault.kline;
      }
      if (b.topics?.length) {
        PS.S.topics = b.topics;
        const activeTopic = b.topics.find(t => !t.trash && !t.final_at) || b.topics[0];
        if (activeTopic) {
          PS.S.activeTopicId = activeTopic.id;
          PS.S.script.id = activeTopic.id;
          PS.S.script.title = activeTopic.title;
          if (activeTopic.body) PS.S.script.body = activeTopic.body;
          if (activeTopic.audit?.revised) PS.S.script.audit = activeTopic.audit;
        }
      }
      if (b.cutProject) {
        PS.S.cutProject = { ...PS.S.cutProject, ...b.cutProject };
        if (b.topics?.length && b.topics[0].hooks?.length) {
          PS.S.cutProject.hooks = b.topics[0].hooks;
          PS.S.cutProject.pickedHook = b.topics[0].picked_hook || 0;
        }
      }
      if (b.said) PS.S.said = b.said;
      if (b.tree?.length) PS.S.tree = b.tree;
      if (b.clients) PS.S.clients = b.clients;
      if (b.daemonLogs?.length) PS.S.daemonLogs = b.daemonLogs;
      if (b.positioning && Object.keys(b.positioning).length) PS.S.positioning = b.positioning;
      PS.save();
    } catch (e) {
      PS.backendOnline = false;
    }
  };

  PS.boot = async function () {
    window.addEventListener('hashchange', PS.route);
    if (!location.hash) location.hash = '#home';
    await PS.syncFromBackend();
    PS.route();
  };
})();
