/* Park Studio 核心框架 v3 — Apple Liquid Glass 悬浮毛玻璃双层顶栏（中控 | 选题 | 剪辑 | 发布 | 复盘）+ 弹性滑块动效 */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const STORE_KEY = 'park-studio:state:v2';

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
    if (['cut-todo', 'cut', 'cut-done'].includes(active)) return 'cut';
    if (['pub-todo', 'pub-pack', 'pub-confirm', 'pub-sent'].includes(active)) return 'publish';
    if (['review', 'conversion'].includes(active)) return 'review';
    return 'more';
  }

  function subTabsFor(ws, active) {
    const ep41 = PS.S.episodes.find(e => e.episode === 41);
    const waitN = ep41 ? Object.values(ep41.tasks).filter(t => t.state === 'awaiting_user').length : 0;
    const poolN = PS.S.topics.filter(t => !t.trash && ['找', '写', '审'].includes(t.stage)).length;
    const doneN = PS.S.episodes.filter(e => e.finalAt).length;

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
        { id: 'cut-todo', label: '待剪',            href: '#cut-todo', on: active === 'cut-todo', count: 1 },
        { id: 'cut',      label: '剪辑中 · 镜头表', href: '#cut',      on: active === 'cut',      count: `EP${PS.S.cutProject.episode}`, hot: true },
        { id: 'cut-done', label: '剪好了',          href: '#cut-done', on: active === 'cut-done', count: 3 },
      ];
    }
    if (ws === 'publish') {
      return [
        { id: 'pub-todo',    label: '待发', href: '#pub-todo',    on: active === 'pub-todo', count: 1 },
        { id: 'pub-pack',    label: '打包', href: '#pub-pack',    on: active === 'pub-pack' },
        { id: 'pub-confirm', label: '确认', href: '#pub-confirm', on: active === 'pub-confirm', count: waitN ? `${waitN} 待点发` : '', hot: !!waitN },
        { id: 'pub-sent',    label: '已发', href: '#pub-sent',    on: active === 'pub-sent', count: 3 },
      ];
    }
    if (ws === 'review') {
      const list = [
        { id: 'review', label: '同龄复盘 · 抖音分析', href: '#review', on: active === 'review' },
      ];
      if (PS.S.settings.modules.conversion) {
        list.push({ id: 'conversion', label: '转化归因', href: '#conversion', on: active === 'conversion' });
      }
      return list;
    }
    // 系统与开源资产二级快捷切换
    const m = PS.S.settings.modules;
    const more = [
      { id: 'settings', label: '系统', href: '#settings', on: active === 'settings' },
      { id: 'releases', label: '上新', href: '#releases', on: active === 'releases' },
    ];
    if (m.tree) more.push({ id: 'tree', label: '知识树', href: '#tree', on: active === 'tree' });
    more.push({ id: 'said', label: '说过的话', href: '#said', on: active === 'said' });
    if (m.clients) more.push({ id: 'clients', label: '客户', href: '#clients', on: active === 'clients' });
    if (m.site) more.push({ id: 'site', label: '个人网站', href: '#site', on: active === 'site' });
    more.push({ id: 'position', label: '我的定位', href: '#position', on: active === 'position' });
    return more;
  }

  // ⌘K 完整跨工作台索引
  PS.cmdk = function () {
    const items = [
      { label: '中控 · 正在做与运营大屏', kind: '中控', hash: '#dashboard' },
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
      { label: '1/3/7 天同龄复盘 & 抖音作品分析', kind: '复盘', hash: '#review' },
      { label: '转化归因 · 自有站点漏斗', kind: '复盘', hash: '#conversion' },
      { label: '知识树 & 一键内化', kind: '资产', hash: '#tree' },
      { label: '我说过的话', kind: '资产', hash: '#said' },
      { label: '咨询客户 CRM', kind: '资产', hash: '#clients' },
      { label: '个人网站', kind: '资产', hash: '#site' },
      { label: '我的定位', kind: '资产', hash: '#position' },
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

  // 检测是否在原生 Mac App (WKWebView) 中运行，为红绿灯留出呼吸间距
  if (/ParkStudioMacApp/.test(navigator.userAgent)) {
    document.documentElement.classList.add('macos-app');
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

  function ensureChrome() {
    if (chromeMounted && document.getElementById('chromeTop')) return;
    chromeMounted = true;
    document.getElementById('app').innerHTML = `
      <div class="app">
        <header class="top-dock" id="chromeTop">
          <div class="top-dock-row">
            <div class="top-left">
              <a class="lg-brand lg-island" href="#dashboard" title="Park Studio · 开源内容中控">
                <svg class="brand-mark" viewBox="0 0 120 120" aria-hidden="true">
                  <path class="bm1" d="M14 66 Q30 28 48 86" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
                  <path class="bm2" d="M48 86 Q76 88 106 22" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle class="bm3" cx="48" cy="86" r="10"/>
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
              <a class="lg-btn lg-island" id="sysNavBtn" href="#settings" title="系统 · 守护进程 / 7 平台体检 / 集成">
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
    document.getElementById('moreMenuBtn').onclick = e => {
      e.stopPropagation();
      const host = document.getElementById('moreHost');
      if (host.querySelector('.lg-menu')) return host.querySelector('.lg-menu').remove();
      const m = PS.S.settings.modules;
      const unread = PS.S.notifications.filter(n => !n.read).length;
      const onlineN = PS.activePlats().filter(p => PS.S.platformStatus[p]?.state === 'ok').length;
      const activeN = PS.activePlats().length;
      host.insertAdjacentHTML('beforeend', `<div class="lg-menu" role="menu">
        <div class="rp-lbl">系统与开源社区</div>
        <a href="#settings">${PS.icon('sliders', 'sm')}系统与体检 <span class="sub" style="margin-left:auto;font-size:11px">${onlineN}/${activeN}</span></a>
        <a href="#releases">${PS.icon('spark', 'sm')}上新 · 版本动态 <span class="pill accent" style="margin-left:auto">v0.1.2</span></a>
        <button type="button" id="openNotifBtn">${PS.icon('bell', 'sm')}通知中心 ${unread ? `<span class="pill warn" style="margin-left:auto">${unread}</span>` : ''}</button>
        <div class="rp-sep"></div>
        <div class="rp-lbl">个人资产与扩展</div>
        ${m.tree ? `<a href="#tree">${PS.icon('tree', 'sm')}知识树与内化</a>` : ''}
        <a href="#said">${PS.icon('mic', 'sm')}我说过的话</a>
        <a href="#source/materials">${PS.icon('layers', 'sm')}视觉素材库</a>
        ${m.kline ? `<a href="#source/kline">${PS.icon('chart', 'sm')}K 线日报</a>` : ''}
        ${m.clients ? `<a href="#clients">${PS.icon('users', 'sm')}咨询客户 CRM</a>` : ''}
        ${m.site ? `<a href="#site">${PS.icon('globe', 'sm')}个人网站</a>` : ''}
        <a href="#position">${PS.icon('star', 'sm')}我的定位</a>
        <div class="rp-sep"></div>
        <button type="button" id="themeToggleMenu">◐ 切换深浅外观</button>
      </div>`);
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
    document.getElementById('sysNavBtn')?.classList.toggle('on', active === 'settings');
    document.getElementById('moreMenuBtn')?.classList.toggle('on', ws === 'more' && active !== 'settings');
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
      requestAnimationFrame(() => moveThumb(document.getElementById('subBar'), document.getElementById('subThumb'), '.lg-subtab.on', true));
    }
    lastWsKey = ws;
  }

  // 主外框 Shell（widthMode: '' | 'mid' | 'narrow'）
  PS.shell = function (active, crumbs, inner, widthMode = '') {
    ensureChrome();
    const ws = wsOf(active);
    PS._lastWs = ws;
    syncTopNav(ws, active);
    document.querySelectorAll('.lg-menu,.pop').forEach(p => p.remove());
    const main = document.getElementById('main');
    main.className = `page ${widthMode}`.trim();
    main.innerHTML = inner;
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
      if (b.lastMetricsAt) PS.S.daemon.lastMetricsAt = b.lastMetricsAt;
      PS.S.liveFollowerPlats = Object.keys(b.followersLive || {});
      if (b.followersLive) {
        for (const [pid, dayMap] of Object.entries(b.followersLive)) {
          if (dayMap && Object.keys(dayMap).length) {
            PS.S.followers[pid] = { ...(PS.S.followers[pid] || {}), ...dayMap };
          }
        }
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
    if (!location.hash || location.hash === '#home') location.hash = '#dashboard';
    await PS.syncFromBackend();
    PS.route();
  };
})();
