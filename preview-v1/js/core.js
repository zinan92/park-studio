/* Park Studio v1 核心框架（完整左栏平铺版，跑在 :8793 方便与 v2 对比） */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const STORE_KEY = 'park-studio:state:v1';

  PS.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PS.fmt = n => (n == null || isNaN(n)) ? '–' : Math.round(n).toLocaleString('en-US');
  PS.kfmt = n => (n == null || isNaN(n)) ? '–' : n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}万` : PS.fmt(n);
  PS.sgn = n => (n == null ? '–' : (n > 0 ? '+' : '') + PS.fmt(n));
  PS.pct = (a, b, d = 1) => b ? `${((a / b) * 100).toFixed(d)}%` : '–';

  PS.loadState = function () {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return PS.defaultState();
  };
  PS.S = PS.loadState();
  PS.save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(PS.S)); } catch (e) {} };
  PS.resetDemo = () => { localStorage.removeItem(STORE_KEY); PS.S = PS.defaultState(); PS.save(); PS.toast('已重置 v1 演示数据', 'good'); PS.route(); };

  PS.fanStats = p => {
    const map = PS.S.followers[p] || {}, days = Object.keys(map).sort();
    if (!days.length) return { total: 0, today: 0, d7: 0, d30: 0 };
    const last = map[days[days.length - 1]], prev = days.length > 1 ? map[days[days.length - 2]] : last;
    return { total: last, today: last - prev, d7: last - (map[days[Math.max(0, days.length - 8)]] ?? last), d30: last - (map[days[0]] ?? last) };
  };
  PS.activePlats = () => PS.PLAT_ORDER.filter(id => !PS.S.platformStatus[id]?.disabled);

  PS.toast = (msg, kind = 'good') => {
    const host = document.getElementById('toasts'), el = document.createElement('div');
    el.className = `toast ${kind}`; el.textContent = msg; host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, 3000);
  };
  PS.modal = ({ title, body, foot = '', wide = false, onOpen }) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}"><div class="modal-h"><h3>${PS.esc(title)}</h3><button class="btn ghost icon" data-x>${PS.icon('x')}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x],[data-close]')) close(); });
    document.body.appendChild(bg);
    if (onOpen) onOpen(bg, close);
    return close;
  };
  PS.toggleTheme = () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    try { localStorage.setItem('ps:theme', cur); } catch (e) {}
    PS.toast(cur === 'dark' ? '已切换深色模式' : '已切换浅色模式');
  };

  PS.cmdk = () => {
    const items = [
      { label: '首页 · 今天想干什么？', kind: '页面', hash: '#home' },
      { label: '运营大屏 · 指挥中心', kind: '核心', hash: '#dashboard' },
      { label: 'Park 信源', kind: '信源', hash: '#source' },
      { label: '找 · 爆款榜', kind: '写一条', hash: '#feed' },
      { label: '拆 · 拆解报告', kind: '写一条', hash: '#chai' },
      { label: '写 · 口播稿', kind: '写一条', hash: '#write' },
      { label: '审 · 三路审稿单', kind: '写一条', hash: '#audit' },
      { label: '发布中控', kind: '闭环', hash: '#publish' },
      { label: '作品矩阵', kind: '闭环', hash: '#works' },
      { label: '复盘与转化', kind: '闭环', hash: '#review' },
      { label: '总览看板', kind: '管理', hash: '#topics' },
      { label: '知识树', kind: '资产', hash: '#tree' },
      { label: '口播稿与原话', kind: '资产', hash: '#scripts' },
      { label: '咨询客户 CRM', kind: '资产', hash: '#clients' },
      { label: '个人网站', kind: '资产', hash: '#site' },
      { label: '设置与平台', kind: '系统', hash: '#settings' },
    ];
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="cmdk-box"><input type="search" placeholder="搜索页面和作品…" autofocus><ul class="cmdk-list"></ul></div>`;
    const inp = bg.querySelector('input'), ul = bg.querySelector('ul');
    let list = items, idx = 0;
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      list = items.filter(x => !q || x.label.toLowerCase().includes(q)).slice(0, 14);
      idx = Math.min(idx, Math.max(0, list.length - 1));
      ul.innerHTML = list.map((x, i) => `<li class="${i === idx ? 'on' : ''}" data-i="${i}"><span>${PS.esc(x.label)}</span><small class="sub">${PS.esc(x.kind)}</small></li>`).join('');
    };
    const pick = i => { const x = list[i]; if (!x) return; bg.remove(); location.hash = x.hash; };
    inp.oninput = () => { idx = 0; draw(); };
    inp.onkeydown = e => { if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, list.length - 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); draw(); e.preventDefault(); } if (e.key === 'Enter') pick(idx); if (e.key === 'Escape') bg.remove(); };
    ul.onclick = e => { const li = e.target.closest('[data-i]'); if (li) pick(+li.dataset.i); };
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    document.body.appendChild(bg); draw(); inp.focus();
  };

  document.addEventListener('mousemove', e => {
    const t = e.target.closest?.('[data-tip]'), el = document.getElementById('tip');
    if (!el) return;
    if (!t) { el.style.display = 'none'; return; }
    el.textContent = t.dataset.tip; el.style.display = 'block';
    el.style.left = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 14, e.clientX + 14)) + 'px';
    el.style.top = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 14, e.clientY + 14)) + 'px';
  });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); PS.cmdk(); } });

  PS.wendyOpen = false;
  PS.toggleWendy = force => { PS.wendyOpen = typeof force === 'boolean' ? force : !PS.wendyOpen; document.getElementById('wendyDrawer')?.classList.toggle('open', PS.wendyOpen); };
  function renderWendyDrawer() {
    const msgs = PS.S.wendyMsgs.map(m => `<div class="wd-msg ${m.role}"><div>${PS.esc(m.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>${m.card ? `<div class="wd-card"><div style="font-weight:700;font-size:12.5px">${PS.esc(m.card.title)}</div><div class="sub" style="margin:3px 0 8px">${PS.esc(m.card.desc)}</div><a class="btn primary s" href="${m.card.hash}" onclick="PS.toggleWendy(false)">${PS.esc(m.card.btn)}</a></div>` : ''}</div>`).join('');
    return `<aside class="wendy-drawer ${PS.wendyOpen ? 'open' : ''}" id="wendyDrawer"><div class="wd-head"><span class="wendy-av">W</span><div class="min0 grow"><b style="font-size:14px">Wendy · 本地助理</b><div class="sub" style="font-size:11.5px">本机 Claude Code CLI</div></div><button class="btn ghost icon" id="wdClose">${PS.icon('x')}</button></div><div class="wd-msgs" id="wdMsgs">${msgs}</div><form class="wd-in" id="wdForm"><input type="text" id="wdInput" placeholder="问 Wendy…"><button class="btn primary" type="submit">发</button></form></aside>`;
  }
  function bindWendy() {
    document.getElementById('wdClose')?.addEventListener('click', () => PS.toggleWendy(false));
    document.getElementById('wdForm')?.addEventListener('submit', e => {
      e.preventDefault(); const inp = document.getElementById('wdInput'), v = inp.value.trim(); if (!v) return; inp.value = '';
      PS.S.wendyMsgs.push({ role: 'me', text: v }, { role: 'ai', text: `已收到「${v}」，在 v1 完整平铺版中可直接在左栏一键直达对应模块。` });
      PS.save(); document.getElementById('wendyDrawer').outerHTML = renderWendyDrawer(); bindWendy();
    });
  }

  PS.shell = function (active, crumbs, inner) {
    const mods = PS.S.settings.modules;
    const ep41 = PS.S.episodes.find(e => e.episode === 41);
    const awaitingN = ep41 ? Object.values(ep41.tasks).filter(t => t.state === 'awaiting_user').length : 0;
    const onlineN = PS.activePlats().filter(p => PS.S.platformStatus[p]?.state === 'ok').length;
    const activeN = PS.activePlats().length;
    const unread = PS.S.notifications.filter(n => !n.read).length;
    const flowSteps = [['feed', 'feed', '找', '爆款榜'], ['chai', 'chai', '拆', '拆过的'], ['write', 'write', '写', '出稿'], ['audit', 'audit', '审', '改稿']];
    const platStrip = PS.PLAT_ORDER.map(id => {
      const p = PS.PLATFORMS[id], st = PS.S.platformStatus[id];
      return `<a class="plat-sq ${st.disabled ? 'off' : ''}" href="#settings/platforms" data-tip="${PS.esc(p.name)}：${PS.esc(st.disabled ? '已停用' : st.detail)}">${p.short}${st.disabled ? '' : `<i class="pdot ${st.state}"></i>`}</a>`;
    }).join('');
    const crumbHTML = crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${PS.esc(c[0])}</a>${PS.icon('right', 'sm')}` : `<b>${PS.esc(c[0])}</b>`).join('');

    document.getElementById('app').innerHTML = `<div class="app">
      <aside class="side" id="side">
        <a class="rail-brand" href="#position"><svg class="brand-mark" viewBox="0 0 120 120"><path class="bm1" d="M14 66 Q30 28 48 86" fill="none" stroke-width="9" stroke-linecap="round"/><path class="bm2" d="M48 86 Q76 88 106 22" fill="none" stroke-width="11" stroke-linecap="round"/><circle class="bm3" cx="48" cy="86" r="9"/></svg><span class="brand-t"><b>Park Studio</b><small>v1 完整平铺版 <span class="brand-badge">8793</span></small></span></a>
        <button type="button" class="rail-search" id="railSearch"><span>搜索页面、作品、选题</span><kbd>⌘K</kbd></button>
        <nav>
          <a class="navi ${active === 'home' ? 'on' : ''}" href="#home"><span>${PS.icon('spark', 'rail-ic')}首页</span></a>
          <a class="navi ${active === 'dashboard' ? 'on' : ''}" href="#dashboard"><span>${PS.icon('dashboard', 'rail-ic')}运营大屏</span><span class="count good">实时</span></a>
          ${mods.source ? `<a class="navi rail-src ${active === 'source' ? 'on' : ''}" href="#source"><span>${PS.icon('star', 'rail-ic')}Park 信源</span></a>` : ''}
          <a class="rail-now" href="#${PS.S.doing.stage}"><small>${PS.icon('flame', 'sm')} 正在做 · EP${PS.S.doing.episode}</small><b>${PS.esc(PS.S.doing.title)}</b></a>
          <div class="sect">写一条</div>
          ${flowSteps.map(([h, k, g, l]) => `<a class="navi ${active === k ? 'on' : ''}" href="#${h}"><span><i class="zx-k ${PS.S.doing.steps[k] || ''}">${g}</i>${l}</span></a>`).join('')}
          <div class="sect">发与盘（闭环）</div>
          <a class="navi ${active === 'publish' ? 'on' : ''}" href="#publish"><span>${PS.icon('send', 'rail-ic')}发布中控</span>${awaitingN ? `<span class="count hot">${awaitingN} 待点发</span>` : '<span class="count good">已闭环</span>'}</a>
          <a class="navi ${active === 'works' ? 'on' : ''}" href="#works"><span>${PS.icon('film', 'rail-ic')}作品</span><span class="count">${PS.S.episodes.length}</span></a>
          <a class="navi ${active === 'review' ? 'on' : ''}" href="#review"><span>${PS.icon('chart', 'rail-ic')}复盘与转化</span></a>
          <a class="navi ${active === 'topics' ? 'on' : ''}" href="#topics"><span>${PS.icon('board', 'rail-ic')}总览</span></a>
          <div class="sect">我的资产</div>
          ${mods.tree ? `<a class="navi ${active === 'tree' ? 'on' : ''}" href="#tree"><span>${PS.icon('tree', 'rail-ic')}知识树</span></a>` : ''}
          <a class="navi ${active === 'scripts' ? 'on' : ''}" href="#scripts"><span>${PS.icon('doc', 'rail-ic')}口播稿与原话</span></a>
          ${mods.clients ? `<a class="navi ${active === 'clients' ? 'on' : ''}" href="#clients"><span>${PS.icon('users', 'rail-ic')}咨询客户</span><span class="count">${PS.S.clients.length}</span></a>` : ''}
          ${mods.site ? `<a class="navi ${active === 'site' ? 'on' : ''}" href="#site"><span>${PS.icon('globe', 'rail-ic')}个人网站</span></a>` : ''}
        </nav>
        <div class="rail-foot">
          <div class="rail-foot-row"><a class="navi rail-set ${active === 'settings' ? 'on' : ''}" href="#settings"><span>${PS.icon('sliders', 'rail-ic')}设置与平台</span></a><button type="button" class="theme-btn" id="themeBtn">◐</button></div>
          <div class="plat-strip">${platStrip}</div>
          <a class="sync" href="#settings/platforms"><span class="dot live"></span><span class="clip1">守护进程 · ${onlineN}/${activeN} 在线</span></a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar" id="topbar">
          <button class="btn ghost icon burger" id="burger">${PS.icon('menu')}</button>
          <div class="crumbs">${crumbHTML}</div>
          <a class="mode-pill" href="http://127.0.0.1:8792/#home" target="_blank" title="在新标签页打开 v2 四工作台极简版对比"><span class="mp-dot"></span><span>对比 v2（:8792）↗</span></a>
          <button type="button" class="wendy-btn" id="wendyBtn"><span class="wendy-av">W</span><span>问 Wendy</span></button>
          <div class="rel"><button class="btn ghost icon rel" id="bellBtn">${PS.icon('bell', 'lg')}${unread ? `<span class="badge">${unread}</span>` : ''}</button></div>
        </header>
        <main class="page" id="main">${inner}</main>
      </div>
    </div>${renderWendyDrawer()}`;

    document.getElementById('railSearch').onclick = () => PS.cmdk();
    document.getElementById('themeBtn').onclick = () => PS.toggleTheme();
    document.getElementById('wendyBtn').onclick = () => PS.toggleWendy();
    document.getElementById('burger').onclick = () => document.getElementById('side').classList.toggle('open');
    document.getElementById('bellBtn').onclick = e => {
      e.stopPropagation(); const host = e.currentTarget.parentElement;
      if (host.querySelector('.pop')) return host.querySelector('.pop').remove();
      host.insertAdjacentHTML('beforeend', `<div class="pop"><div class="pop-h"><b>通知</b><button class="btn ghost s" id="readAll">全部已读</button></div><div class="pop-list">${PS.S.notifications.map(n => `<a class="pop-item ${n.read ? '' : 'unread'}" href="${n.link}">${PS.icon('alert')}<div><div>${PS.esc(n.title)}</div><small>${PS.esc(n.time)}</small></div></a>`).join('')}</div></div>`);
      host.querySelector('#readAll').onclick = () => { PS.S.notifications.forEach(n => (n.read = true)); PS.save(); host.querySelector('.pop')?.remove(); PS.route(); };
    };
    bindWendy();
    return document.getElementById('main');
  };

  document.addEventListener('click', e => { document.querySelectorAll('.pop').forEach(p => { if (!p.parentElement.contains(e.target)) p.remove(); }); });
  PS.pages = {};
  PS.route = () => { const [h, s] = (location.hash || '#dashboard').replace(/^#/, '').split('/'); (PS.pages[h] || PS.pages.dashboard)(s); window.scrollTo(0, 0); };
  PS.boot = () => { window.addEventListener('hashchange', PS.route); if (!location.hash) location.hash = '#dashboard'; PS.route(); };
})();
