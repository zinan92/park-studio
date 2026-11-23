/* 发布工作台（待发 / 打包 / 确认·自研专用Chrome填表 / 已发·矩阵与日历） + 复盘工作台（同龄复盘与抖音分析 / 转化归因） */
(function () {
  'use strict';
  const PS = window.PS;

  const STATE_META = {
    published:     { label: '已发 · 已取链', cls: 'good' },
    scheduled:     { label: '已定时', cls: 'info' },
    awaiting_user: { label: '填好 · 等你点发', cls: 'wait' },
    running:       { label: '专用 Chrome 填表中…', cls: 'accent' },
    failed:        { label: '需处理', cls: 'warn' },
    planned:       { label: '待开跑', cls: '' },
  };

  let curPubEpId = null;

  function pubEpisodes() {
    return (PS.S.publishEpisodes && PS.S.publishEpisodes.length) ? PS.S.publishEpisodes : PS.S.episodes;
  }

  function applyPubRes(res) {
    if (res.episodes?.length) {
      PS.S.publishEpisodes = res.episodes;
      for (const pe of res.episodes) {
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
    if (res.chromeStatus) {
      PS.S.chromeStatus = res.chromeStatus;
      PS.S.daemon.chromeOnline = !!res.chromeStatus.online;
    }
    if (res.projects) PS.S.projects = res.projects;
    if (res.daemonLogs) PS.S.daemonLogs = res.daemonLogs;
    PS.save();
  }

  // ==================== 发布 · 待发（#pub-todo） ====================
  PS.pages['pub-todo'] = function () {
    const list = pubEpisodes();
    const ep = list[0];
    PS.shell('pub-todo', [['发布工作台', '#pub-confirm'], ['待发 · 排期', '#pub-todo']], `
      <div class="ph">
        <div><h1>待发 · 排期队列</h1><p>刚剪完、准备生成多平台文案与 publish.json 的内容（SQLite 持久化）。</p></div>
      </div>
      <div class="stack">
        ${list.map(e => `<div class="card row">
          <div class="min0 grow">
            <b>EP${e.episode} · ${PS.esc(e.title)}</b>
            <div class="sub">计划发布：${PS.esc((e.schedule || '').slice(0, 16).replace('T', ' '))} · ${e.preflight?.video?.exists ? PS.esc(e.preflight.video.note) : '尚未绑定本地成片路径'}</div>
          </div>
          <button class="btn s" onclick="location.hash='#pub-pack'">打包 publish.json</button>
          <a class="btn primary s" href="#pub-confirm">去填表 ›</a>
        </div>`).join('')}
      </div>
    `, 'mid');
  };

  // ==================== 发布 · 打包（#pub-pack · 统一标准工程目录自动识别） ====================
  PS.pages['pub-pack'] = function () {
    const list = pubEpisodes();
    const ep = list.find(e => e.id === curPubEpId) || list[0];
    curPubEpId = ep.id;
    const pf = ep.preflight || { video: { exists: false, faststart: false, note: '未检测' }, cover_v: false, cover_h: false };
    const projState = PS.S.projects || { root: PS.S.settings.projectRoot || '~/Movies/ParkStudio', mounted: false, projects: [] };
    const readyProjs = (projState.projects || []).filter(p => p.stage === 'ready');
    const cuttingProjs = (projState.projects || []).filter(p => p.stage !== 'ready');

    const projRow = p => {
      const coversN = [p.coverVPath, p.coverHPath, p.cover169Path].filter(Boolean).length;
      return `<div class="row" style="padding:10px 12px;border-radius:10px;background:var(--sunk);gap:10px">
        <div class="min0 grow">
          <div class="row" style="gap:6px">
            <b class="clip1" style="font-size:13.5px">${PS.esc(p.title)}</b>
            <span class="pill ${p.stage === 'ready' ? 'good' : 'info'}">${PS.esc(p.stageLabel)}</span>
          </div>
          <div class="row" style="gap:6px;margin-top:4px;font-size:11.5px">
            <span class="sub mono">${PS.esc(p.date || p.name)}</span>
            ${p.videoPath ? '<span class="pill good">成片 MP4 ✓</span>' : '<span class="pill">无成片</span>'}
            ${coversN ? `<span class="pill good">${coversN} 张封面 ✓</span>` : ''}
            ${p.copyPath ? '<span class="pill good">文案.txt ✓</span>' : ''}
          </div>
        </div>
        ${p.stage === 'ready'
          ? `<button class="btn primary s" data-import-proj="${PS.esc(p.folder)}">一键载入 → 去填表</button>`
          : `<span class="sub" style="font-size:12px">待剪完出片</span>`}
      </div>`;
    };

    const main = PS.shell('pub-pack', [['发布工作台', '#pub-confirm'], ['打包 · 标准工程目录', '#pub-pack']], `
      <div class="ph">
        <div>
          <h1>打包 · 标准工程包自动识别</h1>
          <p>所有用户共用同一套标准目录结构（定稿自动建目录、AI 自动放进 <code class="mono">final/上传/</code>），点一下自动识别成片、3 张封面与各平台文案。</p>
        </div>
        <div class="acts">
          <button class="btn" id="rescanProj">${PS.icon('refresh', 'sm')}重新扫描目录</button>
          <a class="btn primary" href="#pub-confirm">去确认 · Chrome 填表 ›</a>
        </div>
      </div>

      <div class="card stack">
        <div class="card-h" style="margin-bottom:2px">
          <h3>本机工程目录 <span class="pill ${projState.mounted ? 'good' : 'wait'}" style="margin-left:6px">${projState.mounted ? `已挂载 · ${readyProjs.length} 期可发` : '目录未挂载'}</span></h3>
          <span class="sub mono" style="font-size:12px">${PS.esc(projState.root)}</span>
        </div>
        ${readyProjs.length
          ? `<div class="stack tight">${readyProjs.slice(0, 6).map(projRow).join('')}</div>`
          : `<div class="src-notice">当前目录暂未扫到含 <code class="mono">final/上传/</code> 的可发成片（可在「系统」页修改统一工程目录）。</div>`}
        ${cuttingProjs.length ? `<details class="sub"><summary>还有 ${cuttingProjs.length} 个剪辑中 / 草稿目录</summary>
          <div class="stack tight" style="margin-top:8px">${cuttingProjs.slice(0, 6).map(projRow).join('')}</div>
        </details>` : ''}
      </div>

      <div class="card stack">
        <div class="row">
          <b style="font-size:14.5px">当前发布清单</b>
          <select id="pkSel" style="width:260px">${list.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <span class="grow"></span>
          <span class="pill ${pf.video?.exists ? (pf.video.faststart ? 'good' : 'wait') : ''}">${pf.video?.exists ? PS.esc(pf.video.note) : '未绑定视频'}</span>
          <span class="pill ${pf.cover_v ? 'good' : ''}">竖封面 ${pf.cover_v ? '✓' : '–'}</span>
          <span class="pill ${pf.cover_h ? 'good' : ''}">横/16:9 封面 ${pf.cover_h ? '✓' : '–'}</span>
        </div>
        <details class="sub">
          <summary>高级：手动覆盖成片路径或排期时间</summary>
          <div class="stack" style="margin-top:10px">
            <div class="sys-2col">
              <div>
                <label class="sub" style="display:block;margin-bottom:4px">本地成片路径</label>
                <input type="text" id="pkVideo" class="mono" value="${PS.esc(ep.videoPath || '')}" placeholder="~/Movies/ParkStudio/.../final/上传/视频.mp4">
              </div>
              <div>
                <label class="sub" style="display:block;margin-bottom:4px">计划发布时间（ISO）</label>
                <input type="text" id="pkSched" class="mono" value="${PS.esc(ep.schedule || '')}" placeholder="2026-11-24T19:00:00+08:00">
              </div>
            </div>
            <div><button class="btn primary s" id="pkSaveBtn">${PS.icon('check', 'sm')}保存并导出 publish.json</button></div>
          </div>
        </details>
        <pre class="codebox">${PS.esc(JSON.stringify(ep.publishJson || {}, null, 2))}</pre>
      </div>
    `, 'mid');

    main.querySelector('#pkSel').onchange = e => { curPubEpId = +e.target.value; PS.pages['pub-pack'](); };
    main.querySelector('#rescanProj').onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        PS.S.projects = await PS.api('GET', '/api/projects');
        PS.save();
        PS.toast(`已扫描 ${(PS.S.projects.projects || []).length} 个本机工程目录`, 'good');
        PS.pages['pub-pack']();
      } catch (err) { PS.toast(err.message, 'warn'); btn.disabled = false; }
    };
    main.querySelectorAll('[data-import-proj]').forEach(b => b.onclick = async e => {
      const btn = e.currentTarget;
      const folder = b.dataset.importProj;
      btn.disabled = true; btn.textContent = '载入中…';
      try {
        const res = await PS.api('POST', '/api/publish/from-project', { folder });
        applyPubRes(res);
        if (res.episode?.id) curPubEpId = res.episode.id;
        PS.toast(`已载入《${res.episode?.nick || ''}》成片、封面与文案，正进入填表确认页`, 'good');
        location.hash = '#pub-confirm';
      } catch (err) {
        PS.toast(err.message || '载入失败', 'warn');
        btn.disabled = false; btn.textContent = '一键载入 → 去填表';
      }
    });
    main.querySelector('#pkSaveBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/pack`, {
          video_path: main.querySelector('#pkVideo').value.trim(),
          schedule: main.querySelector('#pkSched').value.trim(),
        });
        applyPubRes(res);
        PS.toast(`已真实导出 ${res.path}`, 'good');
        PS.pages['pub-pack']();
      } catch (err) {
        PS.toast(err.message || '导出失败', 'warn');
        btn.disabled = false;
      }
    });
  };

  // ==================== 发布 · 确认（#pub-confirm · 100% MIT 开源自研专用 Chrome 填表引擎） ====================
  PS.pages['pub-confirm'] = function () {
    const list = pubEpisodes();
    const ep = list.find(e => e.id === curPubEpId) || list[0];
    curPubEpId = ep.id;
    const active = PS.activePlats();

    const main = PS.shell('pub-confirm', [['发布工作台', '#pub-confirm'], ['确认 · 专用 Chrome 填表', '#pub-confirm']], `
      <div class="ph">
        <div>
          <h1>确认 · 自研开源多平台填表</h1>
          <p>100% MIT 自研 CDP 引擎（零闭源插件）：自动在专用 Chrome 打开创作页、填文案/传视频并截图留档；国内四家严格停在「等你点发」，发完自动取链。</p>
        </div>
        <div class="acts">
          <select id="cfSel" style="width:230px">${list.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <button class="btn primary" id="fillAll">${PS.icon('chrome', 'sm')}分批启动 Chrome 填表</button>
        </div>
      </div>

      <section class="pub-grid">
        ${active.map(pid => {
          const p = PS.PLATFORMS[pid];
          const t = ep.tasks[pid] || { state: 'planned', detail: '等待开跑' };
          const sm = STATE_META[t.state] || STATE_META.planned;
          let btn = '';
          if (t.state === 'planned' || t.state === 'failed') {
            btn = `<button class="btn primary s" data-fill="${pid}">填这一家</button>`;
          } else if (t.state === 'awaiting_user') {
            btn = `<button class="btn good s" data-sync="${pid}">我已点发 → 自动取链</button>`
              + `<button class="btn s" data-mark="${pid}">贴链确认</button>`
              + (t.hasScreenshot ? `<button class="btn s" data-shot="${pid}">看截图</button>` : '');
          } else if (t.state === 'scheduled') {
            btn = `<button class="btn s" data-sync="${pid}">核对定时并取链</button><button class="btn s" data-mark="${pid}">改状态</button>`;
          } else if (t.state === 'published') {
            btn = `<a class="btn s" href="${PS.esc(t.url || '#')}" target="_blank" rel="noopener">打开作品 ↗</a>`
              + (t.hasScreenshot ? `<button class="btn s" data-shot="${pid}">存档</button>` : `<button class="btn s" data-fill="${pid}">重填</button>`);
          }

          return `<div class="pub-card ${t.state}">
            <div class="row">
              ${PS.plogo(pid, 22)}<b>${p.name}</b>
              <span class="grow"></span>
              <span class="pill ${sm.cls}">${sm.label}</span>
            </div>
            <div class="sub" style="min-height:38px;line-height:1.55">${PS.esc(t.detail || '就绪')}</div>
            <div class="row" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--line-soft);gap:6px">
              ${btn}
              <span class="grow"></span>
              <span class="sub" style="font-size:11px">${p.mode === 'manual' ? '只填不发' : '核对后发'}</span>
            </div>
          </div>`;
        }).join('')}
      </section>
    `);

    main.querySelector('#cfSel').onchange = e => { curPubEpId = +e.target.value; PS.pages['pub-confirm'](); };

    async function fillOne(pid, btnEl) {
      const p = PS.PLATFORMS[pid];
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Chrome 填表中…'; }
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/fill`, { platform: pid });
        applyPubRes(res);
        PS.toast(res.ok ? `${p.name} 已在专用 Chrome 填好并截图留档，请亲自点发布` : (res.reason || `${p.name} 需要先登录`), res.ok ? 'good' : 'warn');
        PS.pages['pub-confirm']();
      } catch (err) {
        PS.toast(err.message || `${p.name} 填表失败`, 'warn');
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = '填这一家'; }
      }
    }

    main.querySelectorAll('[data-fill]').forEach(b => b.onclick = e => fillOne(b.dataset.fill, e.currentTarget));
    main.querySelector('#fillAll').onclick = async e => {
      const todo = active.filter(pid => ['planned', 'failed'].includes(ep.tasks[pid]?.state || 'planned'));
      if (!todo.length) return PS.toast('当前没有待开跑的平台');
      const btn = e.currentTarget;
      btn.disabled = true;
      for (let i = 0; i < todo.length; i++) {
        btn.textContent = `正在填 ${PS.PLATFORMS[todo[i]].name} (${i + 1}/${todo.length})…`;
        await fillOne(todo[i], null);
      }
      btn.disabled = false;
    };

    main.querySelectorAll('[data-sync]').forEach(b => b.onclick = async e => {
      const pid = b.dataset.sync;
      const btn = e.currentTarget;
      const old = btn.textContent;
      btn.disabled = true; btn.textContent = '后台扫链中…';
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/sync`, { platform: pid });
        applyPubRes(res);
        if (res.found) {
          PS.toast(`${PS.PLATFORMS[pid].name} 链接已自动写回：${res.url}`, 'good');
        } else {
          PS.toast(res.reason || '暂未扫到新发布作品，可稍后重试或点「贴链确认」', 'warn');
        }
        PS.pages['pub-confirm']();
      } catch (err) {
        PS.toast(err.message || '自动取链失败', 'warn');
        btn.disabled = false; btn.textContent = old;
      }
    });

    main.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
      const pid = b.dataset.mark;
      const p = PS.PLATFORMS[pid];
      const cur = ep.tasks[pid] || {};
      PS.modal({
        title: `手动确认已发布 · EP${ep.episode} · ${p.name}`,
        body: `<div class="stack">
          <div><label class="sub" style="display:block;margin-bottom:4px">作品链接（可选）</label><input type="url" id="mkUrl" value="${PS.esc(cur.url || '')}" placeholder="https://..."></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">状态</label>
            <select id="mkState"><option value="published" selected>已发布</option><option value="scheduled">已定时</option><option value="planned">重置为待开跑</option></select>
          </div>
        </div>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="mkSave">保存状态</button>`,
        onOpen(mb, close) {
          mb.querySelector('#mkSave').onclick = async () => {
            const url = mb.querySelector('#mkUrl').value.trim();
            const state = mb.querySelector('#mkState').value;
            const res = await PS.api('POST', `/api/publish/${ep.id}/mark`, { platform: pid, state, url });
            applyPubRes(res);
            close();
            PS.toast(`${p.name} 状态已写入 SQLite`, 'good');
            PS.pages['pub-confirm']();
          };
        },
      });
    });

    main.querySelectorAll('[data-shot]').forEach(b => b.onclick = () => {
      const pid = b.dataset.shot;
      const p = PS.PLATFORMS[pid];
      const t = ep.tasks[pid] || {};
      const imgUrl = `/api/publish/${ep.id}/screenshot/${pid}?t=${Date.now()}`;
      PS.modal({
        title: `提交前截图存档 · EP${ep.episode} · ${p.name}`,
        wide: true,
        body: `<div class="stack">
          <div class="sub mono" style="font-size:12px">存档路径：${PS.esc(t.screenshot || `~/.park-studio/projects/EP${ep.episode}/publish_shots/${pid}.jpg`)}</div>
          <img src="${imgUrl}" alt="提交前截图" style="width:100%;border-radius:10px;border:1px solid var(--line-soft)" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'src-notice',textContent:'暂无本机实拍截图（点击「填这一家」后会自动截取提交前画面）'}))">
        </div>`,
        foot: `<button class="btn primary" data-close>关闭</button>`,
      });
    });
  };

  // ==================== 发布 · 已发（#pub-sent · 极简矩阵 + 14 天分发日历） ====================
  let sentView = 'matrix';

  PS.pages['pub-sent'] = function () {
    const active = PS.activePlats();
    const realEps = PS.S.analytics?.episodes || [];
    let body = '';

    if (!realEps.length) {
      body = `<div class="card stack">
        <b>暂无已发作品记录</b>
        <p class="sub m0">点击中控大屏右上角「立即采数」或复盘页「立即采流量」，专用 Chrome 会自动从各平台拉取你已发布的全部作品并生成全平台矩阵。</p>
      </div>`;
    } else if (sentView === 'matrix') {
      body = `
        <div class="row sub" style="font-size:12.5px">
          <span>每条内容 × 每个平台 1 格（共 ${realEps.length} 期真实已发作品）：</span>
          <span><b style="color:var(--good)">✓</b> 已发布并采回数据（点击直达原链接）</span>
          <span>○ 暂未采到</span>
        </div>
        <section class="card pad-0">
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>作品</th>${active.map(pid => `<th style="text-align:center">${PS.PLATFORMS[pid].name}</th>`).join('')}<th class="n">合计播放</th></tr></thead>
            <tbody>
              ${realEps.map(e => `<tr>
                <td><b>${PS.esc(e.title)}</b><div class="sub" style="font-size:11.5px">${PS.esc(e.published_at || '日期未标')} · 已归并 ${e.platformCount} 平台</div></td>
                ${active.map(pid => {
                  const pw = e.platforms?.[pid];
                  if (pw) return `<td style="text-align:center"><a class="sym ok" href="${PS.esc(pw.url || '#')}" target="_blank" rel="noopener" data-tip="${PS.PLATFORMS[pid].name} · 播放 ${PS.fmt(pw.views)} · 赞 ${PS.fmt(pw.likes)}">✓</a></td>`;
                  return `<td style="text-align:center"><span class="sym none">○</span></td>`;
                }).join('')}
                <td class="n"><b>${PS.fmt(e.views)}</b></td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </section>`;
    } else {
      const cells = [];
      for (let off = -13; off <= 0; off++) {
        const dt = new Date(Date.now() + off * 864e5);
        const pad = n => String(n).padStart(2, '0');
        const ds = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        const hits = realEps.filter(e => (e.published_at || '').slice(0, 10) === ds);
        cells.push(`<div class="cal-day ${off === 0 ? 'today' : ''}">
          <div class="row" style="justify-content:space-between;font-size:12px"><b class="mono">${ds.slice(5)}</b><span class="sub">${off === 0 ? '今天' : ''}</span></div>
          ${hits.map(e => `<div class="cal-ep pub" onclick="location.hash='#review'"><b>${PS.esc(e.nick)}</b><div class="sub" style="font-size:10.5px">${PS.kfmt(e.views)} 播放</div></div>`).join('')}
        </div>`);
      }
      body = `<div class="cal-grid">${cells.join('')}</div>`;
    }

    const main = PS.shell('pub-sent', [['发布工作台', '#pub-confirm'], ['已发 · 矩阵与日历', '#pub-sent']], `
      <div class="ph">
        <div><h1>已发 · 全平台矩阵</h1><p>100% 真实已发作品在 ${active.length} 个平台的归并与播放总览。</p></div>
        <div class="acts">
          <div class="seg">
            <button class="${sentView === 'matrix' ? 'on' : ''}" id="vMat">矩阵表</button>
            <button class="${sentView === 'cal' ? 'on' : ''}" id="vCal">近 14 天日历</button>
          </div>
        </div>
      </div>
      ${body}
    `, 'mid');

    main.querySelector('#vMat').onclick = () => { sentView = 'matrix'; PS.pages['pub-sent'](); };
    main.querySelector('#vCal').onclick = () => { sentView = 'cal'; PS.pages['pub-sent'](); };
  };

  // ==================== 复盘 · 同龄复盘与抖音分析（#review · 100% 真实作品数据） ====================
  let revTab = 'douyin';

  PS.pages.review = function (sub) {
    if (['douyin', 'age', 'weekly'].includes(sub)) revTab = sub;
    const an = PS.S.analytics || {};
    const dy = an.douyin || { count: 0, medianViews: 0, medianLikes: 0, favLikePct: 0, hit3xCount: 0, scatter: [] };
    const ageList = an.ageReviews || [];
    const fmtDur = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : (s ? `${s}s` : '–');
    let body = '';

    if (revTab === 'douyin') {
      body = `
        <div class="kpi-row">
          <div class="kpi-card"><div class="kpi-lab">抖音粉丝</div><div class="kpi-val">${PS.fmt(PS.fanStats('douyin').total)}</div></div>
          <div class="kpi-card"><div class="kpi-lab">近 ${dy.count || 0} 条点赞中位数</div><div class="kpi-val">${dy.count ? PS.fmt(dy.medianLikes) : '–'}</div></div>
          <div class="kpi-card"><div class="kpi-lab">平时一条播放（中位数）</div><div class="kpi-val">${dy.count ? PS.kfmt(dy.medianViews) : '–'}</div></div>
          <div class="kpi-card"><div class="kpi-lab">收藏 / 赞</div><div class="kpi-val">${dy.count ? dy.favLikePct + '%' : '–'}</div></div>
          <div class="kpi-card"><div class="kpi-lab">3× 以上爆款</div><div class="kpi-val" style="color:var(--accent)">${dy.count ? `${dy.hit3xCount} 条` : '–'}</div></div>
        </div>
        <div class="card stack">
          <div class="card-h"><h3>时长 × 播放散点图（真实采集 ${dy.count || 0} 条）</h3><span class="sub">金色圆点 = 高于中位数 3 倍以上 · 悬停看明细</span></div>
          <div class="chart-box tall" id="dyScatter"></div>
        </div>
        ${dy.scatter?.length ? `
          <section class="card pad-0">
            <div class="card-h" style="padding:14px 16px 6px"><h3>抖音作品实测明细</h3><span class="sub">按发布时间倒序 · 来自专用 Chrome 实时拉取</span></div>
            <div class="tbl-wrap"><table class="tbl">
              <thead><tr><th>标题</th><th>发布日</th><th class="n">时长</th><th class="n">播放</th><th class="n">倍数</th><th class="n">点赞</th><th class="n">收藏</th><th class="n">评论</th><th class="n">转发</th></tr></thead>
              <tbody>${dy.scatter.map(w => `<tr>
                <td><a href="${PS.esc(w.url || '#')}" target="_blank" rel="noopener" style="font-weight:600">${PS.esc(w.title)}</a></td>
                <td class="mono sub" style="font-size:12px">${PS.esc(w.published_at || '–')}</td>
                <td class="n mono sub">${fmtDur(w.sec)}</td>
                <td class="n"><b>${PS.fmt(w.views)}</b></td>
                <td class="n"><span class="pill ${w.mult >= 3 ? 'accent' : ''}">${w.mult}×</span></td>
                <td class="n">${PS.fmt(w.likes)}</td>
                <td class="n">${PS.fmt(w.favorites)}</td>
                <td class="n">${PS.fmt(w.comments)}</td>
                <td class="n">${PS.fmt(w.shares)}</td>
              </tr>`).join('')}</tbody>
            </table></div>
          </section>
        ` : ''}
      `;
    } else if (revTab === 'age') {
      if (!ageList.length) {
        body = `<div class="card stack"><b>暂无跨平台单期复盘数据</b><p class="sub m0">点击右上角「立即采流量」，系统会自动归并你在抖音、视频号、B站、YouTube、小红书发过的每一期真实作品，并持续按天记录快照生成 1/3/7 天同龄对比。</p></div>`;
      } else {
        body = `<div class="hm-grid">
          ${ageList.map(ep => `<div class="card stack tight">
            <div class="row">
              <span class="pill accent">${PS.esc(ep.published_at || '已发布')}</span>
              <span class="sub" style="font-size:12px">已归并 ${Object.keys(ep.platforms || {}).length} 平台</span>
              <span class="grow"></span>
              ${ep.ratio != null ? `<span class="pill ${ep.ratio >= 1 ? 'good' : ''}">较上期 ${ep.ratio}×</span>` : ''}
            </div>
            <h3 class="m0" style="font-size:15.5px">${PS.esc(ep.title)}</h3>
            <div style="padding:10px 12px;background:var(--sunk);border-radius:9px;font-size:13px">
              全平台实测 <b>${PS.fmt(ep.views)}</b> 播放 · 总互动 <b>${PS.fmt(ep.inter)}</b>（互动率 <b>${ep.interRate}%</b>）
              ${ep.prevViews ? `· 上期「${PS.esc(ep.prevTitle)}」${PS.fmt(ep.prevViews)} 播放` : ''}
            </div>
            <div class="row" style="flex-wrap:wrap;gap:6px">
              ${Object.entries(ep.platforms || {}).map(([pid, pw]) => `<a class="pill" href="${PS.esc(pw.url || '#')}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px">${PS.plogo(pid, 14)}${PS.PLATFORMS[pid]?.name || pid} <b>${PS.kfmt(pw.views)}</b></a>`).join('')}
            </div>
            ${ep.snapshots?.length ? `<div class="sub" style="font-size:11.5px">快照记录：${ep.snapshots.map(s => `${s.day}（第 ${s.age} 天 · ${PS.kfmt(s.views)}）`).join(' → ')}</div>` : ''}
          </div>`).join('')}
        </div>`;
      }
    } else {
      body = `<div class="card stack">
        <div class="row"><b>真实数据周报（自动从 SQLite 汇总）</b><span class="grow"></span><button class="btn s" id="copyWeeklyBtn">复制文本</button></div>
        <pre class="codebox" id="weeklyPre">${PS.esc(an.weeklyReport || '暂无数据，请先点击右上角「立即采流量」。')}</pre>
      </div>`;
    }

    const main = PS.shell('review', [['复盘工作台', '#dashboard'], ['同龄复盘 · 抖音分析', '#review']], `
      <div class="ph">
        <div><h1>复盘与作品分析</h1><p>100% 来自专用 Chrome 实测采集（已入库 ${an.totalWorks || 0} 条作品 · 跨平台归并 ${an.totalEpisodes || 0} 期）。</p></div>
        <div class="acts"><button class="btn primary" id="revCollectBtn">${PS.icon('refresh', 'sm')}立即采流量</button></div>
      </div>
      <div class="utabs">
        <button class="utab ${revTab === 'douyin' ? 'on' : ''}" onclick="location.hash='#review/douyin'">抖音作品分析 (${dy.count || 0})</button>
        <button class="utab ${revTab === 'age' ? 'on' : ''}" onclick="location.hash='#review/age'">跨平台单期复盘 (${ageList.length})</button>
        <button class="utab ${revTab === 'weekly' ? 'on' : ''}" onclick="location.hash='#review/weekly'">真实数据周报</button>
      </div>
      ${body}
    `, 'mid');
    if (revTab === 'douyin') PS.drawDouyinScatter(main.querySelector('#dyScatter'), dy.scatter, dy.medianViews);
    main.querySelector('#copyWeeklyBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(an.weeklyReport || '');
      PS.toast('周报已复制到剪贴板', 'good');
    });
    main.querySelector('#revCollectBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '专用 Chrome 采集作品中…';
      try {
        const res = await PS.api('POST', '/api/collect/metrics', {});
        if (res.analytics) PS.S.analytics = res.analytics;
        if (res.daemonLogs) PS.S.daemonLogs = res.daemonLogs;
        if (res.last_metrics_at) PS.S.daemon.lastMetricsAt = res.last_metrics_at;
        PS.save();
        PS.toast(`已实测采集 ${res.collected || 0} 条作品流量并写入 SQLite`, res.collected ? 'good' : 'warn');
        PS.pages.review(revTab);
      } catch (err) {
        PS.toast(err.message || '采集失败', 'warn');
        btn.disabled = false;
        btn.innerHTML = old;
      }
    });
  };

  // ==================== 复盘 · 转化归因（#conversion） ====================
  PS.pages.conversion = function () {
    const totReg = PS.S.siteChannels.reduce((s, x) => s + x.reg, 0);
    const totVip = PS.S.siteChannels.reduce((s, x) => s + x.vip, 0);
    const totRev = PS.S.siteChannels.reduce((s, x) => s + x.revenue, 0);

    PS.shell('conversion', [['复盘工作台', '#dashboard'], ['转化归因', '#conversion']], `
      <div class="ph">
        <div><h1>转化归因 · ${PS.esc(PS.S.settings.siteName)}</h1><p>接入自有站点只读接口与 UTM 参数，看清哪一期、哪个平台真正带来注册与收入。</p></div>
      </div>
      <div class="funnel-steps">
        <div class="fstep"><div class="kpi-lab">近 3 期播放</div><div class="kpi-val">538,780</div><div class="fstep-bar"><i style="width:100%"></i></div></div>
        <div class="fstep"><div class="kpi-lab">站点注册</div><div class="kpi-val">${PS.fmt(totReg)}</div><div class="fstep-bar"><i style="width:60%"></i></div></div>
        <div class="fstep"><div class="kpi-lab">付费会员</div><div class="kpi-val">${PS.fmt(totVip)}</div><div class="fstep-bar"><i style="width:34%"></i></div></div>
        <div class="fstep"><div class="kpi-lab">归因收入</div><div class="kpi-val" style="color:var(--good)">¥${PS.fmt(totRev)}</div><div class="fstep-bar"><i style="width:24%"></i></div></div>
      </div>
      <section class="card pad-0">
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>来源平台</th><th class="n">注册</th><th class="n">会员</th><th class="n">转化率</th><th class="n">归因收入</th></tr></thead>
          <tbody>${PS.S.siteChannels.map(c => `<tr>
            <td><span class="plat-tag">${PS.plogo(c.source, 18)}${c.label}</span></td>
            <td class="n">${PS.fmt(c.reg)}</td><td class="n">${PS.fmt(c.vip)}</td>
            <td class="n"><b>${PS.pct(c.vip, c.reg, 1)}</b></td>
            <td class="n" style="color:var(--good)"><b>¥${PS.fmt(c.revenue)}</b></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
    `, 'mid');
  };
})();
