/* Park Studio 核心框架 v3 — Apple Liquid Glass 悬浮毛玻璃双层顶栏（中控 | 选题 | 剪辑 | 发布 | 复盘）+ 弹性滑块动效 */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const STORE_KEY = 'park-studio:state:v3';

  PS.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PS.md = function (src) {
    const inline = s => {
      const links = [];
      let t = String(s || '').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
        const idx = links.length;
        links.push(`<a href="${PS.esc(url)}" target="_blank" rel="noopener noreferrer">${PS.esc(label)}</a>`);
        return `\u0000L${idx}\u0000`;
      });
      t = PS.esc(t)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
      return t.replace(/\u0000L(\d+)\u0000/g, (_, i) => links[+i] || '');
    };
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const raw of String(src || '').split('\n')) {
      const line = raw.trimEnd();
      let m;
      if (!line.trim()) { close(); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { close(); out.push(m[1].length <= 2 ? `<h3>${inline(m[2])}</h3>` : `<h4>${inline(m[2])}</h4>`); continue; }
      if (/^-{3,}$/.test(line.trim())) { close(); out.push('<hr>'); continue; }
      if ((m = line.match(/^>\s?(.*)/))) { close(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
      if (list && /^\s{2,}\S/.test(raw) && out.length) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, `<br><span class="sub">${inline(line.trim())}</span></li>`); continue; }
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
    close();
    return out.join('');
  };

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
          platformStatus: { ...def.platformStatus, ...(parsed.platformStatus || {}) },
          followers: { ...def.followers, ...(parsed.followers || {}) },
          releases: def.releases,
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
    el.textContent = PS.tr ? PS.tr(msg) : msg;
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
    let obs = null;
    const close = () => { if (obs) obs.disconnect(); bg.remove(); };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x],[data-close]')) close(); });
    document.body.appendChild(bg);
    PS.localizeDom?.(bg);
    if (onOpen) onOpen(bg, close);
    PS.localizeDom?.(bg);
    if (PS.lang === 'en' && window.MutationObserver) {
      let busy = false;
      obs = new MutationObserver(() => {
        if (busy) return;
        busy = true;
        PS.localizeDom?.(bg);
        busy = false;
      });
      obs.observe(bg, { childList: true, subtree: true, characterData: true });
    }
    return close;
  };

  PS.toggleTheme = function () {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    try { localStorage.setItem('ps:theme', cur); } catch (e) {}
    PS.nativePost?.({ action: 'theme', theme: cur });
    PS.toast(cur === 'dark' ? '已切换深色模式' : '已切换浅色模式');
  };

  // 五大顶层悬浮玻璃胶囊 Tab：[ 中控 | 选题 | 剪辑 | 发布 | 复盘 ]
  const WS_LIST = [
    { key: 'hub',     name: '中控', icon: 'dashboard', def: '#dashboard' },
    { key: 'topic',   name: '选题', icon: 'star',      def: '#source' },
    { key: 'cut',     name: '剪辑', icon: 'film',      def: '#cut' },
    { key: 'publish', name: '发布', icon: 'send',      def: '#pub-confirm' },
    { key: 'review',  name: '复盘', icon: 'chart',     def: '#review' },
  ];

  function wsOf(active) {
    if (['dashboard', 'home'].includes(active)) return 'hub';
    if (['source', 'feed', 'chai', 'pool', 'write', 'audit', 'scripts', 'done'].includes(active)) return 'topic';
    if (['cut-todo', 'cut', 'cut-done', 'materials'].includes(active)) return 'cut';
    if (['pub-todo', 'pub-pack', 'pub-confirm', 'pub-sent'].includes(active)) return 'publish';
    if (['review'].includes(active)) return 'review';
    return 'more';
  }

  function subTabsFor(ws, active) {
    const ep41 = PS.S.episodes.find(e => e.episode === 41);
    const waitN = ep41 ? Object.values(ep41.tasks).filter(t => t.state === 'awaiting_user').length : 0;
    const poolN = PS.S.topics.filter(t => !t.trash && ['找', '写', '审'].includes(t.stage)).length;
    const doneN = PS.S.episodes.filter(e => e.finalAt).length;
    const kbN = PS.S.kb?.folders?.length || 0;

    if (ws === 'hub') return [];
    if (ws === 'topic') {
      return [
        { id: 'source',  label: '日报 · 对标', href: '#source',  on: ['source', 'feed', 'chai'].includes(active) },
        { id: 'pool',    label: '选题池',      href: '#pool',    on: ['pool', 'write', 'audit'].includes(active), count: poolN },
        { id: 'scripts', label: '定稿',        href: '#scripts', on: ['scripts', 'done'].includes(active), count: doneN },
      ];
    }
    if (ws === 'cut') {
      return [
        { id: 'cut-todo',  label: '待剪',            href: '#cut-todo',  on: active === 'cut-todo', count: 1 },
        { id: 'cut',       label: '剪辑中 · 镜头表', href: '#cut',       on: active === 'cut',      count: `EP${PS.S.cutProject.episode}`, hot: true },
        { id: 'cut-done',  label: '剪好了',          href: '#cut-done',  on: active === 'cut-done', count: 3 },
        { id: 'materials', label: '视觉素材库',      href: '#materials', on: active === 'materials' },
      ];
    }
    if (ws === 'publish') {
      return [
        { id: 'pub-todo',    label: '待发', href: '#pub-todo',    on: active === 'pub-todo', count: 1 },
        { id: 'pub-pack',    label: '打包', href: '#pub-pack',    on: active === 'pub-pack' },
        { id: 'pub-confirm', label: '确认', href: '#pub-confirm', on: active === 'pub-confirm', count: waitN ? `${waitN} 待点发` : '', hot: !!waitN },
        { id: 'pub-sent',    label: '已发', href: '#pub-sent',    on: active === 'pub-sent', count: PS.S.analytics?.totalEpisodes || 0 },
      ];
    }
    if (ws === 'review') {
      return [
        { id: 'review', label: '同龄复盘 · 抖音分析', href: '#review', on: active === 'review' },
      ];
    }
    // 系统、我的定位、Obsidian 知识库与版本动态
    return [
      { id: 'settings', label: '系统',     href: '#settings', on: active === 'settings' },
      { id: 'position', label: '我的定位', href: '#position', on: active === 'position' },
      { id: 'kb',       label: '知识库',   href: '#kb',       on: active === 'kb', count: kbN || '' },
      { id: 'releases', label: '上新',     href: '#releases', on: active === 'releases' },
    ];
  }

  // ⌘K 完整跨工作台索引
  PS.cmdk = function () {
    const items = [
      { label: '中控 · 正在做与运营大屏', kind: '中控', hash: '#dashboard' },
      { label: '日报 · 对标（AI 日报 / 搞钱 / 开发 / 对标爆款 / 素材库）', kind: '选题', hash: '#source' },
      { label: '对标爆款榜 · 按几倍平时排 & AI 拆解', kind: '选题', hash: '#feed' },
      { label: '选题池 & 写稿骨架', kind: '选题', hash: '#pool' },
      { label: '审稿 / 改写（三路诊断）', kind: '选题', hash: '#audit' },
      { label: '定稿', kind: '选题', hash: '#scripts' },
      { label: '待剪', kind: '剪辑', hash: '#cut-todo' },
      { label: '剪辑中 · Hook / 镜头表 Spec Table / 独立剪辑 Agent', kind: '剪辑', hash: '#cut' },
      { label: '剪好了', kind: '剪辑', hash: '#cut-done' },
      { label: '视觉素材库（图片 / 视频动效 / 做视频）', kind: '剪辑', hash: '#materials' },
      { label: '待发 · 排期', kind: '发布', hash: '#pub-todo' },
      { label: '打包 · publish.json', kind: '发布', hash: '#pub-pack' },
      { label: '确认 · 专用 Chrome 自动填表', kind: '发布', hash: '#pub-confirm' },
      { label: '已发 · 全平台真实矩阵与日历', kind: '发布', hash: '#pub-sent' },
      { label: '复盘与抖音作品分析', kind: '复盘', hash: '#review' },
      { label: '知识库 · Obsidian 接入文件夹与笔记检索', kind: '系统', hash: '#kb' },
      { label: '我的定位（7 页签完整定位卡）', kind: '系统', hash: '#position' },
      { label: '系统 · 守护进程 / 7 平台体检 / 全局与独立剪辑 Agent', kind: '系统', hash: '#settings' },
      { label: '上新 · 版本更新与开源动态', kind: '系统', hash: '#releases' },
    ];
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="cmdk-box"><input type="search" placeholder="搜索页面、选题和作品…" autofocus><ul class="cmdk-list"></ul></div>`;
    const inp = bg.querySelector('input'), ul = bg.querySelector('ul');
    let list = items, idx = 0;
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      const mapped = items.map(x => ({ ...x, _label: PS.tr ? PS.tr(x.label) : x.label, _kind: PS.tr ? PS.tr(x.kind) : x.kind }));
      list = mapped.filter(x => !q || x._label.toLowerCase().includes(q) || x._kind.toLowerCase().includes(q) || x.label.toLowerCase().includes(q)).slice(0, 14);
      idx = Math.min(idx, Math.max(0, list.length - 1));
      ul.innerHTML = list.length ? list.map((x, i) => `<li class="${i === idx ? 'on' : ''}" data-i="${i}"><span>${PS.esc(x._label)}</span><small class="sub">${PS.esc(x._kind)}</small></li>`).join('') : `<li class="sub">${PS.esc(PS.tr ? PS.tr('没有匹配的页面') : '没有匹配的页面')}</li>`;
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
    PS.localizeDom?.(bg);
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

  // 检测是否在原生 Mac App (WKWebView) 中运行，为红绿灯留出呼吸间距并接通顶栏拖拽 / 双击缩放 / Finder 选文件
  PS.isMacApp = /ParkStudioMacApp/.test(navigator.userAgent);
  PS.nativePost = function (payload) {
    try {
      window.webkit?.messageHandlers?.parkStudio?.postMessage(payload);
      return true;
    } catch (e) {
      return false;
    }
  };
  const pendingPickers = new Map();
  window.__psNativePickResult = function (msg) {
    if (!msg || !msg.id) return;
    const resolve = pendingPickers.get(msg.id);
    if (resolve) {
      pendingPickers.delete(msg.id);
      resolve(msg.path || '');
    }
  };
  PS.pickNativePath = function ({ mode = 'file', exts = [] } = {}) {
    if (!window.webkit?.messageHandlers?.parkStudio) return Promise.resolve('');
    const id = `pk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return new Promise(resolve => {
      pendingPickers.set(id, resolve);
      PS.nativePost({ action: 'pickPath', requestId: id, mode, exts });
    });
  };
  if (PS.isMacApp) {
    document.documentElement.classList.add('macos-app');
    PS.nativePost({ action: 'theme', theme: document.documentElement.dataset.theme || 'dark' });
    // 原生顶栏任意空白区域左键拖动窗口、双击放大/还原（避开按钮/链接/输入框/胶囊组件）
    document.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.clientY > 64) return;
      if (e.target.closest('button, a, input, select, textarea, label, [role="button"], .lg-pill, .lg-island, .lg-subbar, .lg-menu, .modal-box, .cmdk-box')) return;
      e.preventDefault();
      if (e.detail >= 2) {
        PS.nativePost({ action: 'doubleClick' });
      } else {
        PS.nativePost({ action: 'drag' });
      }
    });
  }

  // 物理弹性滑块定位（不销毁顶栏 DOM，切 Tab 丝滑弹过去）
  function moveThumb(bar, thumb, selector, instant = false) {
    if (!bar || !thumb) return;
    const target = bar.querySelector(selector);
    if (!target) {
      thumb.classList.remove('ready');
      return;
    }
    if (instant) thumb.classList.add('no-anim');
    else thumb.classList.remove('no-anim');
    thumb.style.transform = `translateX(${target.offsetLeft}px)`;
    thumb.style.width = `${target.offsetWidth}px`;
    thumb.classList.add('ready');
    if (instant) {
      void thumb.offsetWidth;
      thumb.classList.remove('no-anim');
    }
  }

  let chromeMounted = false;
  let lastWsKey = '';

  PS.rebuildChrome = function () {
    chromeMounted = false;
    lastWsKey = '';
  };

  function ensureChrome() {
    if (chromeMounted && document.getElementById('chromeTop')) return;
    chromeMounted = true;
    document.getElementById('app').innerHTML = `
      <div class="app">
        <header class="top-dock" id="chromeTop">
          <div class="top-dock-row">
            <div class="top-left">
              <a class="lg-brand lg-island" href="#dashboard" title="Park Studio · Open-Source Creator OS">
                <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
                  <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--cta-bg)"/>
                  <rect x="8.5" y="8.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)"/>
                  <rect x="17.5" y="8.5" width="6" height="6" rx="1.8" fill="var(--accent)"/>
                  <rect x="8.5" y="17.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)" fill-opacity=".42"/>
                  <rect x="17.5" y="17.5" width="6" height="6" rx="1.8" fill="var(--cta-ink)" fill-opacity=".82"/>
                </svg>
                <b>Park Studio</b>
              </a>
            </div>

            <nav class="top-center" aria-label="主工作台">
              <div class="lg-pill" id="mainPill" role="tablist">
                <span class="lg-thumb" id="mainThumb" aria-hidden="true"></span>
                ${WS_LIST.map(w => `<button type="button" class="lg-tab" role="tab" data-ws="${w.key}">
                  ${PS.icon(w.icon)}<span>${w.name}</span><span class="tab-dot" data-badge="${w.key}" hidden></span>
                </button>`).join('')}
              </div>
            </nav>

            <div class="top-right">
              <button type="button" class="lg-btn lg-island circ" id="cmdkBtn" title="搜索页面和选题 (⌘K)" aria-label="搜索">${PS.icon('search')}</button>
              <button type="button" class="lg-btn lg-island" id="langQuickBtn" title="切换界面语言 (中 / EN)" aria-label="切换界面语言 (中 / EN)" style="font-size:12px;font-weight:700;padding:0 11px;min-width:38px;justify-content:center">${PS.lang === 'en' ? '中文' : 'EN'}</button>
              <button type="button" class="lg-btn lg-island circ" id="themeQuickBtn" title="切换深浅色外观" aria-label="切换深浅色"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/></svg></button>
              <a class="lg-btn lg-island" id="sysNavBtn" href="#settings" title="系统 · 守护进程 / 12 平台体检 / 集成">
                <span class="dot live" id="sysDot"></span><span class="lbl">系统</span>
              </a>
              <div class="rel" id="moreHost">
                <button type="button" class="lg-btn lg-island circ rel" id="moreMenuBtn" title="更多模块、通知与深浅色" aria-label="更多">
                  ${PS.icon('menu')}<span class="badge" id="bellBadge" hidden></span>
                </button>
              </div>
            </div>
          </div>
          <div class="sub-dock" id="subDock"></div>
        </header>

        <div class="main">
          <main class="page" id="main"></main>
        </div>
      </div>
    `;

    document.querySelectorAll('#mainPill [data-ws]').forEach(btn => {
      btn.onclick = () => {
        const w = WS_LIST.find(x => x.key === btn.dataset.ws);
        if (!w) return;
        // 立刻触发滑块弹性移动，不等路由重绘
        document.querySelectorAll('#mainPill .lg-tab').forEach(el => el.classList.toggle('on', el === btn));
        moveThumb(document.getElementById('mainPill'), document.getElementById('mainThumb'), '.lg-tab.on', false);
        location.hash = w.def;
      };
    });
    document.getElementById('cmdkBtn').onclick = () => PS.cmdk();
    document.getElementById('langQuickBtn').onclick = () => PS.toggleLang?.();
    document.getElementById('themeQuickBtn').onclick = () => PS.toggleTheme();
    document.getElementById('moreMenuBtn').onclick = e => {
      e.stopPropagation();
      const host = document.getElementById('moreHost');
      if (host.querySelector('.lg-menu')) return host.querySelector('.lg-menu').remove();
      const m = PS.S.settings.modules;
      const unread = PS.S.notifications.filter(n => !n.read).length;
      const onlineN = PS.activePlats().filter(p => PS.S.platformStatus[p]?.state === 'ok').length;
      const activeN = PS.activePlats().length;
      host.insertAdjacentHTML('beforeend', `<div class="lg-menu" role="menu">
        <div class="rp-lbl">系统与创作者中枢</div>
        <a href="#settings">${PS.icon('sliders', 'sm')}系统与体检 <span class="sub" style="margin-left:auto;font-size:11px">${onlineN}/${activeN}</span></a>
        <a href="#position">${PS.icon('star', 'sm')}我的定位</a>
        <a href="#kb">${PS.icon('book', 'sm')}知识库（Obsidian）</a>
        <a href="#materials">${PS.icon('layers', 'sm')}视觉素材库</a>
        <a href="#releases">${PS.icon('spark', 'sm')}上新 · 版本动态 <span class="pill accent" style="margin-left:auto">v0.5.0</span></a>
        <button type="button" id="openNotifBtn">${PS.icon('bell', 'sm')}通知中心 ${unread ? `<span class="pill warn" style="margin-left:auto">${unread}</span>` : ''}</button>
        <div class="rp-sep"></div>
        <button type="button" id="langToggleMenu">🌐 ${PS.lang === 'en' ? '切换为简体中文' : 'Switch to English'}</button>
        <button type="button" id="themeToggleMenu">◐ 切换深浅外观</button>
      </div>`);
      PS.localizeDom?.(host);
      host.querySelector('#langToggleMenu').onclick = () => { host.querySelector('.lg-menu')?.remove(); PS.toggleLang?.(); };
      host.querySelector('#themeToggleMenu').onclick = () => { host.querySelector('.lg-menu')?.remove(); PS.toggleTheme(); };
      host.querySelector('#openNotifBtn').onclick = () => {
        host.querySelector('.lg-menu')?.remove();
        PS.modal({
          title: '通知中心',
          body: `<div class="stack tight">${PS.S.notifications.map(n => `<a class="pop-item ${n.read ? '' : 'unread'}" style="border-radius:10px;border:1px solid var(--line-soft)" href="${n.link === '#publish' ? '#pub-confirm' : n.link}" data-close>
            ${PS.icon(n.kind === 'good' ? 'check' : 'alert')}
            <div><div>${PS.esc(n.title)}</div><small>${PS.esc(n.time)}</small></div>
          </a>`).join('')}</div>`,
          foot: `<button class="btn" id="markAllRead">全部已读</button><button class="btn primary" data-close>关闭</button>`,
          onOpen(mb, close) {
            mb.querySelector('#markAllRead').onclick = () => {
              PS.S.notifications.forEach(n => (n.read = true));
              PS.save();
              updateChromeBadges();
              close();
            };
          },
        });
      };
    };

    window.addEventListener('resize', () => {
      moveThumb(document.getElementById('mainPill'), document.getElementById('mainThumb'), '.lg-tab.on', true);
      moveThumb(document.getElementById('subBar'), document.getElementById('subThumb'), '.lg-subtab.on', true);
    });
  }

  function updateChromeBadges() {
    const ep41 = PS.S.episodes.find(e => e.episode === 41);
    const waitN = ep41 ? Object.values(ep41.tasks).filter(t => t.state === 'awaiting_user').length : 0;
    const pubBadge = document.querySelector('#mainPill [data-badge="publish"]');
    if (pubBadge) {
      pubBadge.hidden = !waitN;
      pubBadge.textContent = waitN ? String(waitN) : '';
    }
    const unread = PS.S.notifications.filter(n => !n.read).length;
    const bellBadge = document.getElementById('bellBadge');
    if (bellBadge) {
      bellBadge.hidden = !unread;
      bellBadge.textContent = unread ? String(unread) : '';
    }
    const sysDot = document.getElementById('sysDot');
    if (sysDot) sysDot.className = `dot ${PS.S.daemon.running ? 'live' : 'bad'}`;
  }

  function syncTopNav(ws, active) {
    const mainPill = document.getElementById('mainPill');
    const mainThumb = document.getElementById('mainThumb');
    const firstRender = !mainThumb.classList.contains('ready');
    mainPill.querySelectorAll('.lg-tab').forEach(el => {
      const isOn = el.dataset.ws === ws;
      el.classList.toggle('on', isOn);
      el.setAttribute('aria-selected', isOn ? 'true' : 'false');
    });
    document.getElementById('sysNavBtn')?.classList.toggle('on', ['settings', 'position', 'kb', 'releases'].includes(active));
    document.getElementById('moreMenuBtn')?.classList.toggle('on', false);
    updateChromeBadges();
    requestAnimationFrame(() => moveThumb(mainPill, mainThumb, '.lg-tab.on', firstRender));

    // Row 2 二级毛玻璃分段栏（同工作台内保持 DOM，切换子页签同样有弹性滑动！）
    const subDock = document.getElementById('subDock');
    const subs = subTabsFor(ws, active);
    if (!subs.length) {
      subDock.innerHTML = '';
      lastWsKey = ws;
      return;
    }
    const sameWs = lastWsKey === ws && document.getElementById('subBar');
    if (sameWs) {
      const subBar = document.getElementById('subBar');
      subBar.querySelectorAll('.lg-subtab').forEach(el => {
        const meta = subs.find(s => s.id === el.dataset.subid);
        el.classList.toggle('on', !!meta?.on);
      });
      requestAnimationFrame(() => moveThumb(subBar, document.getElementById('subThumb'), '.lg-subtab.on', false));
    } else {
      subDock.innerHTML = `<div class="lg-subbar" id="subBar" role="tablist">
        <span class="lg-sub-thumb" id="subThumb" aria-hidden="true"></span>
        ${subs.map(s => `<a class="lg-subtab ${s.on ? 'on' : ''}" data-subid="${s.id}" href="${s.href}">
          <span>${PS.esc(s.label)}</span>${s.count ? `<span class="scnt ${s.hot ? 'hot' : ''}">${PS.esc(s.count)}</span>` : ''}
        </a>`).join('')}
      </div>`;
      PS.localizeDom?.(subDock);
      requestAnimationFrame(() => moveThumb(document.getElementById('subBar'), document.getElementById('subThumb'), '.lg-subtab.on', true));
    }
    lastWsKey = ws;
  }

  // 主外框 Shell（widthMode: '' | 'mid' | 'narrow'）
  let mainObs = null;
  PS.shell = function (active, crumbs, inner, widthMode = '') {
    ensureChrome();
    PS.localizeDom?.(document.getElementById('chromeTop'));
    const ws = wsOf(active);
    PS._lastWs = ws;
    syncTopNav(ws, active);
    document.querySelectorAll('.lg-menu,.pop').forEach(p => p.remove());
    const main = document.getElementById('main');
    if (mainObs) { mainObs.disconnect(); mainObs = null; }
    main.className = `page ${widthMode}`.trim();
    main.innerHTML = inner;
    PS.localizeDom?.(main);
    if (PS.lang === 'en' && window.MutationObserver) {
      let busy = false;
      mainObs = new MutationObserver(() => {
        if (busy || PS.lang !== 'en') return;
        busy = true;
        PS.localizeDom?.(main);
        busy = false;
      });
      mainObs.observe(main, { childList: true, subtree: true });
    }
    return main;
  };

  document.addEventListener('click', e => {
    document.querySelectorAll('.pop,.lg-menu').forEach(p => { if (!p.parentElement.contains(e.target)) p.remove(); });
  });

  PS.pages = {};
  PS.route = function () {
    const raw = (location.hash || '#dashboard').replace(/^#/, '');
    const [head, sub, arg] = raw.split('/');
    const fn = PS.pages[head] || PS.pages.dashboard;
    fn(sub, arg);
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
      PS.S.chromeStatus = b.chromeStatus;
      PS.S.agents = b.agents;
      if (b.newsletterIssue) PS._newsletterIssue = b.newsletterIssue;
      if (b.savedDaily) PS._savedDaily = b.savedDaily;
      if (b.devDaily) PS._devDaily = b.devDaily;
      if (b.chromeStatus) {
        PS.S.daemon.chromeOnline = !!b.chromeStatus.online;
        PS.S.daemon.chromePort = b.chromeStatus.port || PS.S.daemon.chromePort;
      }
      if (b.platformStatus) {
        PS.S.platformStatus = { ...PS.S.platformStatus, ...b.platformStatus };
      }
      if (b.publishEpisodes?.length) {
        PS.S.publishEpisodes = b.publishEpisodes;
        // 同步最新 SQLite 发布任务状态到总览 episodes（按 episode 号对齐）
        for (const pe of b.publishEpisodes) {
          const hit = PS.S.episodes.find(e => e.episode === pe.episode);
          if (hit) {
            hit.dbId = pe.id;
            hit.videoPath = pe.videoPath;
            hit.publishJson = pe.publishJson;
            hit.preflight = pe.preflight;
            for (const [pid, t] of Object.entries(pe.tasks || {})) {
              hit.tasks[pid] = { ...(hit.tasks[pid] || {}), ...t, m: t.m || hit.tasks[pid]?.m || null };
            }
          }
        }
      }
      if (b.projects) PS.S.projects = b.projects;
      if (b.launchd) PS.S.launchd = b.launchd;
      if (b.analytics) PS.S.analytics = b.analytics;
      if (b.lastMetricsAt) PS.S.daemon.lastMetricsAt = b.lastMetricsAt;
      PS.S.liveFollowerPlats = Object.keys(b.followersLive || {});
      if (b.hasLiveFollowers || PS.backendOnline) {
        // 真实后端在线时完全以 SQLite 实测粉丝为准，彻底清零 data.js 残留演示数字（如旧公众号 19,113）
        const cleanFollowers = {};
        for (const pid of PS.PLAT_ORDER) {
          const dayMap = b.followersLive?.[pid];
          cleanFollowers[pid] = (dayMap && Object.keys(dayMap).length) ? { ...dayMap } : {};
        }
        PS.S.followers = cleanFollowers;
      }
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
        const kept = PS.S.activeTopicId ? b.topics.find(t => t.id === PS.S.activeTopicId && !t.trash) : null;
        const activeTopic = kept || b.topics.find(t => !t.trash && !t.final_at) || b.topics[0];
        if (activeTopic) {
          PS.S.activeTopicId = activeTopic.id;
          PS.S.script.id = activeTopic.id;
          PS.S.script.title = activeTopic.title || '';
          PS.S.script.body = activeTopic.body || '';
          PS.S.script.audit = activeTopic.audit?.revised ? activeTopic.audit : { value: '', resonate: '', pace: '', revised: '' };
        }
      }
      if (b.cutProject) {
        PS.S.cutProject = { ...PS.S.cutProject, ...b.cutProject };
        const curT = PS.S.topics?.find(t => t.id === PS.S.activeTopicId);
        if (curT) {
          PS.S.cutProject.hooks = Array.isArray(curT.hooks) ? [...curT.hooks] : [];
          PS.S.cutProject.pickedHook = curT.picked_hook || 0;
        }
      }
      if (b.said) PS.S.said = b.said;
      if (b.tree?.length) PS.S.tree = b.tree;
      if (b.clients) PS.S.clients = b.clients;
      if (b.daemonLogs?.length) PS.S.daemonLogs = b.daemonLogs;
      if (b.positioning && Object.keys(b.positioning).length) PS.S.positioning = b.positioning;
      PS.S.studioPositioning = b.studioPositioning || null;
      if (b.benchmarks) PS.S.benchmarks = b.benchmarks;
      if (b.kb) PS.S.kb = b.kb;
      if (b.materials) PS.S.materials = b.materials;
      if (b.cutEnv) PS.S.cutEnv = b.cutEnv;
      if (b.deps) PS.S.deps = b.deps;
      if (b.lifecycle) PS.S.lifecycle = b.lifecycle;
      PS.S.needsOnboarding = !!b.needsOnboarding;
      PS.save();
    } catch (e) {
      PS.backendOnline = false;
    }
  };

  PS.setActivePubEp = function (id) {
    if (id) PS.S.activePubEpId = id;
  };

  PS.openOnboarding = function (initialStep = 1) {
    let step = initialStep; // 1: platforms | 2: agents & exec | 3: dependencies
    const selected = new Set(PS.activePlats());
    let pickedAi = PS.S.settings.aiBackend || 'gemini-api';
    let pickedCutAi = PS.S.settings.cutAgentBackend || 'inherit';
    let allowExec = !!PS.S.settings.cutAgentAllowExec;
    let depsState = PS.S.deps || null;
    let depJob = null;
    let depTimer = null;

    const corePlats = PS.PLAT_ORDER.filter(p => !['tiktok', 'instagram', 'threads', 'linkedin', 'meta'].includes(p));
    const globalPlats = PS.PLAT_ORDER.filter(p => ['tiktok', 'instagram', 'threads', 'linkedin', 'meta'].includes(p));
    const PRESETS = {
      cn4: ['douyin', 'xhs', 'bilibili', 'channels'],
      cn5: ['douyin', 'xhs', 'bilibili', 'channels', 'wechat'],
      mix7: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'x', 'wechat'],
      global5: ['youtube', 'x', 'tiktok', 'instagram', 'linkedin'],
      all12: [...PS.PLAT_ORDER],
      none: [],
    };
    const agents = PS.S.agents || {};

    const renderGrid = list => list.map(pid => {
      const p = PS.PLATFORMS[pid];
      const on = selected.has(pid);
      return `<button type="button" data-ob-plat="${pid}" class="row" style="text-align:left;padding:9px 11px;border-radius:10px;border:1.5px solid ${on ? 'var(--accent)' : 'var(--line)'};background:${on ? 'color-mix(in srgb,var(--accent-soft) 45%,var(--surface))' : 'var(--surface)'};cursor:pointer;gap:8px;width:100%;transition:all .15s">
        ${PS.plogo(pid, 20)}
        <span class="min0 grow" style="display:flex;flex-direction:column;gap:1px">
          <b style="font-size:12.5px;color:var(--ink)">${PS.esc(p.name)}</b>
          <span class="sub" style="font-size:10.5px">${PS.esc(p.mode || '')}</span>
        </span>
        <span class="pill ${on ? 'accent' : ''}" style="font-size:10.5px;padding:1px 6px">${on ? '✓ 已选' : '未选'}</span>
      </button>`;
    }).join('');

    const stepBody = () => {
      const stepper = `<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">
        ${[
          [1, '1. 选择发布平台'],
          [2, '2. 分配写稿与剪辑 Agent'],
          [3, '3. 一次性装齐本地依赖'],
        ].map(([n, lab]) => `<button type="button" data-ob-step="${n}" class="btn s ${step === n ? 'primary' : ''}">${lab}</button>`).join('')}
      </div>`;

      if (step === 1) {
        return `${stepper}
        <div class="callout-warm" style="font-size:13px;line-height:1.6">
          <b>支持 12 个平台，但不需要全填。</b><br>
          你平时只发 3 个或 5 个平台，就只勾那几个；没选的平台会自动隐藏，不会出现在大屏、体检或发布队列里，随时都能在「● 系统」里增减。
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <span class="sub" style="font-size:12px;font-weight:600">常用组合一键套用：</span>
          <button type="button" class="btn s" data-ob-preset="cn4">国内 4 家</button>
          <button type="button" class="btn s" data-ob-preset="cn5">国内 5 家（+ 公众号）</button>
          <button type="button" class="btn s" data-ob-preset="mix7">国内 + 出海 7 家</button>
          <button type="button" class="btn s" data-ob-preset="global5">纯出海 5 家</button>
          <button type="button" class="btn s" data-ob-preset="all12">全部 12 家</button>
          <button type="button" class="btn s" data-ob-preset="none">清空重选</button>
        </div>
        <div class="stack tight">
          <div class="row"><b style="font-size:13px">中文与主流平台（7 家）</b><span class="grow"></span><span class="pill accent" id="obCount">已选 ${selected.size} / ${PS.PLAT_ORDER.length} 个平台</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px">${renderGrid(corePlats)}</div>
        </div>
        <div class="stack tight">
          <b style="font-size:13px">海外扩展平台（5 家）</b>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px">${renderGrid(globalPlats)}</div>
        </div>`;
      }

      if (step === 2) {
        return `${stepper}
        <div class="callout-warm" style="font-size:13px;line-height:1.6">
          <b>让本地全能 CLI Agent 直接在 App 内帮你完成剪辑、动效与做封面。</b><br>
          写稿/拆解可以用轻快的 Gemini API 或任意兼容 API；真正的花字、B-roll 动效剪辑与封面生成，可以指定本机的 <b>Claude Code / Codex / Gemini CLI</b> 直接动手执行。
        </div>
        <div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13.5px">① 写稿 & 选题 Agent（拆解、写稿、审稿、中→英适配）</b>
          <div class="seg" style="flex-wrap:wrap">
            ${[
              ['gemini-api', 'Gemini API'],
              ['agy', 'Antigravity'],
              ['gemini', 'Gemini CLI'],
              ['claude', 'Claude Code'],
              ['codex', 'Codex'],
              ['api', '可选 API'],
            ].map(([id, lab]) => `<button type="button" class="${pickedAi === id ? 'on' : ''}" data-ob-ai="${id}">${lab}${agents[id]?.installed ? ' ✓' : ''}</button>`).join('')}
          </div>
        </div>
        <div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13.5px">② 全能剪辑 & 封面 Agent（动效精剪、B-roll、3 比例封面）</b>
          <div class="seg" style="flex-wrap:wrap">
            ${[
              ['inherit', '跟随写稿 Agent'],
              ['claude', 'Claude Code'],
              ['codex', 'Codex'],
              ['gemini', 'Gemini CLI'],
              ['agy', 'Antigravity'],
              ['custom', '自定义命令'],
            ].map(([id, lab]) => `<button type="button" class="${pickedCutAi === id ? 'on' : ''}" data-ob-cutai="${id}">${lab}${agents[id]?.installed ? ' ✓' : ''}</button>`).join('')}
          </div>
          <label class="row" style="gap:9px;margin-top:8px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);cursor:pointer;font-size:13px">
            <input type="checkbox" id="obAllowExec" ${allowExec ? 'checked' : ''} style="accent-color:var(--accent);width:16px;height:16px">
            <span><b>允许剪辑 Agent 在视频工程目录内读写文件并执行本地剪辑/封面脚本</b><br><span class="sub" style="font-size:11.5px">工作目录严格锁死在当前期次文件夹内，绝不触碰 Obsidian 与系统其他目录。</span></span>
          </label>
        </div>`;
      }

      const items = depsState?.items || [];
      const missingN = (depsState?.missingInstallable || []).length;
      return `${stepper}
      <div class="callout-warm" style="font-size:13px;line-height:1.6">
        <b>一次性检查并安装全部本地工具，真正做到 Standalone 开箱即用。</b><br>
        装好 FFmpeg、Whisper 和 yt-dlp 后，下载素材、离线转写、粗剪、封面和 12 平台填表都能 100% 在本地闭环。
      </div>
      <div class="card stack tight" style="background:var(--sunk);border:0">
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <b style="font-size:13.5px">本机核心依赖体检</b>
          <span class="grow"></span>
          <button type="button" class="btn s" id="obRecheckDeps">重新检测</button>
          ${missingN ? `<button type="button" class="btn primary s" id="obInstallDeps" ${depJob?.state === 'running' ? 'disabled' : ''}>⚡ 一键安装 ${missingN} 个缺失依赖</button>` : '<span class="pill good">✓ 可自动安装的依赖已全部就绪</span>'}
        </div>
        ${items.length ? items.map(it => `<div class="row" style="padding:8px 10px;border-radius:9px;background:var(--surface);border:1px solid var(--line-soft);gap:10px">
          <div class="min0 grow">
            <div class="row" style="gap:6px"><b style="font-size:13px">${PS.esc(it.name)}</b>${it.required ? '' : '<span class="pill" style="font-size:10px;padding:0 5px">可选</span>'}</div>
            <div class="sub" style="font-size:11.5px">${PS.esc(it.role)}</div>
          </div>
          ${it.installed
            ? '<span class="pill good">✓ 已安装</span>'
            : `<span class="pill wait">缺失 · <code class="mono">${PS.esc(it.hint)}</code></span>`}
        </div>`).join('') : '<div class="sub" style="padding:12px">正在体检本机依赖…</div>'}
        ${depJob ? `<div class="stack tight" style="margin-top:8px">
          <div class="row"><span class="pill ${depJob.state === 'done' ? 'good' : depJob.state === 'failed' ? 'warn' : 'accent'}">${depJob.state === 'running' ? '正在安装依赖…' : depJob.state === 'done' ? '安装完成 ✓' : '安装出错'}</span></div>
          <pre class="codebox" style="max-height:150px;font-size:11.5px">${PS.esc((depJob.logs || []).join('\n'))}</pre>
        </div>` : ''}
      </div>`;
    };

    PS.modal({
      title: 'Park Studio · Standalone 全闭环引导设置',
      wide: true,
      body: `<div class="stack" id="obBodyHost">${stepBody()}</div>`,
      foot: `<button class="btn" id="obSkip">稍后再说</button><span class="grow"></span><button class="btn" id="obPrev" style="display:none">上一步</button><button class="btn primary" id="obNext">下一步：分配 Agent ›</button>`,
      onOpen(mb, close) {
        const stopDepPoll = () => { if (depTimer) { clearInterval(depTimer); depTimer = null; } };
        const fetchDeps = async () => {
          try {
            depsState = await PS.api('GET', '/api/deps');
            PS.S.deps = depsState;
            if (step === 3) render();
          } catch (e) {}
        };
        if (!depsState || initialStep === 3) fetchDeps();

        const render = () => {
          const host = mb.querySelector('#obBodyHost');
          if (!host) return;
          host.innerHTML = stepBody();
          const prevBtn = mb.querySelector('#obPrev');
          const nextBtn = mb.querySelector('#obNext');
          prevBtn.style.display = step > 1 ? '' : 'none';
          if (step === 1) nextBtn.textContent = '下一步：分配 Agent ›';
          else if (step === 2) nextBtn.textContent = '下一步：检查本地依赖 ›';
          else nextBtn.textContent = selected.size ? `完成配置，进入工作台（已选 ${selected.size} 平台）` : '完成配置，进入工作台';

          host.querySelectorAll('[data-ob-step]').forEach(b => b.onclick = () => {
            step = +b.dataset.obStep;
            if (step === 3 && !depsState) fetchDeps();
            render();
          });
          host.querySelectorAll('[data-ob-plat]').forEach(btn => btn.onclick = () => {
            const pid = btn.dataset.obPlat;
            if (selected.has(pid)) selected.delete(pid); else selected.add(pid);
            render();
          });
          host.querySelectorAll('[data-ob-preset]').forEach(btn => btn.onclick = () => {
            selected.clear();
            for (const p of (PRESETS[btn.dataset.obPreset] || [])) selected.add(p);
            render();
          });
          host.querySelectorAll('[data-ob-ai]').forEach(btn => btn.onclick = () => { pickedAi = btn.dataset.obAi; render(); });
          host.querySelectorAll('[data-ob-cutai]').forEach(btn => btn.onclick = () => { pickedCutAi = btn.dataset.obCutai; render(); });
          host.querySelector('#obAllowExec')?.addEventListener('change', e => { allowExec = !!e.target.checked; });
          host.querySelector('#obRecheckDeps')?.addEventListener('click', fetchDeps);
          host.querySelector('#obInstallDeps')?.addEventListener('click', async () => {
            try {
              const r = await PS.api('POST', '/api/deps/install', {});
              depJob = r.job;
              render();
              stopDepPoll();
              depTimer = setInterval(async () => {
                try {
                  const st = await PS.api('GET', `/api/cut/jobs/${depJob.id}`);
                  depJob = st;
                  if (st.state !== 'running') {
                    stopDepPoll();
                    await fetchDeps();
                  }
                  render();
                } catch (err) { stopDepPoll(); }
              }, 1100);
            } catch (err) {
              PS.toast(err.message || '安装启动失败', 'warn');
            }
          });
        };

        render();
        mb.querySelector('#obPrev').onclick = () => { if (step > 1) { step--; render(); } };
        mb.querySelector('#obSkip').onclick = async () => {
          stopDepPoll();
          PS.S.needsOnboarding = false;
          PS.S.settings.onboardingDone = true;
          await PS.api('PUT', '/api/settings', { onboardingDone: true }).catch(() => {});
          PS.save();
          close();
        };
        mb.querySelector('#obNext').onclick = async e => {
          if (step < 3) {
            step++;
            if (step === 3) fetchDeps();
            render();
            return;
          }
          stopDepPoll();
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = '正在保存配置…';
          try {
            const r = await PS.api('POST', '/api/onboarding/complete', {
              platforms: [...selected],
              aiBackend: pickedAi,
              cutAgentBackend: pickedCutAi,
              cutAgentAllowExec: allowExec,
            });
            if (r.platformStatus) PS.S.platformStatus = { ...PS.S.platformStatus, ...r.platformStatus };
            if (r.config) PS.S.settings = { ...PS.S.settings, ...r.config };
            if (r.daemonLogs) PS.S.daemonLogs = r.daemonLogs;
            PS.S.needsOnboarding = false;
            PS.save();
            close();
            PS.toast(`配置已保存：${r.enabled.length} 平台 · 剪辑执行${allowExec ? '已授权' : '只读规划'} ✓`, 'good');
            PS.route();
          } catch (err) {
            PS.toast(err.message || '保存失败', 'warn');
            btn.disabled = false;
            render();
          }
        };
      },
    });
  };

  PS.boot = async function () {
    window.addEventListener('hashchange', PS.route);
    if (!location.hash || location.hash === '#home') location.hash = '#dashboard';
    await PS.syncFromBackend();
    PS.route();
    if (PS.S.needsOnboarding) {
      setTimeout(() => PS.openOnboarding(), 180);
    }
  };
})();
