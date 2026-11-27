/* 发布工作台（待发 / 打包 / 确认·自研专用Chrome填表 / 已发·矩阵与日历） + 复盘工作台（同龄复盘与抖音分析 / 转化归因） */
(function () {
  'use strict';
  const PS = window.PS;

  const STATE_META = {
    published:     { label: '已发 · 已取链', cls: 'good' },
    scheduled:     { label: '已定时', cls: 'info' },
    awaiting_user: { label: '填好 · 等你点发', cls: 'wait' },
    running:       { label: '专用 Chrome 填表中…', cls: 'accent' },
    failed:        { label: '上传 / 填表失败', cls: 'warn' },
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
    if (PS.S.activePubEpId && list.some(e => e.id === PS.S.activePubEpId)) {
      curPubEpId = PS.S.activePubEpId;
    }
    const ep = list.find(e => e.id === curPubEpId) || list[0];
    curPubEpId = ep.id;
    PS.S.activePubEpId = ep.id;
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
          <button class="btn primary" id="localizeCopyBtn">${PS.icon('spark', 'sm')}一键分平台适配文案（含中译英）</button>
          <a class="btn" href="#pub-confirm">去确认 · Chrome 填表 ›</a>
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
                <div class="row" style="gap:6px">
                  <input type="text" id="pkVideo" class="mono grow" value="${PS.esc(ep.videoPath || '')}" placeholder="~/Movies/ParkStudio/.../final/上传/视频.mp4">
                  ${PS.isMacApp ? '<button type="button" class="btn s" id="pickPkVideoBtn">选文件…</button>' : ''}
                </div>
              </div>
              <div>
                <label class="sub" style="display:block;margin-bottom:4px">计划发布时间（ISO）</label>
                <input type="text" id="pkSched" class="mono" value="${PS.esc(ep.schedule || '')}" placeholder="2026-11-24T19:00:00+08:00">
              </div>
            </div>
            <div><button class="btn primary s" id="pkSaveBtn">${PS.icon('check', 'sm')}保存并导出 publish.json</button></div>
          </div>
        </details>

        <div style="border-top:1px solid var(--line-soft);padding-top:12px" class="stack tight">
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <b style="font-size:13.5px">① 选标题 · 6 个不同动机备选（反差 / 冲突 / 数字 / 场景 / 悬念 / 结果）</b>
            <span class="sub" style="font-size:12px">自动读取你的口播逐字稿或稿件，每条标明点击动机与推荐封面大字</span>
            <span class="grow"></span>
            <button class="btn primary s" id="genTitlesBtn">${PS.icon('spark', 'sm')}AI 生成 6 个动机标题</button>
          </div>
          ${(ep.publishJson?.title_candidates || []).length ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:10px">
              ${(ep.publishJson.title_candidates || []).map((c, idx) => {
                const picked = ep.publishJson?.picked_title_idx === idx;
                return `<div class="card stack tight" style="padding:11px 13px;background:${picked ? 'color-mix(in srgb,var(--accent-soft) 38%,var(--surface))' : 'var(--sunk)'};border:${picked ? '1.5px solid var(--accent)' : '1px solid transparent'}">
                  <div class="row" style="gap:6px">
                    <span class="pill ${picked ? 'accent' : 'info'}" style="font-size:11px;padding:1px 7px">${PS.esc(c.motive || `角度 ${idx + 1}`)}</span>
                    <span class="grow"></span>
                    <button type="button" class="btn s ${picked ? 'good' : 'primary'}" data-pick-title="${idx}">${picked ? '✓ 当前已选' : '采用这个标题'}</button>
                  </div>
                  <div style="font-size:14px;font-weight:700;line-height:1.4">${PS.esc(c.title)}</div>
                  ${c.reason ? `<div class="sub" style="font-size:12px;line-height:1.45">为什么会点：${PS.esc(c.reason)}</div>` : ''}
                  ${c.cover_text ? `<div class="sub mono" style="font-size:11px;color:var(--accent)">推荐封面大字：${PS.esc(c.cover_text)}</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          ` : `<div class="sub" style="font-size:12.5px;padding:6px 0">点击右侧「AI 生成 6 个动机标题」，自动根据逐字稿出 6 个不同动机的备选标题与封面大字（选定后自动同步到下方封面工坊）。</div>`}
        </div>

        <div style="border-top:1px solid var(--line-soft);padding-top:12px" class="stack tight">
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <b style="font-size:13.5px">② 封面工坊 · 一键生成 3 比例封面（9:16 竖 / 4:3 横 / 16:9 横）</b>
            <span class="sub" style="font-size:12px">自动保存到 <code>final/上传/</code>，不用跳去 Canva / PS</span>
            <span class="grow"></span>
            <button class="btn s" id="genCoverLocalBtn">⚡ 1 秒本地抽帧出 3 张封面</button>
            <button class="btn primary s" id="genCoverAgentBtn">${PS.icon('spark', 'sm')}让剪辑 Agent 精做封面</button>
          </div>
          <div class="sys-2col">
            <input type="text" id="covHeadlineIn" value="${PS.esc(ep.publishJson?.cover_headline || ep.publishJson?.title || ep.title || '')}" placeholder="封面主标题（大字，建议 12–24 字）">
            <input type="text" id="covSubtitleIn" value="" placeholder="可选副标题 / 卖点标签（如：全流程开源 · 零 API 费）">
          </div>
          ${(ep.coverVPath || ep.coverHPath || ep.publishJson?.cover_169_path) ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:4px">
              ${[
                ['9:16 竖封面（抖音/视频号）', ep.coverVPath || ep.publishJson?.cover_v_path],
                ['4:3 横封面（小红书/抖音）', ep.publishJson?.cover_h_path || ep.coverHPath],
                ['16:9 封面（B站/YouTube）', ep.publishJson?.cover_169_path || ep.coverHPath],
              ].filter(([, p]) => !!p).map(([label, p]) => `<div class="card stack tight" style="padding:8px;background:var(--sunk);border:0">
                <span class="sub" style="font-size:11px;font-weight:600">${label}</span>
                <img src="/api/media/stream?path=${encodeURIComponent(p)}&t=${Date.now()}" alt="${label}" style="width:100%;max-height:160px;object-fit:cover;border-radius:7px;background:#111" onerror="this.style.display='none'">
              </div>`).join('')}
            </div>
          ` : ''}
        </div>

        <div style="border-top:1px solid var(--line-soft);padding-top:12px" class="stack tight">
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <b style="font-size:13.5px">③ 分平台语言 & 载体策略（当前已启用 ${PS.activePlats().length} 个平台）</b>
            <span class="sub" style="font-size:12px">点击小标签可自由切 <code>ZH / EN / 双语</code> 和 <code>🎬 视频 / 🖼️ 图文 / 📝 纯文字</code>（海外图文/文字绝不误传中文口播视频）</span>
            <span class="grow"></span>
            <button class="btn s" id="localizeCopyBtn2">${PS.icon('spark', 'sm')}AI 按策略生成各平台内容</button>
          </div>
          ${ep.publishJson?.en_card_path ? `<div class="row" style="padding:9px 12px;border-radius:10px;background:var(--sunk);gap:12px">
            <img src="/api/media/stream?path=${encodeURIComponent(ep.publishJson.en_card_path)}&t=${Date.now()}" alt="English Visual Card" style="width:68px;height:85px;object-fit:cover;border-radius:7px;background:#111;flex:none">
            <div class="min0 grow">
              <div class="row" style="gap:6px"><span class="pill accent">EN 图文卡 ✓</span><b style="font-size:13px">已自动生成纯英文杂志图文卡片（供 IG / Meta 独立发布，不含中文口播）</b></div>
              <div class="sub mono clip1" style="font-size:11px;margin-top:4px">${PS.esc(ep.publishJson.en_card_path)}</div>
            </div>
          </div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:10px">
            ${PS.activePlats().map(pid => {
              const p = PS.PLATFORMS[pid];
              const pCopy = (ep.publishJson?.platforms || {})[pid];
              const defStrat = {
                douyin: { lang: 'zh', format: 'video' }, xhs: { lang: 'zh', format: 'video' },
                bilibili: { lang: 'zh', format: 'video' }, channels: { lang: 'zh', format: 'video' },
                youtube: { lang: 'zh', format: 'video' }, wechat: { lang: 'zh', format: 'image_text' },
                instagram: { lang: 'en', format: 'image_text' }, meta: { lang: 'en', format: 'image_text' },
                tiktok: { lang: 'en', format: 'image_text' }, linkedin: { lang: 'en', format: 'text' },
                x: { lang: 'en', format: 'text' }, threads: { lang: 'en', format: 'text' },
              }[pid] || { lang: 'en', format: 'text' };
              const savedStrat = (PS.S.settings.platformStrategy || {})[pid] || defStrat;
              const curLang = savedStrat.lang || defStrat.lang;
              const curFmt = savedStrat.format || defStrat.format;
              const langLabel = curLang === 'en' ? 'EN 英文' : curLang === 'bilingual' ? '双语' : 'ZH 中文';
              const fmtLabel = curFmt === 'video' ? '🎬 视频' : curFmt === 'image_text' ? '🖼️ 图文' : '📝 纯文字';
              return `<div class="card stack tight" style="padding:11px 13px;background:var(--sunk);border:0">
                <div class="row" style="gap:5px;flex-wrap:wrap">
                  ${PS.plogo(pid, 18)}<b style="font-size:13px">${p.name}</b>
                  <button type="button" class="pill ${curLang === 'en' ? 'accent' : 'info'}" data-tog-lang="${pid}" title="点击切换该平台语言：ZH / EN / 双语" style="font-size:10.5px;padding:1px 6px;border:0;cursor:pointer">${langLabel}</button>
                  <button type="button" class="pill" data-tog-fmt="${pid}" title="点击切换该平台载体：视频 / 图文 / 纯文字（选图文或纯文字时绝不上传中文口播视频）" style="font-size:10.5px;padding:1px 6px;border:0;cursor:pointer">${fmtLabel}</button>
                  <span class="grow"></span>
                  ${pCopy ? '<span class="pill good" style="font-size:10px;padding:1px 5px">已适配</span>' : '<span class="sub" style="font-size:10.5px">原稿</span>'}
                </div>
                <div style="font-size:12.5px;font-weight:600;line-height:1.4">${PS.esc(pCopy?.title || ep.publishJson?.title || ep.title || '')}</div>
                <div class="sub clip2" style="font-size:12px;line-height:1.5">${PS.esc(pCopy?.description || ep.publishJson?.description || '点击「AI 按策略生成各平台内容」自动改写')}</div>
                ${(pCopy?.tags || []).length ? `<div class="sub mono clip1" style="font-size:11px;color:var(--accent)">${pCopy.tags.map(t => `#${PS.esc(t)}`).join(' ')}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>

        <details class="sub">
          <summary>查看完整 publish.json 原始数据</summary>
          <pre class="codebox" style="margin-top:8px">${PS.esc(JSON.stringify(ep.publishJson || {}, null, 2))}</pre>
        </details>
      </div>
    `);

    main.querySelector('#pkSel').onchange = e => { curPubEpId = +e.target.value; PS.pages['pub-pack'](); };
    main.querySelector('#pickPkVideoBtn')?.addEventListener('click', async () => {
      const p = await PS.pickNativePath({ mode: 'file', exts: ['mp4', 'mov', 'mkv'] });
      if (p) main.querySelector('#pkVideo').value = p;
    });
    const runLocalize = async btn => {
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'AI 正在按平台本地化改写（含中→英）…';
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/localize`, { platforms: PS.activePlats() });
        applyPubRes(res);
        PS.toast(`已由 ${res.backend}/${res.model} 为 ${res.localized} 个平台生成专属文案并写入 publish.json ✓`, 'good');
        PS.pages['pub-pack']();
      } catch (err) {
        PS.toast(err.message || '本地化适配失败', 'warn');
        btn.disabled = false; btn.innerHTML = old;
      }
    };
    main.querySelector('#genTitlesBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'AI 构思 6 个动机标题中…';
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/titles`, {});
        applyPubRes(res);
        if (res.lifecycle) PS.S.lifecycle = res.lifecycle;
        PS.toast(`已由 ${res.backend}/${res.model} 生成 ${res.candidates?.length || 6} 个动机备选标题 ✓`, 'good');
        PS.pages['pub-pack']();
      } catch (err) {
        PS.toast(err.message || '生成标题失败', 'warn');
        btn.disabled = false; btn.innerHTML = old;
      }
    });
    main.querySelectorAll('[data-pick-title]').forEach(b => b.onclick = async () => {
      const idx = +b.dataset.pickTitle;
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/pick-title`, { index: idx });
        applyPubRes(res);
        if (res.lifecycle) PS.S.lifecycle = res.lifecycle;
        PS.toast(`已采用标题并同步到封面大字：${res.title.slice(0, 20)} ✓`, 'good');
        PS.pages['pub-pack']();
      } catch (err) {
        PS.toast(err.message || '采用标题失败', 'warn');
      }
    });
    main.querySelector('#localizeCopyBtn')?.addEventListener('click', e => runLocalize(e.currentTarget));
    main.querySelector('#localizeCopyBtn2')?.addEventListener('click', e => runLocalize(e.currentTarget));
    const savePlatStrat = async (pid, patch) => {
      const curMap = { ...(PS.S.settings.platformStrategy || {}) };
      curMap[pid] = { ...(curMap[pid] || {}), ...patch };
      PS.S.settings.platformStrategy = curMap;
      PS.save();
      await PS.api('PUT', '/api/settings', { platformStrategy: { [pid]: curMap[pid] } }).catch(() => {});
      PS.pages['pub-pack']();
    };
    const LANG_CYCLE = ['zh', 'en', 'bilingual'];
    const FMT_CYCLE = ['video', 'image_text', 'text'];
    main.querySelectorAll('[data-tog-lang]').forEach(b => b.onclick = () => {
      const pid = b.dataset.togLang;
      const cur = (PS.S.settings.platformStrategy?.[pid]?.lang) || (['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'wechat'].includes(pid) ? 'zh' : 'en');
      const next = LANG_CYCLE[(LANG_CYCLE.indexOf(cur) + 1) % LANG_CYCLE.length];
      savePlatStrat(pid, { lang: next });
      PS.toast(`${PS.PLATFORMS[pid].name} 语言已切换为 ${next.toUpperCase()}（写入 config.yaml）`, 'good');
    });
    main.querySelectorAll('[data-tog-fmt]').forEach(b => b.onclick = () => {
      const pid = b.dataset.togFmt;
      const cur = (PS.S.settings.platformStrategy?.[pid]?.format) || (['douyin', 'xhs', 'bilibili', 'channels', 'youtube'].includes(pid) ? 'video' : ['instagram', 'meta', 'tiktok', 'wechat'].includes(pid) ? 'image_text' : 'text');
      const next = FMT_CYCLE[(FMT_CYCLE.indexOf(cur) + 1) % FMT_CYCLE.length];
      savePlatStrat(pid, { format: next });
      const lab = next === 'video' ? '🎬 视频' : next === 'image_text' ? '🖼️ 图文（不传中文视频）' : '📝 纯文字（不传视频）';
      PS.toast(`${PS.PLATFORMS[pid].name} 发布载体已切为：${lab}`, 'good');
    });
    const runCoverGen = async (btn, mode) => {
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = mode === 'agent' ? '剪辑 Agent 精做封面中…' : '本地极速出图中…';
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/generate-covers`, {
          mode,
          headline: main.querySelector('#covHeadlineIn')?.value.trim() || ep.title || '',
          subtitle: main.querySelector('#covSubtitleIn')?.value.trim() || '',
        });
        applyPubRes(res);
        PS.toast(mode === 'agent' ? `剪辑 Agent 已生成 3 比例封面并写入 final/上传/ ✓` : '1 秒本地生成 3 比例封面完成 ✓', 'good');
        PS.pages['pub-pack']();
      } catch (err) {
        PS.toast(err.message || '封面生成失败', 'warn');
        btn.disabled = false; btn.innerHTML = old;
      }
    };
    main.querySelector('#genCoverLocalBtn')?.addEventListener('click', e => runCoverGen(e.currentTarget, 'local'));
    main.querySelector('#genCoverAgentBtn')?.addEventListener('click', e => runCoverGen(e.currentTarget, 'agent'));
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
    if (PS.S.activePubEpId && list.some(e => e.id === PS.S.activePubEpId)) {
      curPubEpId = PS.S.activePubEpId;
    }
    const ep = list.find(e => e.id === curPubEpId) || list[0];
    curPubEpId = ep.id;
    PS.S.activePubEpId = ep.id;
    const active = PS.activePlats();

    const main = PS.shell('pub-confirm', [['发布工作台', '#pub-confirm'], ['确认 · 专用 Chrome 填表', '#pub-confirm']], `
      <div class="ph">
        <div>
          <h1>确认 · 自研开源多平台填表</h1>
          <p>100% MIT 自研 CDP 引擎（零闭源插件）：自动在专用 Chrome 打开创作页、填文案/传视频并截图留档；国内四家严格停在「等你点发」，发完自动取链。</p>
        </div>
        <div class="acts">
          <select id="cfSel" style="width:230px">${list.map(e => `<option value="${e.id}" ${e.id === ep.id ? 'selected' : ''}>EP${e.episode} · ${PS.esc(e.nick)}</option>`).join('')}</select>
          <button class="btn" id="cfLocalizeBtn">${PS.icon('spark', 'sm')}分平台适配文案（中→英）</button>
          <button class="btn primary" id="fillAll">${PS.icon('chrome', 'sm')}分批启动 Chrome 填表</button>
        </div>
      </div>

      <section class="pub-grid">
        ${active.map(pid => {
          const p = PS.PLATFORMS[pid];
          const t = ep.tasks[pid] || { state: 'planned', detail: '等待开跑' };
          const sm = STATE_META[t.state] || STATE_META.planned;
          let btn = '';
          if (t.state === 'planned') {
            btn = `<button class="btn primary s" data-fill="${pid}">填这一家</button>`;
          } else if (t.state === 'failed') {
            btn = `<button class="btn primary s" data-fill="${pid}">重试填表</button>`
              + (t.hasScreenshot ? `<button class="btn s" data-shot="${pid}">看现场截图</button>` : '');
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

          const stMap = PS.S.settings.platformStrategy || {};
          const pStrat = stMap[pid] || {
            lang: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube', 'wechat'].includes(pid) ? 'zh' : 'en',
            format: ['douyin', 'xhs', 'bilibili', 'channels', 'youtube'].includes(pid) ? 'video' : ['instagram', 'meta', 'tiktok', 'wechat'].includes(pid) ? 'image_text' : 'text',
          };
          const stratTag = `${(pStrat.lang || 'zh').toUpperCase()} · ${pStrat.format === 'video' ? '🎬 视频' : pStrat.format === 'image_text' ? '🖼️ 图文' : '📝 纯文字'}`;

          return `<div class="pub-card ${t.state}">
            <div class="row">
              ${PS.plogo(pid, 22)}<b>${p.name}</b>
              <span class="pill" style="font-size:10px;padding:1px 6px">${stratTag}</span>
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
    main.querySelector('#cfLocalizeBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'AI 本地化适配中…';
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/localize`, { platforms: active });
        applyPubRes(res);
        PS.toast(`已为 ${res.localized} 个平台生成本地化文案（含英文平台改写）✓`, 'good');
        PS.pages['pub-confirm']();
      } catch (err) {
        PS.toast(err.message || '本地化适配失败', 'warn');
        btn.disabled = false; btn.innerHTML = old;
      }
    });

    async function fillOne(pid, btnEl) {
      const p = PS.PLATFORMS[pid];
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Chrome 填表中…'; }
      try {
        const res = await PS.api('POST', `/api/publish/${ep.id}/fill`, { platform: pid });
        applyPubRes(res);
        PS.toast(res.ok ? `${p.name} 已校验填妥并截图留档，请亲自点发布` : (res.detail || res.reason || `${p.name} 填表未通过校验`), res.ok ? 'good' : 'warn');
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
    `);

    main.querySelector('#vMat').onclick = () => { sentView = 'matrix'; PS.pages['pub-sent'](); };
    main.querySelector('#vCal').onclick = () => { sentView = 'cal'; PS.pages['pub-sent'](); };
  };

  // ==================== 复盘 · 宽屏作品分析、跨平台主从复盘与可视化经营周报（#review） ====================
  let revTab = 'douyin';
  let dySort = 'date';
  let ageSelIdx = 0;
  let ageFilter = 'all';
  let ageSort = 'date';

  PS.pages.review = function (sub) {
    if (['douyin', 'age', 'weekly'].includes(sub)) revTab = sub;
    const an = PS.S.analytics || {};
    const dy = an.douyin || { count: 0, medianViews: 0, medianLikes: 0, favLikePct: 0, hit3xCount: 0, scatter: [] };
    const ageAll = an.ageReviews || [];
    const wb = an.weeklyBrief || null;
    const fmtDur = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : (s ? `${s}s` : '–');
    const dyFan = PS.fanStats('douyin');

    const retBar = (val, tone) => {
      if (val == null) return '<span class="sub">–</span>';
      const w = Math.max(4, Math.min(100, Number(val)));
      return `<span class="ret-mini"><b>${val}%</b><span class="ret-mini-bar ${tone || ''}"><i style="width:${w}%"></i></span></span>`;
    };

    let body = '';
    let sortedDy = [...(dy.scatter || [])];
    let filteredAge = [...ageAll];

    if (revTab === 'douyin') {
      if (dySort === 'views') sortedDy.sort((a, b) => (b.views || 0) - (a.views || 0));
      else if (dySort === 'c5s') sortedDy.sort((a, b) => (b.completion5sPct ?? -1) - (a.completion5sPct ?? -1));
      else if (dySort === 'stay2s') sortedDy.sort((a, b) => (b.stay2sPct ?? -1) - (a.stay2sPct ?? -1));
      else if (dySort === 'fans') sortedDy.sort((a, b) => (b.fansGained ?? -1) - (a.fansGained ?? -1));

      body = `
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-lab">抖音粉丝</div>
            <div class="kpi-val">${PS.fmt(dyFan.total)}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">7日 ${PS.sgn(dyFan.d7)} · 作品涨粉 ${dy.totalFansGained != null ? '+' + PS.fmt(dy.totalFansGained) : '待同步'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lab">中位播放 · 3× 爆款</div>
            <div class="kpi-val">${dy.count ? PS.kfmt(dy.medianViews) : '–'}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px"><b style="color:var(--accent)">${dy.hit3xCount || 0} 条</b> 3×爆款 · 点赞中位 ${dy.count ? PS.fmt(dy.medianLikes) : '–'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lab">2 秒留存（2s 跳出）</div>
            <div class="kpi-val" style="color:${(dy.median2sStayPct || 0) >= 60 ? 'var(--good)' : 'var(--ink)'}">${dy.median2sStayPct != null ? dy.median2sStayPct + '%' : '待采'}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">${dy.median2sBouncePct != null ? `2秒跳出中位 ${dy.median2sBouncePct}%` : '点「立即采流量」同步'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lab">5 秒完播率（中位）</div>
            <div class="kpi-val" style="color:${(dy.median5sPct || 0) >= 35 ? 'var(--good)' : 'var(--accent)'}">${dy.median5sPct != null ? dy.median5sPct + '%' : '待采'}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">${dy.medianCompletionPct != null ? `全片完播中位 ${dy.medianCompletionPct}%` : '开头抓人核心指标'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lab">平均播放时长</div>
            <div class="kpi-val">${dy.medianAvgViewS != null ? dy.medianAvgViewS + 's' : '待采'}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">收藏 / 赞比 <b>${dy.count ? dy.favLikePct + '%' : '–'}</b></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lab">封面点击率（中位）</div>
            <div class="kpi-val">${dy.medianCoverCtrPct != null ? dy.medianCoverCtrPct + '%' : '待采'}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">主页访问 ${dy.totalHomeVisits != null ? PS.fmt(dy.totalHomeVisits) : '–'}</div>
          </div>
        </div>

        ${(dy.retentionInsights && dy.retentionInsights.length) ? `
          <section class="card stack tight" style="padding:14px 18px">
            <div class="row" style="gap:8px"><b style="font-size:13.5px">抖音留存与爆款归因</b><span class="sub" style="font-size:12px">基于真实 2s 跳出 / 5s 完播 / 封面点击 / 单条涨粉自动计算</span></div>
            <div class="rev-2col-eq" style="gap:10px">
              ${dy.retentionInsights.map(i => `<div class="ins-item" style="background:var(--sunk);padding:10px 12px;border-radius:10px"><em class="${i.cls}">${i.tag}</em><div>${i.html}</div></div>`).join('')}
            </div>
          </section>
        ` : ''}

        <div class="rev-2col-eq">
          <div class="card stack">
            <div class="card-h">
              <h3>开头留存体检（2秒留存 × 5秒完播）</h3>
              <span class="sub">浅柱=2s留存 · 实柱=5s完播（金=3×爆款）· 绿点=封面点击</span>
            </div>
            <div class="chart-box tall" id="dyRetentionChart"></div>
          </div>
          <div class="card stack">
            <div class="card-h">
              <h3>时长 × 播放散点图（真实采集 ${dy.count || 0} 条）</h3>
              <span class="sub">金色圆点 = 高于中位数 3 倍以上 · 悬停看完整留存与涨粉</span>
            </div>
            <div class="chart-box tall" id="dyScatter"></div>
          </div>
        </div>

        ${sortedDy.length ? `
          <section class="card pad-0">
            <div class="card-h" style="padding:14px 18px 8px;flex-wrap:wrap;gap:10px">
              <div>
                <h3 style="margin:0">抖音作品实测明细（含留存 / 封面 / 涨粉）</h3>
                <span class="sub" style="font-size:12px">来自抖音创作者后台实时拉取 · 点标题直达原视频</span>
              </div>
              <div class="seg" id="dySortSeg">
                ${[
                  ['date', '按最新'],
                  ['views', '按播放'],
                  ['c5s', '按 5s 完播'],
                  ['stay2s', '按 2s 留存'],
                  ['fans', '按单条涨粉'],
                ].map(([k, lab]) => `<button type="button" class="${dySort === k ? 'on' : ''}" data-dysort="${k}">${lab}</button>`).join('')}
              </div>
            </div>
            <div class="tbl-wrap"><table class="tbl">
              <thead><tr>
                <th style="min-width:260px">标题与诊断</th>
                <th>发布日</th>
                <th class="n">时长</th>
                <th class="n">播放 / 倍数</th>
                <th class="n">2s 留存 / 跳出</th>
                <th class="n">5s 完播</th>
                <th class="n">均看 / 完播</th>
                <th class="n">封面点击</th>
                <th class="n">单条涨粉</th>
                <th class="n">赞 · 藏 · 评</th>
                <th class="n">操作</th>
              </tr></thead>
              <tbody>${sortedDy.map((w, idx) => `<tr>
                <td>
                  <a href="${PS.esc(w.url || '#')}" target="_blank" rel="noopener" style="font-weight:600;display:block">${PS.esc(w.title)}</a>
                  ${w.diagTag ? `<span class="pill ${w.diagTone || ''}" style="font-size:10.5px;padding:1px 6px;margin-top:4px;display:inline-flex">${PS.esc(w.diagTag)}</span>` : ''}
                </td>
                <td class="mono sub" style="font-size:12px;white-space:nowrap">${PS.esc(w.published_at || '–')}</td>
                <td class="n mono sub">${fmtDur(w.sec)}</td>
                <td class="n" style="white-space:nowrap"><b>${PS.fmt(w.views)}</b> <span class="pill ${w.mult >= 3 ? 'accent' : ''}" style="font-size:11px;padding:1px 6px">${w.mult}×</span></td>
                <td class="n" style="white-space:nowrap">
                  ${retBar(w.stay2sPct, (w.bounce2sPct || 0) >= 42 ? 'warn' : ((w.stay2sPct || 0) >= 65 ? 'good' : ''))}
                  ${w.bounce2sPct != null ? `<div class="sub" style="font-size:10.5px">跳出 ${w.bounce2sPct}%</div>` : ''}
                </td>
                <td class="n" style="white-space:nowrap">${retBar(w.completion5sPct, (w.completion5sPct || 0) >= 42 ? 'good' : ((w.completion5sPct || 0) < 30 ? 'warn' : ''))}</td>
                <td class="n mono" style="white-space:nowrap">
                  <div>${w.avgViewS != null ? w.avgViewS + 's' : '–'}</div>
                  <div class="sub" style="font-size:10.5px">${w.completionPct != null ? `完播 ${w.completionPct}%` : ''}</div>
                </td>
                <td class="n mono" style="white-space:nowrap">${w.coverCtrPct != null ? `<b>${w.coverCtrPct}%</b>` : '<span class="sub">–</span>'}</td>
                <td class="n mono" style="white-space:nowrap">
                  ${w.fansGained != null ? `<b style="color:${w.fansGained >= 200 ? 'var(--good)' : 'var(--ink)'}">+${PS.fmt(w.fansGained)}</b>` : '<span class="sub">–</span>'}
                  ${w.homeVisits ? `<div class="sub" style="font-size:10.5px">主页 ${PS.kfmt(w.homeVisits)}</div>` : ''}
                </td>
                <td class="n mono sub" style="font-size:12px;white-space:nowrap">${PS.fmt(w.likes)} / ${PS.fmt(w.favorites)} / ${PS.fmt(w.comments)}</td>
                <td class="n"><button type="button" class="btn s ${w.mult >= 3 ? 'primary' : ''}" data-next-idx="${idx}">反推选题</button></td>
              </tr>`).join('')}</tbody>
            </table></div>
          </section>
        ` : ''}
      `;
    } else if (revTab === 'age') {
      if (ageFilter === 'multi') filteredAge = filteredAge.filter(e => (e.platformCount || Object.keys(e.platforms || {}).length) >= 2);
      if (ageSort === 'views') filteredAge.sort((a, b) => (b.views || 0) - (a.views || 0));
      else if (ageSort === 'inter') filteredAge.sort((a, b) => (b.interRate || 0) - (a.interRate || 0));
      if (ageSelIdx >= filteredAge.length) ageSelIdx = 0;

      const multiCount = ageAll.filter(e => (e.platformCount || Object.keys(e.platforms || {}).length) >= 2).length;
      if (!ageAll.length) {
        body = `<div class="card stack"><b>暂无跨平台单期复盘数据</b><p class="sub m0">点击右上角「立即采流量」，系统会自动归并你在抖音、视频号、B站、YouTube、小红书发过的每一期真实作品，并持续按天记录快照生成 1/3/7 天同龄对比。</p></div>`;
      } else {
        const cur = filteredAge[ageSelIdx] || filteredAge[0];
        const bdown = cur ? (cur.platformBreakdown || Object.entries(cur.platforms || {}).map(([pid, pw]) => ({
          platform: pid, name: PS.PLATFORMS[pid]?.name || pid, views: pw.views || 0,
          sharePct: cur.views ? Math.round((pw.views / cur.views) * 1000) / 10 : 0,
          likes: pw.likes || 0, favorites: pw.favorites || 0, comments: pw.comments || 0,
          interRate: pw.views ? Math.round(((pw.likes + pw.favorites + pw.comments + (pw.shares || 0)) / pw.views) * 1000) / 10 : 0,
          url: pw.url || '',
        }))) : [];
        const dyEntry = bdown.find(x => x.platform === 'douyin' && (x.completion5sPct != null || x.stay2sPct != null));

        body = `
          <div class="row" style="flex-wrap:wrap;gap:10px">
            <div class="seg" id="ageFilterSeg">
              <button type="button" class="${ageFilter === 'all' ? 'on' : ''}" data-af="all">全部期次 (${ageAll.length})</button>
              <button type="button" class="${ageFilter === 'multi' ? 'on' : ''}" data-af="multi">多平台归并 (${multiCount})</button>
            </div>
            <div class="seg" id="ageSortSeg">
              <button type="button" class="${ageSort === 'date' ? 'on' : ''}" data-as="date">按最新</button>
              <button type="button" class="${ageSort === 'views' ? 'on' : ''}" data-as="views">按播放最高</button>
              <button type="button" class="${ageSort === 'inter' ? 'on' : ''}" data-as="inter">按互动率</button>
            </div>
            <span class="grow"></span>
            <span class="sub" style="font-size:12px">左侧选一期，右侧看全平台拆解、留存漏斗与 1/3/7 天快照</span>
          </div>

          ${!cur ? '<div class="card"><span class="sub">当前筛选下暂无期次，请切回「全部期次」。</span></div>' : `
          <div class="ep-split">
            <div class="ep-list">
              ${filteredAge.map((ep, i) => `<button type="button" class="ep-item ${i === ageSelIdx ? 'on' : ''}" data-age-idx="${i}">
                <div class="row" style="gap:6px">
                  <span class="pill ${i === ageSelIdx ? 'accent' : ''}" style="font-size:11px;padding:1px 7px">${PS.esc(ep.published_at || '近期')}</span>
                  <span class="sub" style="font-size:11.5px">${ep.platformCount || Object.keys(ep.platforms || {}).length} 平台</span>
                  <span class="grow"></span>
                  ${ep.multVsAccount != null ? `<span class="pill ${ep.multVsAccount >= 2.5 ? 'good' : ''}" style="font-size:10.5px;padding:1px 6px">${ep.multVsAccount}×</span>` : ''}
                </div>
                <b class="clip2" style="font-size:13.5px;line-height:1.38">${PS.esc(ep.title)}</b>
                <div class="row" style="gap:8px;font-size:12px">
                  <span><b>${PS.kfmt(ep.views)}</b> 播放</span>
                  <span class="sub">互动率 ${ep.interRate}%</span>
                  <span class="grow"></span>
                  <span class="row" style="gap:3px">${Object.keys(ep.platforms || {}).slice(0, 5).map(pid => PS.plogo(pid, 14)).join('')}</span>
                </div>
              </button>`).join('')}
            </div>

            <div class="card stack" style="padding:20px 22px">
              <div class="row" style="flex-wrap:wrap;gap:8px;align-items:flex-start">
                <div class="grow min0">
                  <div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap">
                    <span class="pill accent">${PS.esc(cur.published_at || '已发布')}</span>
                    <span class="pill">已归并 ${bdown.length} 平台</span>
                    ${cur.duration_sec ? `<span class="pill">时长 ${fmtDur(cur.duration_sec)}</span>` : ''}
                    ${cur.ratio != null ? `<span class="pill ${cur.ratio >= 1 ? 'good' : 'warn'}">较上期 ${cur.ratio}×</span>` : ''}
                  </div>
                  <h2 class="m0" style="font-size:19px;line-height:1.35">${PS.esc(cur.title)}</h2>
                </div>
                <button type="button" class="btn primary s" data-next-ep="${PS.esc(cur.title)}" data-next-views="${cur.views || 0}">${PS.icon('spark', 'sm')}爆款反推下期 3 选题</button>
              </div>

              <div class="wb-story ${cur.multVsAccount >= 2.5 ? 'good' : (cur.multVsAccount <= 0.5 ? 'warn' : '')}">
                <b style="font-size:12.5px">单期跨平台诊断</b>
                <div style="font-size:13px">${PS.esc(cur.verdict || '')}${cur.prevViews ? `（对比上期《${PS.esc(cur.prevTitle)}》${PS.fmt(cur.prevViews)} 播放）` : ''}</div>
              </div>

              <div class="kpi-row" style="grid-template-columns:repeat(4,minmax(0,1fr))">
                <div class="kpi-card"><div class="kpi-lab">全平台总播放</div><div class="kpi-val">${PS.fmt(cur.views)}</div></div>
                <div class="kpi-card"><div class="kpi-lab">全平台总互动</div><div class="kpi-val">${PS.fmt(cur.inter)}</div><div class="sub" style="font-size:11.5px">互动率 ${cur.interRate}%</div></div>
                <div class="kpi-card"><div class="kpi-lab">主力阵地</div><div class="kpi-val" style="font-size:20px">${PS.esc(cur.leadName || '–')}</div><div class="sub" style="font-size:11.5px">贡献 ${cur.leadSharePct || 0}% 播放</div></div>
                <div class="kpi-card"><div class="kpi-lab">收藏 / 点赞</div><div class="kpi-val">${cur.likes ? PS.pct(cur.favorites || 0, cur.likes, 0) : '–'}</div><div class="sub" style="font-size:11.5px">赞 ${PS.fmt(cur.likes || 0)} · 藏 ${PS.fmt(cur.favorites || 0)}</div></div>
              </div>

              <div class="stack tight">
                <b style="font-size:13.5px">各平台流量分布占比</b>
                <div class="stack tight" style="gap:8px">
                  ${bdown.map(p => {
                    const col = PS.PLATFORMS[p.platform]?.color || 'var(--accent)';
                    return `<div class="ep-bar-row">
                      <span class="row" style="gap:6px">${PS.plogo(p.platform, 16)}<b>${PS.esc(p.name)}</b></span>
                      <div class="ep-bar-track"><div class="ep-bar-fill" style="width:${Math.max(2, p.sharePct)}%;background:${col}"></div></div>
                      <span class="mono" style="text-align:right"><b>${PS.kfmt(p.views)}</b> <span class="sub">(${p.sharePct}%)</span></span>
                    </div>`;
                  }).join('')}
                </div>
              </div>

              ${dyEntry ? `
                <div class="stack tight" style="padding:12px 14px;border-radius:12px;background:var(--sunk)">
                  <b style="font-size:13px">抖音开头与留存漏斗（本条实测）</b>
                  <div class="kpi-row" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
                    <div><div class="kpi-lab">2 秒留存</div><div style="font-size:18px;font-weight:700">${dyEntry.stay2sPct ?? '–'}%</div></div>
                    <div><div class="kpi-lab">5 秒完播</div><div style="font-size:18px;font-weight:700;color:var(--accent)">${dyEntry.completion5sPct ?? '–'}%</div></div>
                    <div><div class="kpi-lab">全片完播</div><div style="font-size:18px;font-weight:700">${dyEntry.completionPct ?? '–'}%</div></div>
                    <div><div class="kpi-lab">均看时长</div><div style="font-size:18px;font-weight:700">${dyEntry.avgViewS != null ? dyEntry.avgViewS + 's' : '–'}</div></div>
                    <div><div class="kpi-lab">封面点击</div><div style="font-size:18px;font-weight:700">${dyEntry.coverCtrPct ?? '–'}%</div></div>
                    <div><div class="kpi-lab">单条涨粉</div><div style="font-size:18px;font-weight:700;color:var(--good)">+${PS.fmt(dyEntry.fansGained || 0)}</div></div>
                  </div>
                </div>
              ` : ''}

              <div class="tbl-wrap"><table class="tbl">
                <thead><tr><th>平台</th><th class="n">播放</th><th class="n">流量占比</th><th class="n">点赞</th><th class="n">收藏</th><th class="n">评论</th><th class="n">互动率</th><th class="n">原作品</th></tr></thead>
                <tbody>${bdown.map(p => `<tr>
                  <td><span class="row" style="gap:6px">${PS.plogo(p.platform, 15)}<b>${PS.esc(p.name)}</b></span></td>
                  <td class="n"><b>${PS.fmt(p.views)}</b></td>
                  <td class="n mono sub">${p.sharePct}%</td>
                  <td class="n mono">${PS.fmt(p.likes)}</td>
                  <td class="n mono">${PS.fmt(p.favorites)}</td>
                  <td class="n mono">${PS.fmt(p.comments)}</td>
                  <td class="n mono">${p.interRate}%</td>
                  <td class="n">${p.url ? `<a class="btn s" href="${PS.esc(p.url)}" target="_blank" rel="noopener">查看 ↗</a>` : '–'}</td>
                </tr>`).join('')}</tbody>
              </table></div>

              <div class="row" style="flex-wrap:wrap;gap:8px;padding-top:6px;border-top:1px solid var(--line-soft)">
                <b style="font-size:12.5px">同龄快照轨迹：</b>
                ${cur.snapshots?.length
                  ? cur.snapshots.map(s => `<span class="pill" style="font-size:11.5px">${PS.esc(s.day)} · 第 ${s.age} 天 · <b>${PS.kfmt(s.views)}</b></span>`).join('<span class="sub">→</span>')
                  : '<span class="sub" style="font-size:12px">持续每日采数后将自动记录第 1 / 3 / 7 天增长曲线</span>'}
              </div>
            </div>
          </div>
          `}
        `;
      }
    } else {
      const memo = wb?.aiMemo || null;
      body = !wb ? `<div class="card stack"><b>暂无周报数据</b><p class="sub m0">点击右上角「立即采流量」后自动生成经营周报。</p></div>` : `
        <section class="wb-hero">
          <div class="row" style="flex-wrap:wrap;gap:10px;align-items:center">
            <span class="pill accent">经营周报 · ${PS.esc(wb.generatedAt || '')}</span>
            <span class="grow"></span>
            <button type="button" class="btn primary s" id="aiWeeklyBtn">${PS.icon('spark', 'sm')}✨ AI 深度解读本周</button>
            <button type="button" class="btn s" id="copyWeeklyBtn">复制飞书 / Markdown 周报</button>
          </div>
          <h2 class="m0" style="font-size:18px;line-height:1.45">${PS.esc(wb.headline || '')}</h2>
          ${memo ? `
            <div class="card stack tight" style="background:var(--surface);border-color:color-mix(in srgb,var(--accent) 30%,var(--line-soft));padding:14px 16px">
              <div class="row" style="gap:8px">
                <span class="pill good">AI 操盘手解读</span>
                <span class="sub" style="font-size:11.5px">${PS.esc(memo.generatedAt || '')} · ${PS.esc(memo.backend || '')}${memo.model ? '/' + PS.esc(memo.model) : ''}</span>
              </div>
              <div style="font-size:13.5px;font-weight:600;line-height:1.5">${PS.esc(memo.summary || '')}</div>
              <div class="wb-memo-grid">
                ${memo.working ? `<div class="wb-story good"><b style="font-size:12px">正在奏效</b><span style="font-size:12.5px">${PS.esc(memo.working)}</span></div>` : ''}
                ${memo.leak ? `<div class="wb-story warn"><b style="font-size:12px">最大漏水点</b><span style="font-size:12.5px">${PS.esc(memo.leak)}</span></div>` : ''}
                ${(memo.nextMoves && memo.nextMoves.length) ? `<div class="wb-story"><b style="font-size:12px">下周最优先动作</b><ul style="margin:2px 0 0;padding-left:16px;font-size:12.5px">${memo.nextMoves.map(m => `<li>${PS.esc(m)}</li>`).join('')}</ul></div>` : ''}
              </div>
            </div>
          ` : ''}
        </section>

        <div class="kpi-row">
          ${(wb.kpis || []).map(k => `<div class="kpi-card">
            <div class="kpi-lab">${PS.esc(k.lab)}</div>
            <div class="kpi-val" style="${k.tone === 'good' ? 'color:var(--good)' : k.tone === 'accent' ? 'color:var(--accent)' : ''}">${PS.esc(k.val)}</div>
            <div class="sub" style="font-size:11.5px;margin-top:4px">${PS.esc(k.sub || '')}</div>
          </div>`).join('')}
        </div>

        <div class="rev-2col">
          <div class="stack">
            <section class="card stack tight">
              <div class="card-h"><h3>本周发生了什么（经营复盘）</h3><span class="sub">把冷冰冰的数字翻译成发生的变化</span></div>
              <div class="stack tight" style="gap:10px">
                ${(wb.whatHappened || []).map(s => `<div class="wb-story ${s.tone || ''}">
                  <div class="row" style="gap:6px"><span class="pill ${s.tone || ''}" style="font-size:10.5px;padding:1px 7px">${PS.esc(s.tag)}</span><b style="font-size:13.5px">${PS.esc(s.title)}</b></div>
                  <div class="sub" style="font-size:12.5px;line-height:1.5;margin-top:2px">${PS.esc(s.detail)}</div>
                </div>`).join('') || '<div class="sub">暂无足够变化数据</div>'}
              </div>
            </section>

            <section class="card stack tight">
              <div class="card-h"><h3>下周行动清单</h3><span class="sub">点右侧直接跳对应工作台执行</span></div>
              <div class="stack tight" style="gap:9px">
                ${(wb.nextWeekActions || []).map(a => `<div class="wb-action">
                  <span class="pill ${a.priority === 'P0' ? 'accent' : ''}" style="font-size:11px;flex:none">${PS.esc(a.priority)}</span>
                  <div class="grow min0">
                    <b style="font-size:13.5px;display:block">${PS.esc(a.title)}</b>
                    <div class="sub" style="font-size:12px;margin-top:3px">${PS.esc(a.detail)}</div>
                  </div>
                  <a class="btn s" href="${PS.esc(a.hash || '#dashboard')}" style="flex:none">${PS.esc(a.cta || '去执行 ›')}</a>
                </div>`).join('')}
              </div>
            </section>
          </div>

          <div class="stack">
            <section class="card pad-0">
              <div class="card-h" style="padding:14px 16px 6px"><h3>各平台健康度体检</h3><span class="sub">粉丝 + 作品播放归因</span></div>
              <div class="tbl-wrap"><table class="tbl">
                <thead><tr><th>平台</th><th class="n">粉丝 (7日)</th><th class="n">作品</th><th class="n">累计播放</th><th class="n">互动率</th><th>阵地定位</th></tr></thead>
                <tbody>${(wb.platformHealth || []).map(p => `<tr>
                  <td><span class="row" style="gap:6px">${PS.plogo(p.platform, 15)}<b>${PS.esc(p.name)}</b></span></td>
                  <td class="n mono">${PS.fmt(p.fans)} <span class="sub" style="font-size:11px">(${PS.sgn(p.d7Fans)})</span></td>
                  <td class="n mono">${p.works}</td>
                  <td class="n mono"><b>${PS.kfmt(p.views)}</b> <span class="sub" style="font-size:11px">${p.viewSharePct}%</span></td>
                  <td class="n mono">${p.interRate}%</td>
                  <td><span class="pill ${p.role === '核心主阵地' ? 'accent' : ''}" style="font-size:10.5px;padding:1px 6px">${PS.esc(p.role)}</span></td>
                </tr>`).join('')}</tbody>
              </table></div>
            </section>

            <section class="card stack tight">
              <div class="card-h"><h3>红黑榜：Top 3 代表作 vs 需优化作品</h3></div>
              <div class="stack tight" style="gap:8px">
                <div class="sub" style="font-size:11.5px;font-weight:700;color:var(--good)">🏆 表现最好（值得做续集）</div>
                ${(wb.winners || []).map(w => `<div class="row" style="padding:8px 10px;border-radius:9px;background:var(--sunk);gap:8px">
                  <div class="grow min0">
                    <b class="clip1" style="font-size:13px;display:block">${PS.esc(w.title)}</b>
                    <div class="sub" style="font-size:11.5px">${PS.esc(w.published_at || '')} · ${PS.esc(w.reason || '')}</div>
                  </div>
                  <b class="mono" style="white-space:nowrap">${PS.kfmt(w.views)}</b>
                </div>`).join('') || '<div class="sub">暂无数据</div>'}

                ${(wb.watchouts && wb.watchouts.length) ? `
                  <div class="sub" style="font-size:11.5px;font-weight:700;color:var(--warn);margin-top:6px">⚠️ 值得复盘改进（低播放 / 高跳出）</div>
                  ${wb.watchouts.map(w => `<div class="row" style="padding:8px 10px;border-radius:9px;background:var(--sunk);gap:8px">
                    <div class="grow min0">
                      <b class="clip1" style="font-size:13px;display:block">${PS.esc(w.title)}</b>
                      <div class="sub" style="font-size:11.5px">${PS.esc(w.published_at || '')} · ${PS.esc(w.reason || '')}</div>
                    </div>
                    <span class="mono sub" style="white-space:nowrap">${PS.kfmt(w.views)}</span>
                  </div>`).join('')}
                ` : ''}
              </div>
            </section>
          </div>
        </div>

        <details class="card" style="padding:12px 16px">
          <summary style="cursor:pointer;font-size:12.5px;font-weight:600;color:var(--ink-2)">查看可粘贴到飞书 / 微信群的纯文本周报</summary>
          <pre class="codebox" id="weeklyPre" style="margin-top:10px">${PS.esc(an.weeklyReport || '')}</pre>
        </details>
      `;
    }

    const main = PS.shell('review', [['复盘工作台', '#dashboard'], ['同龄复盘 · 抖音分析', '#review']], `
      <div class="ph">
        <div><h1>复盘与作品分析</h1><p>100% 来自专用 Chrome 实测采集（已入库 ${an.totalWorks || 0} 条作品 · 跨平台归并 ${an.totalEpisodes || 0} 期${dy.hasRetention ? ' · 已同步抖音 2s 留存 / 5s 完播 / 封面点击 / 单条涨粉' : ''}）。</p></div>
        <div class="acts"><button class="btn primary" id="revCollectBtn">${PS.icon('refresh', 'sm')}立即采流量</button></div>
      </div>
      <div class="utabs">
        <button class="utab ${revTab === 'douyin' ? 'on' : ''}" onclick="location.hash='#review/douyin'">抖音作品分析 (${dy.count || 0})</button>
        <button class="utab ${revTab === 'age' ? 'on' : ''}" onclick="location.hash='#review/age'">跨平台单期复盘 (${ageAll.length})</button>
        <button class="utab ${revTab === 'weekly' ? 'on' : ''}" onclick="location.hash='#review/weekly'">真实数据周报</button>
      </div>
      ${body}
    `);
    if (revTab === 'douyin') {
      PS.drawDouyinRetention(main.querySelector('#dyRetentionChart'), dy.scatter, dy.median5sPct);
      PS.drawDouyinScatter(main.querySelector('#dyScatter'), dy.scatter, dy.medianViews);
      main.querySelectorAll('[data-dysort]').forEach(b => b.onclick = () => { dySort = b.dataset.dysort; PS.pages.review('douyin'); });
    }
    if (revTab === 'age') {
      main.querySelectorAll('[data-af]').forEach(b => b.onclick = () => { ageFilter = b.dataset.af; ageSelIdx = 0; PS.pages.review('age'); });
      main.querySelectorAll('[data-as]').forEach(b => b.onclick = () => { ageSort = b.dataset.as; ageSelIdx = 0; PS.pages.review('age'); });
      main.querySelectorAll('[data-age-idx]').forEach(b => b.onclick = () => { ageSelIdx = +b.dataset.ageIdx; PS.pages.review('age'); });
    }
    main.querySelector('#copyWeeklyBtn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(an.weeklyReport || '');
      PS.toast('飞书 / Markdown 周报已复制到剪贴板 ✓', 'good');
    });
    main.querySelector('#aiWeeklyBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'AI 正在深度解读本周数据…';
      try {
        const res = await PS.api('POST', '/api/review/weekly-ai', {});
        if (res.memo && PS.S.analytics?.weeklyBrief) {
          PS.S.analytics.weeklyBrief.aiMemo = res.memo;
          PS.save();
        }
        PS.toast('AI 深度周报解读已生成 ✓', 'good');
        PS.pages.review('weekly');
      } catch (err) {
        PS.toast(err.message || 'AI 解读失败，请检查系统 AI 配置', 'warn');
        btn.disabled = false; btn.innerHTML = old;
      }
    });

    const openNextTopicsFlow = async (btn, payload) => {
      const old = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'AI 反推中…';
      try {
        const res = await PS.api('POST', '/api/review/next-topics', payload);
        const list = res.topics || [];
        PS.modal({
          title: `爆款反推下期 3 个续集选题（基于：${payload.title.slice(0, 22)}）`,
          wide: true,
          body: `<div class="stack tight">${list.map((it, i) => `<div class="card stack tight" style="background:var(--sunk);border:0;padding:12px 14px">
            <div class="row" style="gap:8px">
              <span class="pill accent">续集 #${i + 1}</span>
              <b style="font-size:14px">${PS.esc(it.title)}</b>
              <span class="grow"></span>
              <button type="button" class="btn primary s" data-add-next="${i}">+ 加入选题池</button>
            </div>
            ${it.angle ? `<div class="sub" style="font-size:12.5px"><b>切入角度：</b>${PS.esc(it.angle)}</div>` : ''}
            ${it.hook ? `<blockquote style="margin:4px 0 0;padding:7px 10px;border-left:3px solid var(--accent);background:var(--surface);border-radius:6px;font-size:13px">“${PS.esc(it.hook)}”</blockquote>` : ''}
          </div>`).join('')}</div>`,
          foot: `<button class="btn" data-close>关闭</button><button class="btn primary" id="addAllNextBtn">全部加入选题池</button>`,
          onOpen(mb, close) {
            const addOne = async item => {
              const bodyTxt = [item.hook ? `## 开场钩子\n${item.hook}` : '', item.angle ? `## 切入角度\n${item.angle}` : '', `反推自爆款：${payload.title}`].filter(Boolean).join('\n\n');
              const created = await PS.api('POST', '/api/topics', { title: item.title, source_ref: '复盘爆款反推', body: bodyTxt });
              PS.S.topics.unshift(created);
              PS.save();
            };
            mb.querySelectorAll('[data-add-next]').forEach(b => b.onclick = async () => {
              const item = list[+b.dataset.addNext];
              if (!item) return;
              b.disabled = true; b.textContent = '已加入 ✓';
              await addOne(item);
              PS.toast(`已加入选题池：${item.title.slice(0, 18)} ✓`, 'good');
            });
            mb.querySelector('#addAllNextBtn').onclick = async () => {
              for (const item of list) await addOne(item);
              close();
              PS.toast(`已将 ${list.length} 个续集选题全部加入「选题池」 ✓`, 'good');
              location.hash = '#pool';
            };
          },
        });
      } catch (err) {
        PS.toast(err.message || '反推失败', 'warn');
      } finally {
        btn.disabled = false; btn.innerHTML = old;
      }
    };
    main.querySelectorAll('[data-next-idx]').forEach(b => b.onclick = () => {
      const w = sortedDy[+b.dataset.nextIdx];
      if (!w) return;
      openNextTopicsFlow(b, { title: w.title, views: w.views || 0, multiple: w.mult || 0, platform: 'douyin' });
    });
    main.querySelectorAll('[data-next-ep]').forEach(b => b.onclick = () => {
      openNextTopicsFlow(b, { title: b.dataset.nextEp, views: +(b.dataset.nextViews || 0), multiple: 0, platform: 'all' });
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
        PS.toast(`已实测采集 ${res.collected || 0} 条作品流量与留存并写入 SQLite`, res.collected ? 'good' : 'warn');
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
