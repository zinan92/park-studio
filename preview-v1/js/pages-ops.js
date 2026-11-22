/* v1 发布中控 / 作品矩阵 / 复盘与转化 / 总览 */
(function () {
  'use strict';
  const PS = window.PS;
  const SM = { published: { label: '已发布 · 已取链', cls: 'good' }, scheduled: { label: '已定时', cls: 'info' }, awaiting_user: { label: '填好 · 等你点发', cls: 'wait' }, running: { label: '填表中…', cls: 'accent' }, planned: { label: '计划中', cls: '' } };
  let pv = 'hub', eid = 104;

  PS.pages.publish = function (sub) {
    if (sub && !isNaN(+sub)) eid = +sub;
    const ep = PS.S.episodes.find(e => e.id === eid) || PS.S.episodes[0], active = PS.activePlats();
    let body = '';
    if (pv === 'hub') {
      body = `<div class="card row"><select id="epSel" style="max-width:420px;font-weight:700">${PS.S.episodes.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select><span class="pill good">faststart ✓</span><span class="grow"></span><button class="btn primary" id="fillAll">分批启动 7 平台填表</button></div>
        <section class="pub-grid">${active.map(pid => {
          const p = PS.PLATFORMS[pid], t = ep.tasks[pid] || { state: 'planned', detail: '未开跑' }, sm = SM[t.state] || SM.planned;
          const btn = t.state === 'planned' ? `<button class="btn primary s" data-fill="${pid}">专用 Chrome 填表</button>` : t.state === 'awaiting_user' ? `<button class="btn good s" data-sync="${pid}">我已点发 → 自动取链</button>` : t.state === 'published' ? `<span class="sub">已回填链接</span>` : `<button class="btn s" data-sync="${pid}">立即取链</button>`;
          return `<div class="pub-card ${t.state}"><div class="row">${PS.plogo(pid, 24)}<b>${p.name}</b><span class="grow"></span><span class="pill ${sm.cls}">${sm.label}</span></div><div class="sub" style="min-height:36px">${PS.esc(t.detail || '')}</div><div class="row">${btn}</div></div>`;
        }).join('')}</section>`;
    } else {
      const cells = [];
      for (let off = -5; off <= 8; off++) {
        const dt = new Date(Date.now() + off * 864e5), pad = n => String(n).padStart(2, '0'), ds = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        const hits = PS.S.episodes.filter(e => (e.schedule || '').slice(0, 10) === ds);
        cells.push(`<div class="cal-day ${off === 0 ? 'today' : ''}"><b class="mono">${ds.slice(5)}</b>${hits.map(e => `<div class="cal-ep pub" onclick="location.hash='#publish/${e.id}'">EP${e.episode} ${PS.esc(e.nick)}</div>`).join('')}</div>`);
      }
      body = `<div class="cal-grid">${cells.join('')}</div>`;
    }
    const main = PS.shell('publish', [['发与盘', '#publish'], ['发布中控', '#publish']], `<div class="ph"><div><h1>发布中控 · 7 平台自动填表闭环</h1></div><div class="acts"><div class="seg"><button class="${pv === 'hub' ? 'on' : ''}" id="tHub">自动填表队列</button><button class="${pv === 'cal' ? 'on' : ''}" id="tCal">分发日历</button></div></div></div>${body}`);
    main.querySelector('#tHub').onclick = () => { pv = 'hub'; PS.pages.publish(); };
    main.querySelector('#tCal').onclick = () => { pv = 'cal'; PS.pages.publish(); };
    main.querySelector('#epSel')?.addEventListener('change', e => { eid = +e.target.value; PS.pages.publish(); });
    main.querySelectorAll('[data-fill]').forEach(b => b.onclick = () => {
      const pid = b.dataset.fill, p = PS.PLATFORMS[pid];
      ep.tasks[pid] = p.mode === 'manual' ? { state: 'awaiting_user', detail: '已填好并截图留档，等你点发布', url: '' } : { state: 'published', detail: '已校验提交并取链', url: '#', m: { views: 1820, likes: 94 } };
      PS.save(); PS.toast(`${p.name} 填表完成`, 'good'); PS.pages.publish();
    });
    main.querySelector('#fillAll')?.addEventListener('click', () => {
      for (const pid of active) if ((ep.tasks[pid]?.state || 'planned') === 'planned') ep.tasks[pid] = PS.PLATFORMS[pid].mode === 'manual' ? { state: 'awaiting_user', detail: '已填好等你点发', url: '' } : { state: 'published', detail: '已自动提交', url: '#', m: { views: 2100 } };
      PS.save(); PS.toast('已完成分批填表', 'good'); PS.pages.publish();
    });
    main.querySelectorAll('[data-sync]').forEach(b => b.onclick = () => {
      const pid = b.dataset.sync;
      ep.tasks[pid] = { state: 'published', detail: '已自动回填真实链接', url: '#', m: { views: 6200, likes: 380, fans: 54 } };
      PS.save(); PS.toast('已自动取链写回作品页与大屏', 'good'); PS.pages.publish();
    });
  };

  PS.pages.works = function () {
    const active = PS.activePlats();
    PS.shell('works', [['发与盘', '#publish'], ['作品', '#works']], `
      <div class="ph"><div><h1>作品 · 全平台矩阵</h1></div><div class="acts"><a class="btn primary" href="#publish">去发布中控</a></div></div>
      <section class="card pad-0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>作品</th>${active.map(pid => `<th style="text-align:center">${PS.PLATFORMS[pid].name}</th>`).join('')}</tr></thead>
      <tbody>${PS.S.episodes.map(e => `<tr><td><b>EP${e.episode} · ${PS.esc(e.nick)}</b></td>${active.map(pid => { const t = e.tasks[pid]; return `<td style="text-align:center">${t?.state === 'published' && t.m ? `<span class="wk-cell-n">${PS.kfmt(t.m.views)}</span>` : t?.state === 'awaiting_user' ? `<a class="wk-cell-wait" href="#publish/${e.id}">等你点发</a>` : `<span class="wk-cell-dot">·</span>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></section>`);
  };

  PS.pages.review = function (tab = 'age') {
    const cur = ['age', 'douyin', 'conversion'].includes(tab) ? tab : 'age';
    let body = '';
    if (cur === 'age') body = `<div class="hm-grid">${PS.S.episodes.slice(0, 2).map(ep => `<div class="card stack"><span class="pill accent" style="width:fit-content">EP${ep.episode} 同龄复盘</span><h3 class="m0">${PS.esc(ep.nick)}</h3>${ep.reviews.map(r => `<p class="m0">第 ${r.age} 天：播放 <b>${PS.fmt(r.views)}</b>（上期同龄 ${PS.fmt(r.prevViews)}，<b>${(r.views / r.prevViews).toFixed(1)}×</b>）· 涨粉 +${r.fans}</p>`).join('')}</div>`).join('')}</div>`;
    else if (cur === 'douyin') body = `<div class="card stack"><h3 class="m0">抖音作品分析：时长 × 播放</h3><div class="chart-box tall" id="dyScatter"></div></div>`;
    else {
      const totReg = PS.S.siteChannels.reduce((s, x) => s + x.reg, 0), totVip = PS.S.siteChannels.reduce((s, x) => s + x.vip, 0), totRev = PS.S.siteChannels.reduce((s, x) => s + x.revenue, 0);
      body = `<div class="funnel-steps"><div class="fstep"><div class="kpi-lab">播放</div><div class="kpi-val">538,780</div><div class="fstep-bar"><i style="width:100%"></i></div></div><div class="fstep"><div class="kpi-lab">注册</div><div class="kpi-val">${PS.fmt(totReg)}</div><div class="fstep-bar"><i style="width:62%"></i></div></div><div class="fstep"><div class="kpi-lab">会员</div><div class="kpi-val">${PS.fmt(totVip)}</div><div class="fstep-bar"><i style="width:36%"></i></div></div><div class="fstep"><div class="kpi-lab">收入</div><div class="kpi-val" style="color:var(--good)">¥${PS.fmt(totRev)}</div><div class="fstep-bar"><i style="width:24%"></i></div></div></div>`;
    }
    const main = PS.shell('review', [['发与盘', '#publish'], ['复盘与转化', '#review']], `<div class="ph"><div><h1>复盘与转化归因</h1></div><div class="acts"><div class="seg"><button class="${cur === 'age' ? 'on' : ''}" onclick="location.hash='#review/age'">1/3/7 同龄复盘</button><button class="${cur === 'douyin' ? 'on' : ''}" onclick="location.hash='#review/douyin'">抖音分析</button><button class="${cur === 'conversion' ? 'on' : ''}" onclick="location.hash='#review/conversion'">转化漏斗</button></div></div></div>${body}`);
    if (cur === 'douyin') PS.drawDouyinScatter(main.querySelector('#dyScatter'));
  };

  PS.pages.topics = function () {
    PS.shell('topics', [['发与盘', '#publish'], ['总览', '#topics']], `<div class="ph"><div><h1>总览 · 全部选题</h1></div></div><section class="card pad-0"><table class="tbl"><thead><tr><th>选题</th><th>停在</th><th class="n">分数</th></tr></thead><tbody>${PS.S.topics.filter(t => !t.trash).map(t => `<tr><td><b>${PS.esc(t.title)}</b></td><td><span class="pill accent">${t.stage}</span></td><td class="n">${t.score}/15</td></tr>`).join('')}</tbody></table></section>`);
  };
})();
