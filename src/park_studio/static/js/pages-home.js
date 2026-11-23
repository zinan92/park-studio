/* 首页（对齐线上版极简留白） + 复盘工作台 · 运营大屏 */
(function () {
  'use strict';
  const PS = window.PS;

  function epTotals(ep) {
    let views = 0, inter = 0, pub = 0, total = 0, todo = 0;
    for (const [p, t] of Object.entries(ep.tasks || {})) {
      if (PS.S.platformStatus[p]?.disabled) continue;
      total++;
      if (t.state === 'published') pub++;
      if (t.state === 'awaiting_user') todo++;
      if (t.m) {
        views += t.m.views || 0;
        inter += (t.m.likes || 0) + (t.m.comments || 0) + (t.m.favorites || 0) + (t.m.shares || 0);
      }
    }
    return { views, inter, pub, total, todo };
  }

  // ==================== 首页入口统一并入「中控」（#dashboard） ====================
  PS.pages.home = function () {
    return PS.pages.dashboard();
  };

  function openQuickImportModal() {
    PS.modal({
      title: '导入本地素材或贴一段文字',
      body: `<div class="stack">
        <div class="hm-drop" id="mDropZone">
          <div class="hm-drop-in">
            <span class="hm-ic">${PS.icon('upload')}</span>
            <div class="min0 grow">
              <b style="font-size:14px">整个视频文件夹或 .srt 拖进来</b>
              <div class="sub">视频只在你电脑上读取时长与路径，绝不上传云端</div>
            </div>
            <button class="btn primary s" type="button" id="mPickFiles">选文件</button>
            <input type="file" id="mFileIn" multiple hidden>
          </div>
          <div id="mDropRes" hidden style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line-soft)"></div>
        </div>
        <div class="stack tight">
          <label style="font-size:13px;font-weight:600">或者直接贴一段文字，交给本地 Agent 理成口播稿</label>
          <textarea id="mPasteTxt" rows="5" placeholder="把你随口说的话或草稿粘贴进来…"></textarea>
        </div>
      </div>`,
      foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="mPasteGo">理成口播稿 ›</button>`,
      onOpen(mb, close) {
        const fin = mb.querySelector('#mFileIn'), dz = mb.querySelector('#mDropZone'), dres = mb.querySelector('#mDropRes');
        const showFiles = files => {
          if (!files || !files.length) return;
          dres.hidden = false;
          dres.innerHTML = `<div class="row"><span class="pill good">已读入 ${files.length} 个文件</span><span class="sub grow clip1">${PS.esc([...files].map(f => f.name).join(' · '))}</span><a class="btn primary s" href="#cut" data-close>去镜头表 ›</a></div>`;
        };
        mb.querySelector('#mPickFiles').onclick = () => fin.click();
        fin.onchange = e => showFiles(e.target.files);
        dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
        dz.ondragleave = () => dz.classList.remove('over');
        dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); showFiles(e.dataTransfer.files); };
        mb.querySelector('#mPasteGo').onclick = () => {
          const v = mb.querySelector('#mPasteTxt').value.trim();
          if (!v) return PS.toast('先贴一段文字，或者直接选文件', 'warn');
          PS.S.script.body = v;
          PS.save();
          close();
          location.hash = '#write';
        };
      },
    });
  }

  // ==================== 中控（#dashboard · 「正在做」+ 运营大屏一屏总览） ====================
  let heroIdx = 0;

  PS.pages.dashboard = function () {
    const active = PS.activePlats();
    const cut = PS.S.cutProject;
    const iss = PS._newsletterIssue;
    const topNews = iss?.parts?.length
      ? iss.parts.flatMap(p => p.groups.flatMap(g => g.items)).slice(0, 3)
      : PS.S.sources.newsletter.slice(0, 3);
    const newsCount = iss?.total || PS.S.sources.newsletter.length;
    const eps = PS.S.episodes;
    const slides = [eps[0], eps[1], eps[3]].filter(Boolean);
    if (heroIdx >= slides.length) heroIdx = 0;

    const pStats = active.map(id => ({ id, ...PS.fanStats(id) }));
    const totFans = pStats.reduce((s, x) => s + x.total, 0);
    const totToday = pStats.reduce((s, x) => s + x.today, 0);
    const tot7 = pStats.reduce((s, x) => s + x.d7, 0);
    const tot30 = pStats.reduce((s, x) => s + x.d30, 0);
    const topFan7 = [...pStats].sort((a, b) => b.d7 - a.d7)[0];
    const ep41 = eps[0], t41 = epTotals(ep41);
    const waitNames = active.filter(pid => ep41.tasks[pid]?.state === 'awaiting_user').map(pid => PS.PLATFORMS[pid].name);

    const insights = [
      { cls: 'g', tag: '涨粉', html: `近 7 天涨粉最多的是 <b>${PS.PLATFORMS[topFan7.id].name} ${PS.sgn(topFan7.d7)}</b>，占全网近 7 天合计 ${PS.sgn(tot7)} 的 <b>${PS.pct(topFan7.d7, tot7, 0)}</b>。` },
      { cls: 'o', tag: '发布日', html: `「${PS.esc(ep41.nick)}」首日全网播放 <b>${PS.fmt(t41.views)}</b>，是上期同龄的 <b>1.7 倍</b>；还有 ${t41.todo} 家国内平台等你点发。` },
      { cls: 'b', tag: '互动', html: `近 3 期平均互动率最高是 <b>小红书 18.8%</b>、<b>B站 16.4%</b>，干货收藏比远超泛流量平台。` },
      { cls: 'p', tag: '转化', html: `${PS.esc(PS.S.settings.siteName)}近 30 日归因收入 <b>¥20,350</b>，B 站注册→付费转化率最高（14.3%）。` },
    ];

    const main = PS.shell('dashboard', [['中控', '#dashboard']], `
      <div class="ph">
        <div>
          <h1>中控大屏</h1>
          <p>一眼看清全盘状态和当前停在哪一步 · 上次自动采数：${PS.esc(PS.S.daemon.lastMetricsAt)}。</p>
        </div>
        <div class="acts">
          <button class="btn" id="quickImportBtn">${PS.icon('upload', 'sm')}导入素材 / 贴稿</button>
          <button class="btn primary" id="dashCollect">${PS.icon('refresh', 'sm')}立即采数</button>
        </div>
      </div>

      <section class="wip-strip" aria-label="正在做">
        <button type="button" class="wip-card primary" onclick="location.hash='#cut'">
          <span class="wip-ic">${PS.icon('film')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>正在做 · EP${cut.episode}</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">${PS.esc(cut.title)}</b>
            <div class="sub clip1" style="font-size:12px">停在「剪辑 · 镜头表 (${(cut.shots || []).length} 镜)」</div>
          </div>
          <span class="wip-go">接着剪 ›</span>
        </button>

        <button type="button" class="wip-card ${t41.todo ? 'warn' : ''}" onclick="location.hash='#pub-confirm'">
          <span class="wip-ic">${PS.icon(t41.todo ? 'send' : 'check')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>${t41.todo ? `待确认发布 · ${t41.todo} 平台` : '最新一期已闭环'}</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">EP${ep41.episode} ${PS.esc(ep41.nick)}</b>
            <div class="sub clip1" style="font-size:12px">${t41.todo ? `${PS.esc(waitNames.join('、'))} 已由专用 Chrome 填表` : `${t41.pub}/${t41.total} 平台已发布`}</div>
          </div>
          <span class="wip-go">${t41.todo ? '去点发 ›' : '看矩阵 ›'}</span>
        </button>

        <button type="button" class="wip-card" onclick="location.hash='#source'">
          <span class="wip-ic">${PS.icon('star')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>今日信源 · AI 日报 ${newsCount} 条</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">${PS.esc(topNews[0]?.title || '查看今日 AI 情报')}</b>
            <div class="sub clip1" style="font-size:12px">搞钱 ${PS.S.sources.saved.length} 篇 · 选题池 ${PS.S.topics.filter(t => !t.trash).length} 条</div>
          </div>
          <span class="wip-go">看日报 ›</span>
        </button>
      </section>

      <section class="hero-ep" id="heroHost"></section>

      <section class="dash-top">
        <div class="card">
          <div class="card-h">
            <h3>全平台总粉丝</h3>
            <span class="sub">每日按平台堆叠 · 虚线为发布日</span>
          </div>
          <div class="row" style="align-items:baseline;margin-bottom:10px">
            <div class="kpi-val xl">${PS.fmt(totFans)}</div>
            <span class="gpill">今日<b>${PS.sgn(totToday)}</b></span>
            <span class="gpill">7日<b>${PS.sgn(tot7)}</b></span>
            <span class="gpill">30日<b>${PS.sgn(tot30)}</b></span>
          </div>
          <div class="chart-box" id="fansChart"></div>
        </div>

        <div class="card">
          <div class="card-h">
            <h3>人话结论</h3>
            <a class="sub" href="#review">看 1/3/7 天复盘 ›</a>
          </div>
          <div class="ins-list">
            ${insights.map(i => `<div class="ins-item"><em class="${i.cls}">${i.tag}</em><div>${i.html}</div></div>`).join('')}
          </div>
        </div>
      </section>

      <section>
        <div class="card-h" style="margin-bottom:10px">
          <h3>各平台趋势（${active.length} 家启用中）</h3>
          <a class="sub" href="#settings/platforms">管理专用 Chrome 与平台开关 ›</a>
        </div>
        <div class="plat-cards">
          ${pStats.map(ps => {
            const p = PS.PLATFORMS[ps.id], st = PS.S.platformStatus[ps.id];
            return `<div class="pc">
              <div class="row" style="gap:7px">${PS.plogo(ps.id, 22)}<b style="font-size:13.5px">${p.name}</b><span class="grow"></span><i class="dot ${st.state === 'ok' ? 'live' : 'warn'}"></i></div>
              <div class="pc-val">${PS.fmt(ps.total)}</div>
              <div class="row" style="gap:5px"><span class="gpill">今<b>${PS.sgn(ps.today)}</b></span><span class="gpill">7日<b>${PS.sgn(ps.d7)}</b></span></div>
              <div class="pc-sp">${PS.sparklineSVG(ps.id, PS.S.followers[ps.id])}</div>
            </div>`;
          }).join('')}
        </div>
      </section>
    `);

    function renderHero() {
      const ep = slides[heroIdx];
      const t = epTotals(ep);
      const host = main.querySelector('#heroHost');
      host.innerHTML = `
        <div class="hero-cv" style="background:${ep.coverGrad}" onclick="location.hash='#pub-confirm'">
          <span class="pill" style="background:rgba(0,0,0,.35);color:#fff;width:fit-content">第 ${ep.episode} 期</span>
          <h4>${PS.esc(ep.coverTitle).replace(/\n/g, '<br>')}</h4>
          <span style="font-size:11px;opacity:.9">${t.pub}/${t.total} 平台已发布</span>
        </div>
        <div class="min0 grow stack tight">
          <div class="row">
            <div class="seg">
              ${slides.map((s, i) => `<button class="${i === heroIdx ? 'on' : ''}" data-hi="${i}">EP${s.episode} ${PS.esc(s.nick)}</button>`).join('')}
            </div>
            <span class="grow"></span>
            ${t.todo ? `<a class="btn primary s" href="#pub-confirm">去确认点发（${t.todo}）</a>` : `<span class="pill good">全平台已闭环</span>`}
          </div>
          <h2 class="m0" style="font-size:18px">${PS.esc(ep.title)}</h2>
          <div class="hero-plats">
            ${active.map(pid => {
              const tk = ep.tasks[pid]; if (!tk) return '';
              const cls = tk.state === 'published' ? 'on' : tk.state === 'awaiting_user' ? 'todo' : '';
              const lbl = tk.state === 'published' ? (tk.m ? PS.kfmt(tk.m.views) : '已发') : tk.state === 'awaiting_user' ? '等你点发' : tk.state === 'scheduled' ? '定时' : '待发';
              return `<div class="hpl ${cls}" onclick="location.hash='#pub-confirm'">${PS.plogo(pid, 17)}<span>${PS.PLATFORMS[pid].name}</span><span class="st">${lbl}</span></div>`;
            }).join('')}
          </div>
          <div class="row" style="gap:24px;margin-top:auto;padding-top:8px;border-top:1px solid var(--line-soft)">
            <div><div class="kpi-lab">全平台播放</div><div class="kpi-val" style="font-size:22px">${t.views ? PS.fmt(t.views) : '–'}</div></div>
            <div><div class="kpi-lab">总互动</div><div class="kpi-val" style="font-size:22px">${t.inter ? PS.fmt(t.inter) : '–'}</div></div>
            <div><div class="kpi-lab">互动率</div><div class="kpi-val" style="font-size:22px">${t.views ? PS.pct(t.inter, t.views, 1) : '–'}</div></div>
          </div>
        </div>`;
      host.querySelectorAll('[data-hi]').forEach(b => b.onclick = () => { heroIdx = +b.dataset.hi; renderHero(); });
    }

    renderHero();
    PS.drawStackedFans(main.querySelector('#fansChart'), PS.S.followers, active, eps);
    main.querySelector('#quickImportBtn').onclick = openQuickImportModal;
    main.querySelector('#dashCollect').onclick = async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '专用 Chrome 采数中…';
      try {
        const res = await PS.api('POST', '/api/collect/followers', {});
        if (res.chromeStatus) {
          PS.S.chromeStatus = res.chromeStatus;
          PS.S.daemon.chromeOnline = !!res.chromeStatus.online;
        }
        if (res.daemonLogs) PS.S.daemonLogs = res.daemonLogs;
        if (res.last_metrics_at) PS.S.daemon.lastMetricsAt = res.last_metrics_at;
        if (res.followersLive) {
          PS.S.liveFollowerPlats = Object.keys(res.followersLive);
          for (const [pid, dayMap] of Object.entries(res.followersLive)) {
            if (dayMap && Object.keys(dayMap).length) PS.S.followers[pid] = { ...dayMap };
          }
        }
        PS.save();
        PS.toast(
          res.collected ? `专用 Chrome 已实测采集 ${res.collected} 家平台粉丝数` : '暂未读到已登录平台，请先到右上角「系统 → 打开全部登录页」扫码',
          res.collected ? 'good' : 'warn'
        );
        PS.pages.dashboard();
      } catch (err) {
        PS.toast(err.message || '采数失败', 'warn');
        btn.disabled = false;
        btn.innerHTML = old;
      }
    };
  };
})();
