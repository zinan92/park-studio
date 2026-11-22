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

  // ==================== 首页（#home · 极简今天想干什么？） ====================
  PS.pages.home = function () {
    const today = new Date();
    const dStr = `${today.getMonth() + 1} 月 ${today.getDate()} 日`;
    const cut = PS.S.cutProject;
    const active = PS.activePlats();

    const main = PS.shell('home', [['首页', '#home']], `
      <div style="margin-top:8px">
        <div class="sub" style="margin-bottom:4px">${dStr}</div>
        <h1 style="font-size:28px;font-weight:800;margin:0;letter-spacing:-.02em">今天想干什么？</h1>
      </div>

      <button type="button" class="hm-now" onclick="location.hash='#cut'">
        <span class="hm-ic">${PS.icon('right')}</span>
        <span class="min0 grow">
          <b style="font-size:15px">接着做《${PS.esc(cut.title)}》</b>
          <div class="sub">停在「剪辑 · 镜头表」</div>
        </span>
        <span style="color:var(--accent);font-size:13px;font-weight:600">接着做 ›</span>
      </button>

      <div class="hm-grid">
        <button type="button" class="hm-peek" onclick="location.hash='#source'">
          <span class="hm-ph">
            <span class="hm-ic">${PS.icon('star')}</span>
            <b>今天的信源</b>
            <span class="hm-more">看全部 ›</span>
          </span>
          <span class="sub">AI 日报 ${PS.S.sources.newsletter.length} 条 · 搞钱 ${PS.S.sources.saved.length} 条 · 开发日报</span>
          <div class="hm-lines">
            ${PS.S.sources.newsletter.slice(0, 3).map((n, i) => `<div class="hm-line"><i class="hm-i">${i + 1}</i><span class="clip1 grow">${PS.esc(n.title)}</span></div>`).join('')}
          </div>
        </button>

        <button type="button" class="hm-peek" onclick="location.hash='#pub-sent'">
          <span class="hm-ph">
            <span class="hm-ic">${PS.icon('film')}</span>
            <b>你的作品</b>
            <span class="hm-more">看全部 ›</span>
          </span>
          <span class="sub">${PS.S.episodes.length} 篇定了稿</span>
          <div class="hm-lines">
            ${PS.S.episodes.slice(0, 3).map((e, i) => {
              const et = epTotals(e);
              const dots = active.map(pid => {
                const st = e.tasks[pid]?.state;
                const cls = st === 'published' ? 'on' : st === 'awaiting_user' ? 'wait' : '';
                return `<i class="${cls}">${PS.PLATFORMS[pid].short}</i>`;
              }).join('');
              return `<div class="hm-line"><i class="hm-i">${i + 1}</i><span class="clip1 grow">${PS.esc(e.nick)}</span>${et.pub || et.todo ? `<span class="mini-pm">${dots}</span>` : '<span class="sub" style="font-size:12px">还没发</span>'}</div>`;
            }).join('')}
          </div>
        </button>
      </div>

      <section class="hm-drop" id="dropZone">
        <div class="hm-drop-in">
          <span class="hm-ic">${PS.icon('upload')}</span>
          <div class="min0 grow">
            <b style="font-size:14.5px">拍好了、写好了？拖进来</b>
            <div class="sub">整个视频文件夹拖进来最省事：有 .srt 就当稿子，视频只在你电脑上读时长，不上传</div>
          </div>
          <div class="row">
            <button class="btn primary" id="pickDir">${PS.icon('layers', 'sm')}选文件夹</button>
            <button class="btn" id="pickFiles">选文件</button>
          </div>
          <input type="file" id="fileIn" multiple hidden>
        </div>
        <div id="dropRes" hidden style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line-soft)"></div>
      </section>

      <div style="text-align:center">
        <button class="link-muted" id="quickPaste">没有文件？贴一段文字</button>
        <span class="sub"> · </span>
        <button class="link-muted" onclick="location.hash='#dashboard'">直接看运营大屏 ›</button>
      </div>
    `, 'mid');

    const zone = main.querySelector('#dropZone'), fileIn = main.querySelector('#fileIn'), dropRes = main.querySelector('#dropRes');
    function handleFiles(files) {
      if (!files || !files.length) return;
      dropRes.hidden = false;
      dropRes.innerHTML = `<div class="row"><span class="pill good">已读入 ${files.length} 个本地文件</span><span class="sub grow clip1">${PS.esc([...files].map(f => f.name).join(' · '))}</span><a class="btn primary s" href="#cut">去剪辑镜头表 ›</a></div>`;
    }
    main.querySelector('#pickDir').onclick = () => fileIn.click();
    main.querySelector('#pickFiles').onclick = () => fileIn.click();
    fileIn.onchange = e => handleFiles(e.target.files);
    zone.ondragover = e => { e.preventDefault(); zone.classList.add('over'); };
    zone.ondragleave = () => zone.classList.remove('over');
    zone.ondrop = e => { e.preventDefault(); zone.classList.remove('over'); handleFiles(e.dataTransfer.files); };
    main.querySelector('#quickPaste').onclick = () => {
      PS.modal({
        title: '贴一段文字，交给本地 Agent 理成口播稿',
        body: `<textarea id="qpTxt" rows="6" placeholder="把你随口说的话或草稿粘贴进来…"></textarea>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="qpGo">理成口播稿</button>`,
        onOpen(m, close) {
          m.querySelector('#qpGo').onclick = () => {
            const v = m.querySelector('#qpTxt').value.trim();
            if (!v) return;
            PS.S.script.body = v;
            PS.save();
            close();
            location.hash = '#write';
          };
        },
      });
    };
  };

  // ==================== 复盘工作台 · 运营大屏（#dashboard） ====================
  let heroIdx = 0;

  PS.pages.dashboard = function () {
    const active = PS.activePlats();
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

    const insights = [
      { cls: 'g', tag: '涨粉', html: `近 7 天涨粉最多的是 <b>${PS.PLATFORMS[topFan7.id].name} ${PS.sgn(topFan7.d7)}</b>，占全网近 7 天合计 ${PS.sgn(tot7)} 的 <b>${PS.pct(topFan7.d7, tot7, 0)}</b>。` },
      { cls: 'o', tag: '发布日', html: `「${PS.esc(ep41.nick)}」首日全网播放 <b>${PS.fmt(t41.views)}</b>，是上期同龄的 <b>1.7 倍</b>；还有 ${t41.todo} 家国内平台等你点发。` },
      { cls: 'b', tag: '互动', html: `近 3 期平均互动率最高是 <b>小红书 18.8%</b>、<b>B站 16.4%</b>，干货收藏比远超泛流量平台。` },
      { cls: 'p', tag: '转化', html: `${PS.esc(PS.S.settings.siteName)}近 30 日归因收入 <b>¥20,350</b>，B 站注册→付费转化率最高（14.3%）。` },
    ];

    const main = PS.shell('dashboard', [['复盘工作台', '#dashboard'], ['运营大屏', '#dashboard']], `
      <div class="ph">
        <div>
          <h1>运营大屏</h1>
          <p>全平台粉丝、最新发布进度、人话结论与各平台趋势一屏总览；上次自动采数：${PS.esc(PS.S.daemon.lastMetricsAt)}。</p>
        </div>
        <div class="acts">
          <a class="btn" href="#review">同龄复盘 · 抖音分析</a>
          <button class="btn primary" id="dashCollect">${PS.icon('refresh', 'sm')}立即采数</button>
        </div>
      </div>

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
    main.querySelector('#dashCollect').onclick = () => {
      for (const p of active) {
        const days = Object.keys(PS.S.followers[p]).sort();
        PS.S.followers[p][days[days.length - 1]] += Math.floor(Math.random() * 12) + 4;
      }
      PS.S.daemon.lastMetricsAt = '刚刚';
      PS.save();
      PS.toast('专用 Chrome 采数完成，大屏已更新', 'good');
      PS.pages.dashboard();
    };
  };
})();
