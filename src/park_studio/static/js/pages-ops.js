/* 发布工作台（待发 / 打包 / 确认·自研专用Chrome填表 / 已发·矩阵与日历） + 复盘工作台（同龄复盘与抖音分析 / 转化归因） */
(function () {
  'use strict';
  const PS = window.PS;

  const STATE_META = {
    published:     { label: '已发 · 已取链', cls: 'good' },
    scheduled:     { label: '已定时', cls: 'info' },
    awaiting_user: { label: '填好 · 等你点发', cls: 'wait' },
    running:       { label: '专用 Chrome 填表中…', cls: 'accent' },
    planned:       { label: '待开跑', cls: '' },
  };

  let curEpId = 104;

  // ==================== 发布 · 待发（#pub-todo） ====================
  PS.pages['pub-todo'] = function () {
    const ep42 = PS.S.episodes.find(e => e.episode === 42) || PS.S.episodes[0];
    PS.shell('pub-todo', [['发布工作台', '#pub-confirm'], ['待发 · 排期', '#pub-todo']], `
      <div class="ph">
        <div><h1>待发 · 排期队列</h1><p>刚剪完、准备生成多平台文案与 publish.json 的内容。</p></div>
      </div>
      <div class="card row">
        <div class="min0 grow">
          <b>EP${ep42.episode} · ${PS.esc(ep42.title)}</b>
          <div class="sub">计划发布：${PS.esc((ep42.schedule || '').slice(0, 16).replace('T', ' '))} · 7 个目标平台</div>
        </div>
        <a class="btn primary s" href="#pub-pack">去打包各平台文案 ›</a>
      </div>
    `, 'mid');
  };

  // ==================== 发布 · 打包（#pub-pack） ====================
  PS.pages['pub-pack'] = function () {
    const ep = PS.S.episodes.find(e => e.id === curEpId) || PS.S.episodes[0];
    const main = PS.shell('pub-pack', [['发布工作台', '#pub-confirm'], ['打包 · publish.json', '#pub-pack']], `
      <div class="ph">
        <div>
          <h1>打包 · 各平台文案与工程校验</h1>
          <p>本地 Coding Agent 为 7 个平台生成差异化标题/标签/UTM 链接，并自动完成成片 faststart 校验。</p>
        </div>
        <div class="acts">
          <select id="pkSel" style="width:240px">${PS.S.episodes.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <a class="btn primary" href="#pub-confirm">去确认 · Chrome 填表 ›</a>
        </div>
      </div>

      <div class="card stack">
        <div class="row">
          <span class="pill good">成片 faststart ✓</span>
          <span class="pill good">3:4 & 16:9 封面齐 ✓</span>
          <span class="pill info">UTM 归因：${PS.esc(ep.campaign)}</span>
        </div>
        <pre class="codebox">${PS.esc(JSON.stringify(ep.publishJson, null, 2))}</pre>
      </div>
    `, 'mid');
    main.querySelector('#pkSel').onchange = e => { curEpId = +e.target.value; PS.pages['pub-pack'](); };
  };

  // ==================== 发布 · 确认（#pub-confirm · 自研开源专用 Chrome 填表引擎） ====================
  PS.pages['pub-confirm'] = function () {
    const ep = PS.S.episodes.find(e => e.id === curEpId) || PS.S.episodes[0];
    const active = PS.activePlats();

    const main = PS.shell('pub-confirm', [['发布工作台', '#pub-confirm'], ['确认 · 专用 Chrome 填表', '#pub-confirm']], `
      <div class="ph">
        <div>
          <h1>确认 · 自研开源多平台填表</h1>
          <p>专用 Chrome 分批自动传视频/封面/文案并截图留档；国内四家停在「等你点发」，点完自动取链接写回大屏。</p>
        </div>
        <div class="acts">
          <select id="cfSel" style="width:230px">${PS.S.episodes.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <button class="btn primary" id="fillAll">${PS.icon('chrome', 'sm')}分批启动 Chrome 填表</button>
        </div>
      </div>

      <section class="pub-grid">
        ${active.map(pid => {
          const p = PS.PLATFORMS[pid];
          const t = ep.tasks[pid] || { state: 'planned', detail: '等待开跑' };
          const sm = STATE_META[t.state] || STATE_META.planned;
          let btn = '';
          if (t.state === 'planned') btn = `<button class="btn primary s" data-fill="${pid}">填这一家</button>`;
          else if (t.state === 'awaiting_user') btn = `<button class="btn good s" data-sync="${pid}">我已点发 → 自动取链</button><button class="btn s" data-shot="${pid}">看截图</button>`;
          else if (t.state === 'scheduled') btn = `<button class="btn s" data-sync="${pid}">核对定时并取链</button>`;
          else if (t.state === 'published') btn = `<a class="btn s" href="${PS.esc(t.url || '#')}" target="_blank">打开作品 ↗</a><button class="btn s" data-shot="${pid}">存档</button>`;

          return `<div class="pub-card ${t.state}">
            <div class="row">
              ${PS.plogo(pid, 22)}<b>${p.name}</b>
              <span class="grow"></span>
              <span class="pill ${sm.cls}">${sm.label}</span>
            </div>
            <div class="sub" style="min-height:36px">${PS.esc(t.detail || '就绪')}</div>
            <div class="row" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--line-soft)">
              ${btn}
              <span class="grow"></span>
              <span class="sub" style="font-size:11px">${p.mode === 'manual' ? '只填不发' : '校验提交'}</span>
            </div>
          </div>`;
        }).join('')}
      </section>
    `);

    main.querySelector('#cfSel').onchange = e => { curEpId = +e.target.value; PS.pages['pub-confirm'](); };

    function fillOne(pid) {
      const p = PS.PLATFORMS[pid];
      ep.tasks[pid] = { state: 'running', detail: '专用 Chrome 已打开上传页，正在传成片、填文案并截图…', url: '', updatedAt: '刚刚', m: null };
      PS.pages['pub-confirm']();
      setTimeout(() => {
        if (p.mode === 'manual') {
          ep.tasks[pid] = { state: 'awaiting_user', detail: '已填完视频、封面和话题并截图留档，等你点最后一下「发布」', url: '', updatedAt: '刚刚', m: null };
          PS.toast(`${p.name} 已填好并推飞书催点发`, 'warn');
        } else {
          ep.tasks[pid] = { state: 'published', detail: '回读标题定时一致，已自动发布并回填链接', url: `https://example.com/${pid}/ep${ep.episode}`, updatedAt: '刚刚', m: { views: 1640, likes: 92, comments: 16, favorites: 48, shares: 14, fans: 18 } };
          PS.toast(`${p.name} 已校验提交并回填链接`, 'good');
        }
        PS.save();
        PS.pages['pub-confirm']();
      }, 750);
    }

    main.querySelectorAll('[data-fill]').forEach(b => b.onclick = () => fillOne(b.dataset.fill));
    main.querySelector('#fillAll').onclick = () => {
      const todo = active.filter(pid => (ep.tasks[pid]?.state || 'planned') === 'planned');
      if (!todo.length) return PS.toast('当前没有待开跑的平台');
      todo.forEach((pid, i) => setTimeout(() => fillOne(pid), i * 320));
    };
    main.querySelectorAll('[data-sync]').forEach(b => b.onclick = () => {
      const pid = b.dataset.sync;
      ep.tasks[pid] = { state: 'published', detail: '已从创作者后台自动取回链接并进入 6h 采样', url: `https://creator.${pid}.example/ep${ep.episode}`, updatedAt: '刚刚', m: { views: 5420, likes: 380, comments: 52, favorites: 410, shares: 76, fans: 62 } };
      PS.save();
      PS.toast(`${PS.PLATFORMS[pid].name} 链接已自动写回「已发」和「运营大屏」`, 'good');
      PS.pages['pub-confirm']();
    });
    main.querySelectorAll('[data-shot]').forEach(b => b.onclick = () => {
      const p = PS.PLATFORMS[b.dataset.shot];
      PS.modal({
        title: `提交前截图存档 · EP${ep.episode} · ${p.name}`,
        body: `<div class="card" style="background:var(--sunk)"><p class="m0">视频 faststart ✓ · 标题与定时回读一致 ✓<br>存档路径：<code class="mono">~/.park-studio/projects/EP${ep.episode}/publish_shots/${p.id}.jpg</code></p></div>`,
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
