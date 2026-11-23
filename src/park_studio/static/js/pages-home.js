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
    const savedDaily = PS._savedDaily;
    const topNews = iss?.parts?.length
      ? iss.parts.flatMap(p => p.groups.flatMap(g => g.items)).slice(0, 3)
      : PS.S.sources.newsletter.slice(0, 3);
    const newsCount = iss?.total || PS.S.sources.newsletter.length;
    const savedCount = (savedDaily?.cards?.length || 0) + (savedDaily?.items?.length || 0) || PS.S.sources.saved.length;

    const an = PS.S.analytics || {};
    const realEps = an.episodes || [];
    const slides = realEps.slice(0, 4);
    if (heroIdx >= slides.length) heroIdx = 0;

    // 真实待确认发布期次（来自 SQLite publish_episodes，而非演示种子）
    const pubList = PS.S.publishEpisodes || [];
    const activePub = pubList.find(e => Object.values(e.tasks || {}).some(t => t.state === 'awaiting_user')) || pubList[0];
    const pubTodoPlats = activePub ? active.filter(pid => activePub.tasks?.[pid]?.state === 'awaiting_user') : [];
    const pubDoneN = activePub ? active.filter(pid => activePub.tasks?.[pid]?.state === 'published').length : 0;

    const pStats = active.map(id => ({ id, ...PS.fanStats(id) }));
    const totFans = pStats.reduce((s, x) => s + x.total, 0);
    const totToday = pStats.reduce((s, x) => s + x.today, 0);
    const tot7 = pStats.reduce((s, x) => s + x.d7, 0);
    const tot30 = pStats.reduce((s, x) => s + x.d30, 0);

    const insights = (an.insights && an.insights.length) ? an.insights : [
      { cls: 'g', tag: '粉丝', html: `当前全网实测总粉 <b>${PS.fmt(totFans)}</b>，点击右上角「<b>立即采数</b>」即可同步各平台最新粉丝与单期作品播放。` },
    ];

    // 给堆叠图准备真实发布日虚线标记
    const fanMarksEps = realEps.map(e => ({ episode: e.index, nick: e.nick, schedule: e.published_at || '' }));

    const main = PS.shell('dashboard', [['中控', '#dashboard']], `
      <div class="ph">
        <div>
          <h1>中控大屏</h1>
          <p>全盘真实数据总览（已采集 ${an.totalWorks || 0} 条真实作品 · 上次采数：${PS.esc(an.lastMetricsAt || PS.S.daemon.lastMetricsAt || '未采集')}）。</p>
        </div>
        <div class="acts">
          <button class="btn" id="quickImportBtn">${PS.icon('upload', 'sm')}导入素材 / 贴稿</button>
          <button class="btn primary" id="dashCollect">${PS.icon('refresh', 'sm')}立即采数（粉丝+流量）</button>
        </div>
      </div>

      <section class="wip-strip" aria-label="正在做">
        <button type="button" class="wip-card primary" onclick="location.hash='#cut'">
          <span class="wip-ic">${PS.icon('film')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>正在做 · 剪辑工作台</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">${PS.esc(cut.title)}</b>
            <div class="sub clip1" style="font-size:12px">停在「镜头表 (${(cut.shots || []).length} 镜)」</div>
          </div>
          <span class="wip-go">接着剪 ›</span>
        </button>

        <button type="button" class="wip-card ${pubTodoPlats.length ? 'warn' : ''}" onclick="location.hash='#pub-confirm'">
          <span class="wip-ic">${PS.icon(pubTodoPlats.length ? 'send' : 'check')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>${pubTodoPlats.length ? `待确认发布 · ${pubTodoPlats.length} 平台` : (activePub ? '当前发布包' : '准备发布')}</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">${PS.esc(activePub ? activePub.nick : '从本地工程目录一键载入')}</b>
            <div class="sub clip1" style="font-size:12px">${pubTodoPlats.length ? `${PS.esc(pubTodoPlats.map(p => PS.PLATFORMS[p].name).join('、'))} 已由专用 Chrome 填表` : `${pubDoneN}/${active.length} 平台已发布`}</div>
          </div>
          <span class="wip-go">${pubTodoPlats.length ? '去点发 ›' : '去发布 ›'}</span>
        </button>

        <button type="button" class="wip-card" onclick="location.hash='#source'">
          <span class="wip-ic">${PS.icon('star')}</span>
          <div class="min0 grow">
            <div class="wip-tag"><span>今日信源 · AI 日报 ${newsCount} 条</span></div>
            <b class="clip1" style="display:block;font-size:14px;margin-top:2px">${PS.esc(topNews[0]?.title || '查看今日 AI 情报')}</b>
            <div class="sub clip1" style="font-size:12px">搞钱日报 ${savedCount} 条 · 选题池 ${PS.S.topics.filter(t => !t.trash).length} 条</div>
          </div>
          <span class="wip-go">看日报 ›</span>
        </button>
      </section>

      <section class="hero-ep" id="heroHost"></section>

      <section class="dash-top">
        <div class="card">
          <div class="card-h">
            <h3>全平台总粉丝</h3>
            <span class="sub">实测数据 · 每日按平台堆叠 · 虚线为发布日</span>
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
            <a class="sub" href="#review">看复盘与作品分析 ›</a>
          </div>
          <div class="ins-list">
            ${insights.map(i => `<div class="ins-item"><em class="${i.cls}">${i.tag}</em><div>${i.html}</div></div>`).join('')}
          </div>
        </div>
      </section>

      <section>
        <div class="card-h" style="margin-bottom:10px">
          <h3>各平台趋势（${active.length} 家启用中）</h3>
          <a class="sub" href="#settings">管理专用 Chrome 与平台开关 ›</a>
        </div>
        <div class="plat-cards">
          ${pStats.map(ps => {
            const p = PS.PLATFORMS[ps.id], st = PS.S.platformStatus[ps.id];
            const wc = an.platformCounts?.[ps.id] || 0;
            return `<div class="pc">
              <div class="row" style="gap:7px">${PS.plogo(ps.id, 22)}<b style="font-size:13.5px">${p.name}</b><span class="grow"></span>${wc ? `<span class="sub" style="font-size:11px">${wc} 作品</span>` : ''}<i class="dot ${st.state === 'ok' ? 'live' : 'warn'}"></i></div>
              <div class="pc-val">${PS.fmt(ps.total)}</div>
              <div class="row" style="gap:5px"><span class="gpill">今<b>${PS.sgn(ps.today)}</b></span><span class="gpill">7日<b>${PS.sgn(ps.d7)}</b></span></div>
              <div class="pc-sp">${PS.sparklineSVG(ps.id, PS.S.followers[ps.id])}</div>
            </div>`;
          }).join('')}
        </div>
      </section>
    `);

    function renderHero() {
      const host = main.querySelector('#heroHost');
      if (!slides.length) {
        host.innerHTML = `<div class="stack tight" style="width:100%;padding:8px 4px">
          <div class="row"><span class="pill">真实作品数据待采集</span><span class="grow"></span><button class="btn primary s" id="heroEmptyCollect">${PS.icon('refresh', 'sm')}立即采集各平台作品</button></div>
          <h3 class="m0">还没有采集到你的真实已发作品</h3>
          <p class="sub m0">点右上角「立即采数」，专用 Chrome 会自动从抖音、视频号、B站、YouTube、小红书拉取你真实发过的每期作品播放、点赞、收藏与时长（绝不用演示假数据充数）。</p>
        </div>`;
        host.querySelector('#heroEmptyCollect')?.addEventListener('click', () => main.querySelector('#dashCollect')?.click());
        return;
      }
      const ep = slides[heroIdx];
      host.innerHTML = `
        <div class="hero-cv" style="background:${ep.coverGrad}" onclick="location.hash='#review'">
          <span class="pill" style="background:rgba(0,0,0,.35);color:#fff;width:fit-content">${PS.esc(ep.published_at || '已发布')}</span>
          <h4>${PS.esc(ep.coverTitle).replace(/\n/g, '<br>')}</h4>
          <span style="font-size:11px;opacity:.9">已归并 ${ep.platformCount} 个平台实测数据</span>
        </div>
        <div class="min0 grow stack tight">
          <div class="row" style="flex-wrap:wrap;gap:6px">
            <div class="seg">
              ${slides.map((s, i) => `<button class="${i === heroIdx ? 'on' : ''}" data-hi="${i}">${PS.esc(s.nick.slice(0, 12))}</button>`).join('')}
            </div>
            <span class="grow"></span>
            <a class="btn s" href="#review">查看全部 ${an.totalEpisodes} 期复盘 ›</a>
          </div>
          <h2 class="m0" style="font-size:18px">${PS.esc(ep.title)}</h2>
          <div class="hero-plats">
            ${active.map(pid => {
              const pw = ep.platforms?.[pid];
              if (!pw) {
                return `<div class="hpl" style="opacity:.52">${PS.plogo(pid, 17)}<span>${PS.PLATFORMS[pid].name}</span><span class="st">未采到</span></div>`;
              }
              const tip = `${PS.PLATFORMS[pid].name} · ${pw.title}\n播放 ${PS.fmt(pw.views)} · 赞 ${PS.fmt(pw.likes)} · 藏 ${PS.fmt(pw.favorites)} · 评 ${PS.fmt(pw.comments)}`;
              return `<a class="hpl on" href="${PS.esc(pw.url || '#review')}" target="_blank" rel="noopener" data-tip="${PS.esc(tip)}">${PS.plogo(pid, 17)}<span>${PS.PLATFORMS[pid].name}</span><span class="st">${PS.kfmt(pw.views)}</span></a>`;
            }).join('')}
          </div>
          <div class="row" style="gap:24px;margin-top:auto;padding-top:8px;border-top:1px solid var(--line-soft)">
            <div><div class="kpi-lab">全平台实测播放</div><div class="kpi-val" style="font-size:22px">${ep.views ? PS.fmt(ep.views) : '0'}</div></div>
            <div><div class="kpi-lab">总互动（赞+藏+评+转）</div><div class="kpi-val" style="font-size:22px">${PS.fmt(ep.inter)}</div></div>
            <div><div class="kpi-lab">综合互动率</div><div class="kpi-val" style="font-size:22px">${ep.views ? ep.interRate + '%' : '–'}</div></div>
            <div><div class="kpi-lab">收藏 / 赞</div><div class="kpi-val" style="font-size:22px">${ep.likes ? PS.pct(ep.favorites, ep.likes, 0) : '–'}</div></div>
          </div>
        </div>`;
      host.querySelectorAll('[data-hi]').forEach(b => b.onclick = () => { heroIdx = +b.dataset.hi; renderHero(); });
    }

    renderHero();
    PS.drawStackedFans(main.querySelector('#fansChart'), PS.S.followers, active, fanMarksEps);
    main.querySelector('#quickImportBtn').onclick = openQuickImportModal;
    main.querySelector('#dashCollect').onclick = async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '正在采集粉丝与作品流量…';
      try {
        const resF = await PS.api('POST', '/api/collect/followers', {});
        if (resF.followersLive) {
          PS.S.liveFollowerPlats = Object.keys(resF.followersLive);
          for (const [pid, dayMap] of Object.entries(resF.followersLive)) {
            if (dayMap && Object.keys(dayMap).length) PS.S.followers[pid] = { ...dayMap };
          }
        }
        const resM = await PS.api('POST', '/api/collect/metrics', {});
        if (resM.chromeStatus) {
          PS.S.chromeStatus = resM.chromeStatus;
          PS.S.daemon.chromeOnline = !!resM.chromeStatus.online;
        }
        if (resM.daemonLogs) PS.S.daemonLogs = resM.daemonLogs;
        if (resM.last_metrics_at) PS.S.daemon.lastMetricsAt = resM.last_metrics_at;
        if (resM.analytics) PS.S.analytics = resM.analytics;
        PS.save();
        PS.toast(
          `采数完成：${resF.collected || 0} 家粉丝 + ${resM.collected || 0} 条真实作品已入库`,
          (resF.collected || resM.collected) ? 'good' : 'warn'
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
