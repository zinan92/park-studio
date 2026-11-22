/* v1 首页 + 运营大屏 */
(function () {
  'use strict';
  const PS = window.PS;
  function epTotals(ep) {
    let views = 0, inter = 0, pub = 0, total = 0, todo = 0;
    for (const [p, t] of Object.entries(ep.tasks || {})) {
      if (PS.S.platformStatus[p]?.disabled) continue;
      total++; if (t.state === 'published') pub++; if (t.state === 'awaiting_user') todo++;
      if (t.m) { views += t.m.views || 0; inter += (t.m.likes || 0) + (t.m.comments || 0) + (t.m.favorites || 0) + (t.m.shares || 0); }
    }
    return { views, inter, pub, total, todo };
  }
  let heroIdx = 0;
  PS.pages.dashboard = function () {
    const active = PS.activePlats(), eps = PS.S.episodes, slides = [eps[0], eps[3], eps[1]].filter(Boolean);
    if (heroIdx >= slides.length) heroIdx = 0;
    const pStats = active.map(id => ({ id, ...PS.fanStats(id) }));
    const totFans = pStats.reduce((s, x) => s + x.total, 0), totToday = pStats.reduce((s, x) => s + x.today, 0), tot7 = pStats.reduce((s, x) => s + x.d7, 0), tot30 = pStats.reduce((s, x) => s + x.d30, 0);
    const badPlats = active.filter(p => PS.S.platformStatus[p]?.state !== 'ok');
    const ep41 = eps[0], t41 = epTotals(ep41), topFan7 = [...pStats].sort((a, b) => b.d7 - a.d7)[0];
    const bestCh = [...PS.S.siteChannels].sort((a, b) => (b.vip / b.reg) - (a.vip / a.reg))[0];
    const insights = [
      { cls: 'g', tag: '涨粉', html: `近 7 天涨粉最多的是 <b>${PS.PLATFORMS[topFan7.id].name} ${PS.sgn(topFan7.d7)}</b>，占全网近 7 天合计 ${PS.sgn(tot7)} 的 <b>${PS.pct(topFan7.d7, tot7, 0)}</b>。` },
      { cls: 'o', tag: '发布日', html: `「${PS.esc(ep41.nick)}」发布首日全网播放 <b>${PS.fmt(t41.views)}</b>，是上一期同龄（68,400）的 <b>1.7 倍</b>，且尚有 ${t41.todo} 个国内平台待你点发。` },
      { cls: 'b', tag: '互动', html: `近 3 期平均互动率最高的是 <b>小红书 18.8%</b> 与 <b>B站 16.4%</b>，收藏转化远高于纯泛流量平台。` },
      { cls: 'p', tag: '转化', html: `${PS.esc(PS.S.settings.siteName)}里，来自 <b>${bestCh.label}</b> 的注册有 <b>${PS.pct(bestCh.vip, bestCh.reg, 1)}</b> 成了付费会员（¥${PS.fmt(bestCh.revenue)}）。` },
      { cls: 'g', tag: '闭环', html: `守护进程已自动回填 <b>${t41.pub}/${t41.total}</b> 条真实发布链接，不再依赖人工回贴。` },
    ];
    const platCards = pStats.map(ps => {
      const p = PS.PLATFORMS[ps.id], st = PS.S.platformStatus[ps.id];
      const recentViews = eps.slice(0, 3).reduce((s, e) => s + (e.tasks[ps.id]?.m?.views || 0), 0);
      return `<article class="pc" onclick="location.hash='#settings/platforms'" style="cursor:pointer"><div class="pc-glow" style="background:${p.color}"></div><div class="pc-top">${PS.plogo(ps.id, 26)}<b>${p.name}</b><span class="pc-st"><i class="dot ${st.state === 'ok' ? 'live' : 'warn'}"></i>${st.state === 'ok' ? '在线' : '待保活'}</span></div><div class="pc-val">${PS.fmt(ps.total)}</div><div class="row" style="gap:5px"><span class="gpill">今<b>${PS.sgn(ps.today)}</b></span><span class="gpill">7日<b>${PS.sgn(ps.d7)}</b></span></div><div class="pc-sp">${PS.sparklineSVG(ps.id, PS.S.followers[ps.id])}</div><div class="pc-ft"><div>近 30 日涨粉<b>${PS.sgn(ps.d30)}</b></div><div>近 3 期播放<b>${PS.kfmt(recentViews)}</b></div></div></article>`;
    }).join('');
    const totalRev = PS.S.siteChannels.reduce((s, x) => s + x.revenue, 0), totalReg = PS.S.siteChannels.reduce((s, x) => s + x.reg, 0), lastLog = PS.S.daemonLogs[0];

    const main = PS.shell('dashboard', [['运营大屏', '#dashboard']], `
      <div class="ph"><div><h1>运营大屏</h1><p>全平台粉丝、发布进度、1/3/7 天同龄表现与转化归因一屏总览；数据由本机专用 Chrome 守护进程自动采集。</p></div>
        <div class="acts"><div class="dash-lights"><span class="dlight"><i class="dot live"></i>专用 Chrome :${PS.S.daemon.chromePort}</span><a href="#settings/platforms" class="dlight ${badPlats.length ? 'bad' : ''}"><i class="dot ${badPlats.length ? 'warn' : 'live'}"></i>${badPlats.length ? `${badPlats.length} 家待保活（${badPlats.map(p => PS.PLATFORMS[p].name).join('、')}）` : `${active.length}/${active.length} 平台正常`}</a><span class="dlight">上次采数 ${PS.esc(PS.S.daemon.lastMetricsAt)}</span></div><button class="btn primary" id="dashCollect">${PS.icon('refresh')}立即采数</button></div></div>
      <section class="dash-r1">
        <div class="hero-ep" id="heroCard"></div>
        <div class="card"><div class="card-h"><h3>全平台总粉丝</h3><span class="sub">按平台堆叠 · 虚线为发布日</span></div><div class="fans-head"><div class="kpi-val xl">${PS.fmt(totFans)}</div><div class="row" style="gap:6px;padding-bottom:4px"><span class="gpill">今日<b>${PS.sgn(totToday)}</b></span><span class="gpill">近 7 天<b>${PS.sgn(tot7)}</b></span><span class="gpill">近 30 天<b>${PS.sgn(tot30)}</b></span></div></div><div class="chart-box" id="fansChart"></div></div>
        <div class="card"><div class="card-h"><h3>人话结论</h3><a class="sub" href="#review">查看完整复盘 ›</a></div><div class="ins-list">${insights.map(i => `<div class="ins-item"><em class="${i.cls}">${i.tag}</em><div>${i.html}</div></div>`).join('')}</div></div>
      </section>
      <section><div class="card-h" style="margin-bottom:10px"><h2>各平台卡片（${active.length} 家启用中）</h2><a class="sub" href="#settings/platforms">管理专用 Chrome 与平台开关 ›</a></div><div class="plat-cards">${platCards}</div></section>
      <section class="dash-strip"><span><b>${PS.esc(PS.S.settings.siteName)}</b> 近 30 日注册 <b>${PS.fmt(totalReg)}</b> · 归因收入 <b style="color:var(--good)">¥${PS.fmt(totalRev)}</b></span><a href="#review/conversion">看转化漏斗 ›</a><span class="sub clip1 grow" style="text-align:right">最新动态：${PS.esc(lastLog.ts)} [${PS.esc(lastLog.ep)} · ${PS.esc(lastLog.plat)}] ${PS.esc(lastLog.action)} — ${PS.esc(lastLog.result)}</span><a class="btn s" href="#publish">进入发布中控</a></section>
    `);

    function renderHero() {
      const ep = slides[heroIdx], prev = eps.find(x => x.episode === ep.episode - 1), t = epTotals(ep), pt = prev ? epTotals(prev) : null;
      const ratio = pt && pt.views ? Math.min(100, (t.views / pt.views) * 100) : 0;
      const host = main.querySelector('#heroCard');
      host.innerHTML = `<div class="hero-stage"><div class="hero-cv" style="background:${ep.coverGrad}" onclick="location.hash='#works/${ep.id}'"><span class="ep-no">第 ${ep.episode} 期</span><h4>${PS.esc(ep.coverTitle).replace(/\n/g, '<br>')}</h4><span class="ep-prog">${t.pub}/${t.total} 平台已发布</span></div></div>
        <div class="hero-inf"><div class="hero-tabs">${slides.map((s, i) => `<button class="hero-tab ${i === heroIdx ? 'on' : ''}" data-hi="${i}">EP${s.episode} ${PS.esc(s.nick)}</button>`).join('')}</div>
        <div><div class="row" style="gap:8px;margin-bottom:4px"><span class="pill ${t.todo ? 'wait' : t.pub === t.total ? 'good' : 'info'}">${t.todo ? `${t.todo} 家已填好，等你点发布` : t.pub === t.total ? '全平台已闭环' : '排期计划中'}</span><span class="sub">${PS.esc((ep.schedule || '').slice(0, 16).replace('T', ' '))}</span></div><h2 class="m0 clip2" style="font-size:19px;line-height:1.35">${PS.esc(ep.title)}</h2></div>
        <div class="hero-plats">${active.map(pid => { const tk = ep.tasks[pid]; if (!tk) return ''; const cls = tk.state === 'published' ? 'on' : tk.state === 'awaiting_user' ? 'todo' : tk.state === 'scheduled' ? 'sch' : ''; const lbl = tk.state === 'published' ? (tk.m ? PS.kfmt(tk.m.views) : '已发布') : tk.state === 'awaiting_user' ? '等你点发' : tk.state === 'scheduled' ? '已定时' : '待开跑'; return `<div class="hpl ${cls}" onclick="location.hash='#publish/${ep.id}'">${PS.plogo(pid, 18)}<span class="clip1">${PS.PLATFORMS[pid].name}</span><span class="st">${lbl}</span></div>`; }).join('')}</div>
        <div class="hero-nums"><div><div class="kpi-lab">全平台播放</div><div class="kpi-val">${t.views ? PS.fmt(t.views) : '–'}</div></div><div><div class="kpi-lab">总互动</div><div class="kpi-val">${t.inter ? PS.fmt(t.inter) : '–'}</div></div><div><div class="kpi-lab">互动率</div><div class="kpi-val">${t.views ? PS.pct(t.inter, t.views, 1) : '–'}</div></div><div class="grow" style="min-width:160px;align-self:flex-end">${pt ? `<div class="sub" style="font-size:12px">对比上期「${PS.esc(prev.nick)}」${t.views ? `已达其总播放 ${PS.pct(t.views, pt.views, 0)}` : '尚未发出'}</div><div class="cmp-bar"><i style="width:${ratio.toFixed(1)}%"></i></div>` : ''}</div></div></div>`;
      host.querySelectorAll('[data-hi]').forEach(b => b.onclick = () => { heroIdx = +b.dataset.hi; renderHero(); });
    }
    renderHero();
    PS.drawStackedFans(main.querySelector('#fansChart'), PS.S.followers, active, eps);
    main.querySelector('#dashCollect').onclick = () => {
      for (const p of active) { const days = Object.keys(PS.S.followers[p]).sort(); PS.S.followers[p][days[days.length - 1]] += Math.floor(Math.random() * 14) + 3; }
      PS.S.daemon.lastMetricsAt = '刚刚'; PS.save(); PS.toast('采数完成，大屏已更新', 'good'); PS.pages.dashboard();
    };
  };

  PS.pages.home = function () {
    const d = PS.S.doing, ep41 = PS.S.episodes[0], t41 = epTotals(ep41);
    const totFans = PS.activePlats().reduce((s, p) => s + PS.fanStats(p).total, 0), totToday = PS.activePlats().reduce((s, p) => s + PS.fanStats(p).today, 0);
    PS.shell('home', [['首页', '#home']], `
      <div class="ph"><div><p class="sub m0">今天 · v1 完整平铺版</p><h1>今天想干什么？</h1></div><div class="acts"><a class="btn" href="#dashboard">打开运营大屏</a><a class="btn primary" href="#publish">去发布中控</a></div></div>
      <button type="button" class="hm-now" onclick="location.hash='#${d.stage}'"><span class="hm-ic">${PS.icon('play')}</span><span class="min0 grow"><div class="sub" style="color:var(--accent);font-weight:700">接着做 · 第 ${d.episode} 期</div><b style="font-size:15.5px">${PS.esc(d.title)}</b></span><span class="btn primary s">继续写稿 ›</span></button>
      <div class="hm-grid">
        <button type="button" class="hm-peek" onclick="location.hash='#dashboard'"><span class="hm-ph"><span class="hm-ic">${PS.icon('dashboard')}</span><b>运营大屏速览</b><span class="hm-more">进指挥中心 ›</span></span><div class="row" style="gap:16px"><div><div class="kpi-lab">全平台总粉丝</div><div class="kpi-val" style="font-size:24px">${PS.fmt(totFans)}</div></div><div><div class="kpi-lab">今日净增</div><div class="kpi-val" style="font-size:24px;color:var(--good)">${PS.sgn(totToday)}</div></div><div><div class="kpi-lab">待点发布</div><div class="kpi-val" style="font-size:24px;color:var(--hot)">${t41.todo} 家</div></div></div></button>
        <button type="button" class="hm-peek" onclick="location.hash='#feed'"><span class="hm-ph"><span class="hm-ic">${PS.icon('flame')}</span><b>你的对标，哪条火了</b><span class="hm-more">看全部 ›</span></span><span class="hm-lines">${PS.S.feed.slice(0, 3).map((f, i) => `<span class="hm-line"><i class="hm-i">${i + 1}</i><span class="clip1 grow"><b class="hm-x">${f.multiple}×</b> ${PS.esc(f.title)}</span></span>`).join('')}</span></button>
        <button type="button" class="hm-peek" onclick="location.hash='#source'"><span class="hm-ph"><span class="hm-ic">${PS.icon('star')}</span><b>今天的 Park 信源</b><span class="hm-more">读日报 ›</span></span><span class="hm-lines">${PS.S.sources.newsletter.slice(0, 3).map((n, i) => `<span class="hm-line"><i class="hm-i">${i + 1}</i><span class="clip1 grow">${PS.esc(n.title)}</span></span>`).join('')}</span></button>
        <button type="button" class="hm-peek" onclick="location.hash='#works'"><span class="hm-ph"><span class="hm-ic">${PS.icon('film')}</span><b>最近作品闭环状态</b><span class="hm-more">看矩阵 ›</span></span><span class="hm-lines">${PS.S.episodes.slice(0, 3).map((e, i) => { const et = epTotals(e); return `<span class="hm-line"><i class="hm-i">${i + 1}</i><span class="clip1 grow">EP${e.episode} ${PS.esc(e.nick)}</span><span class="pill ${et.todo ? 'wait' : 'good'}">${et.pub}/${et.total} · ${PS.kfmt(et.views)}</span></span>`; }).join('')}</span></button>
      </div>
    `);
  };
})();
