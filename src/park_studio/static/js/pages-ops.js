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

  // ==================== 发布 · 打包（#pub-pack） ====================
  PS.pages['pub-pack'] = function () {
    const list = pubEpisodes();
    const ep = list.find(e => e.id === curPubEpId) || list[0];
    curPubEpId = ep.id;
    const pf = ep.preflight || { video: { exists: false, faststart: false, note: '未检测' }, cover_v: false, cover_h: false };
    const main = PS.shell('pub-pack', [['发布工作台', '#pub-confirm'], ['打包 · publish.json', '#pub-pack']], `
      <div class="ph">
        <div>
          <h1>打包 · 各平台文案与工程校验</h1>
          <p>绑定本地成片与封面路径、纯 Python 校验 MP4 faststart，并真实导出 <code class="mono">~/.park-studio/projects/EP${ep.episode}/publish.json</code>。</p>
        </div>
        <div class="acts">
          <select id="pkSel" style="width:240px">${list.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <a class="btn primary" href="#pub-confirm">去确认 · Chrome 填表 ›</a>
        </div>
      </div>

      <div class="card stack">
        <div class="row">
          <span class="pill ${pf.video?.exists ? (pf.video.faststart ? 'good' : 'wait') : ''}">${pf.video?.exists ? PS.esc(pf.video.note) : '未绑定本地视频'}</span>
          <span class="pill ${pf.cover_v ? 'good' : ''}">3:4 封面 ${pf.cover_v ? '✓' : '可选'}</span>
          <span class="pill ${pf.cover_h ? 'good' : ''}">16:9 封面 ${pf.cover_h ? '✓' : '可选'}</span>
          <span class="pill info">UTM：${PS.esc(ep.campaign || `ep${ep.episode}`)}</span>
        </div>
        <div class="sys-2col">
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">本地成片路径（自动注入上传框 + faststart 校验）</label>
            <input type="text" id="pkVideo" class="mono" value="${PS.esc(ep.videoPath || '')}" placeholder="/Users/wendy/Movies/EP${ep.episode}.mp4">
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">计划发布时间（ISO）</label>
            <input type="text" id="pkSched" class="mono" value="${PS.esc(ep.schedule || '')}" placeholder="2026-11-24T19:00:00+08:00">
          </div>
        </div>
        <div class="row">
          <button class="btn primary" id="pkSaveBtn">${PS.icon('check', 'sm')}校验并导出 publish.json</button>
          <span class="sub">落盘路径：<code class="mono">~/.park-studio/projects/EP${ep.episode}/publish.json</code></span>
        </div>
        <pre class="codebox">${PS.esc(JSON.stringify(ep.publishJson || {}, null, 2))}</pre>
      </div>
    `, 'mid');

    main.querySelector('#pkSel').onchange = e => { curPubEpId = +e.target.value; PS.pages['pub-pack'](); };
    main.querySelector('#pkSaveBtn').onclick = async e => {
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
    };
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
    let body = '';

    if (sentView === 'matrix') {
      body = `
        <div class="row sub" style="font-size:12.5px">
          <span>每条内容 × 每个平台 1 格：</span>
          <span><b style="color:var(--good)">✓</b> 已发并取链（悬停看播放）</span>
          <span><b style="color:var(--hot)">!</b> 填好等你点发</span>
          <span><b style="color:var(--info)">◷</b> 已定时</span>
          <span>○ 未发</span>
        </div>
        <section class="card pad-0">
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>作品</th>${active.map(pid => `<th style="text-align:center">${PS.PLATFORMS[pid].name}</th>`).join('')}</tr></thead>
            <tbody>
              ${PS.S.episodes.map(e => `<tr>
                <td><b>EP${e.episode} · ${PS.esc(e.nick)}</b><div class="sub" style="font-size:11.5px">${PS.esc((e.schedule || '').slice(0, 10))}</div></td>
                ${active.map(pid => {
                  const t = e.tasks[pid];
                  if (t?.state === 'published') return `<td style="text-align:center"><span class="sym ok" data-tip="${PS.PLATFORMS[pid].name} · 播放 ${PS.fmt(t.m?.views)}">✓</span></td>`;
                  if (t?.state === 'awaiting_user') return `<td style="text-align:center"><a class="sym wait" href="#pub-confirm" data-tip="已填好，等你点发">!</a></td>`;
                  if (t?.state === 'scheduled') return `<td style="text-align:center"><span class="sym sch" data-tip="已定时">◷</span></td>`;
                  return `<td style="text-align:center"><span class="sym none">○</span></td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table></div>
        </section>`;
    } else {
      const cells = [];
      for (let off = -5; off <= 8; off++) {
        const dt = new Date(Date.now() + off * 864e5);
        const pad = n => String(n).padStart(2, '0');
        const ds = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        const hits = PS.S.episodes.filter(e => (e.schedule || '').slice(0, 10) === ds);
        cells.push(`<div class="cal-day ${off === 0 ? 'today' : ''}">
          <div class="row" style="justify-content:space-between;font-size:12px"><b class="mono">${ds.slice(5)}</b><span class="sub">${off === 0 ? '今天' : ''}</span></div>
          ${hits.map(e => `<div class="cal-ep ${Object.values(e.tasks).some(x => x.state === 'awaiting_user') ? 'wait' : 'pub'}" onclick="location.hash='#pub-confirm'"><b>EP${e.episode} ${PS.esc(e.nick)}</b></div>`).join('')}
        </div>`);
      }
      body = `<div class="cal-grid">${cells.join('')}</div>`;
    }

    const main = PS.shell('pub-sent', [['发布工作台', '#pub-confirm'], ['已发 · 矩阵与日历', '#pub-sent']], `
      <div class="ph">
        <div><h1>已发 · 全平台矩阵</h1><p>所有期次在 7 个平台的发布与链接回填状态。</p></div>
        <div class="acts">
          <div class="seg">
            <button class="${sentView === 'matrix' ? 'on' : ''}" id="vMat">矩阵表</button>
            <button class="${sentView === 'cal' ? 'on' : ''}" id="vCal">14 天分发日历</button>
          </div>
        </div>
      </div>
      ${body}
    `, 'mid');

    main.querySelector('#vMat').onclick = () => { sentView = 'matrix'; PS.pages['pub-sent'](); };
    main.querySelector('#vCal').onclick = () => { sentView = 'cal'; PS.pages['pub-sent'](); };
  };

  // ==================== 复盘 · 同龄复盘与抖音分析（#review） ====================
  let revTab = 'douyin';

  PS.pages.review = function (sub) {
    if (['douyin', 'age', 'weekly'].includes(sub)) revTab = sub;
    let body = '';

    if (revTab === 'douyin') {
      body = `
        <div class="kpi-row">
          <div class="kpi-card"><div class="kpi-lab">抖音粉丝</div><div class="kpi-val">${PS.fmt(PS.fanStats('douyin').total)}</div></div>
          <div class="kpi-card"><div class="kpi-lab">近 10 条点赞中位数</div><div class="kpi-val">1,860</div></div>
          <div class="kpi-card"><div class="kpi-lab">平时一条播放</div><div class="kpi-val">1.6万</div></div>
          <div class="kpi-card"><div class="kpi-lab">收藏 / 赞</div><div class="kpi-val">82%</div></div>
          <div class="kpi-card"><div class="kpi-lab">3× 以上爆款</div><div class="kpi-val" style="color:var(--accent)">4 条</div></div>
        </div>
        <div class="card stack">
          <div class="card-h"><h3>时长 × 播放散点图</h3><span class="sub">金色圆点 = 高于中位数 3 倍以上</span></div>
          <div class="chart-box tall" id="dyScatter"></div>
        </div>
      `;
    } else if (revTab === 'age') {
      body = `<div class="hm-grid">
        ${PS.S.episodes.slice(0, 2).map(ep => `<div class="card stack">
          <div class="row"><span class="pill accent">EP${ep.episode} · 同龄复盘</span><span class="grow"></span><button class="btn s" onclick="PS.toast('已推飞书复盘卡片','good')">推飞书卡片</button></div>
          <h3 class="m0">${PS.esc(ep.nick)}</h3>
          ${ep.reviews.map(r => `<div style="padding:10px 12px;background:var(--sunk);border-radius:9px;font-size:13.5px">
            <b>第 ${r.age} 天：</b>全平台 <b>${PS.fmt(r.views)}</b> 播放（上期同龄 ${PS.fmt(r.prevViews)}，达 <b style="color:var(--good)">${(r.views / r.prevViews).toFixed(1)}×</b>）· 涨粉 <b style="color:var(--good)">+${r.fans}</b> · 收入 <b>¥${PS.fmt(r.convRev)}</b>
          </div>`).join('')}
        </div>`).join('')}
      </div>`;
    } else {
      body = `<div class="card stack">
        <div class="row"><b>每周一自动周报</b><span class="grow"></span><button class="btn primary s" onclick="PS.toast('周报已推送至飞书群与微信','good')">立即推送</button></div>
        <pre class="codebox">🗓 Park Studio 周报｜近 7 天
发了 2 期：「AI 知识树怎么搭」、「本地 Agent 自动填 7 平台」
全平台新增播放 332,880（较上周 +41%）
各平台净涨粉 +2,553（抖音 +673 · 小红书 +490 · B站 +397 · X +316 · 视频号 +250）
Park 知识站：新注册 384｜付费会员 53｜归因收入 ¥11,360</pre>
      </div>`;
    }

    const main = PS.shell('review', [['复盘工作台', '#dashboard'], ['同龄复盘 · 抖音分析', '#review']], `
      <div class="ph"><div><h1>复盘与作品分析</h1><p>结合 Park 抖音散点分析与麦田 1/3/7 天同龄对比复盘。</p></div></div>
      <div class="utabs">
        <button class="utab ${revTab === 'douyin' ? 'on' : ''}" onclick="location.hash='#review/douyin'">抖音作品分析</button>
        <button class="utab ${revTab === 'age' ? 'on' : ''}" onclick="location.hash='#review/age'">1/3/7 天同龄复盘</button>
        <button class="utab ${revTab === 'weekly' ? 'on' : ''}" onclick="location.hash='#review/weekly'">每周自动周报</button>
      </div>
      ${body}
    `, 'mid');
    if (revTab === 'douyin') PS.drawDouyinScatter(main.querySelector('#dyScatter'));
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
