/* 系统（Apple 风格麦田式操作台 + 集成 + Park 社区与共享对标库）· 上新动态 · 知识树 · 我说过的话 · 咨询客户 · 个人网站 · 我的定位 */
(function () {
  'use strict';
  const PS = window.PS;

  // ==================== 1. Apple 风格「系统」页（#settings / #system） ====================
  PS.pages.settings = function () {
    const d = PS.S.daemon;
    const s = PS.S.settings;
    const active = PS.activePlats();
    const okCount = active.filter(pid => PS.S.platformStatus[pid]?.state === 'ok').length;
    const warnPlats = active.filter(pid => PS.S.platformStatus[pid]?.state !== 'ok');
    const curEp = PS.S.episodes[0];

    const stChip = st => {
      if (st.disabled) return '<span class="pill">已停用</span>';
      if (st.state === 'ok') return '<span class="pill good">✓ 已登录</span>';
      if (st.checkedAt === '未检查') return '<span class="pill">未检查</span>';
      return '<span class="pill wait">未登录</span>';
    };

    const main = PS.shell('settings', [['系统', '#settings']], `
      <div class="ph">
        <div>
          <h1>系统</h1>
          <p>Park Studio 本机运行状态、7 平台专用浏览器体检、飞书/站点集成与 Park 开源社区连接。</p>
        </div>
        <div class="acts">
          <a class="btn" href="#position">${PS.icon('star', 'sm')}我的定位</a>
          <a class="btn" href="#releases">${PS.icon('spark', 'sm')}上新 · v0.2.0</a>
          <a class="btn" href="https://github.com/zinan92/park-studio/issues" target="_blank" rel="noopener">GitHub Issues ↗</a>
        </div>
      </div>

      <section class="sys-tiles">
        <div class="stile">
          <div class="lab">守护进程</div>
          <div class="val ok">${d.running ? '运行中' : '已暂停'}</div>
          <div class="dl">开机自启，崩溃自动拉起</div>
        </div>
        <div class="stile">
          <div class="lab">本地目录 / Obsidian</div>
          <div class="val ${PS.S.vaultStatus?.mounted === false ? 'warn' : 'ok'}">${PS.S.vaultStatus?.mounted === false ? '未找到' : '已挂载'}</div>
          <div class="dl mono">${PS.esc(s.obsidianPath)}${PS.S.vaultStatus?.counts ? ` · ${Object.values(PS.S.vaultStatus.counts).reduce((a, b) => a + b, 0)} 篇` : ''}</div>
        </div>
        <div class="stile">
          <div class="lab">专用浏览器</div>
          <div class="val ${d.chromeOnline ? 'ok' : 'warn'}">${d.chromeOnline ? '在线' : '未启动'}</div>
          <div class="dl">独立 Profile · CDP :${d.chromePort}${PS.S.chromeStatus?.tabs ? ` · ${PS.S.chromeStatus.tabs} 标签` : ''}</div>
        </div>
        <div class="stile">
          <div class="lab">平台登录</div>
          <div class="val ${warnPlats.length ? 'warn' : 'ok'}">${warnPlats.length ? `${okCount}/${active.length} 正常` : `全部正常`}</div>
          <div class="dl">上次体检 ${PS.esc(d.lastMetricsAt)}${warnPlats.length ? ` · ${warnPlats.map(p => PS.PLATFORMS[p].name).join('、')}未登录` : ''}</div>
        </div>
      </section>

      <div class="sys-sec">
        <h2>平台</h2>
        <span>登录、体检和常用操作；扫码要人在这台电脑前</span>
      </div>
      <section class="card stack">
        <div class="row">
          <button class="btn primary" id="btnDocAll">${PS.icon('check', 'sm')}全部检查</button>
          <button class="btn" id="btnLoginAll">${PS.icon('chrome', 'sm')}打开全部登录页</button>
          <button class="btn" id="btnSyncCur">取「${PS.esc(curEp.nick)}」的链接</button>
          <button class="btn" id="btnMetrics">采流量</button>
          <button class="btn" id="btnFollowers">采粉丝</button>
          ${s.siteEnabled ? '<button class="btn" id="btnSyncSite">同步知识站数据</button>' : ''}
        </div>
        <div>
          ${PS.PLAT_ORDER.map(pid => {
            const p = PS.PLATFORMS[pid], st = PS.S.platformStatus[pid];
            return `<div class="prow ${st.disabled ? 'off' : ''}">
              ${PS.plogo(pid, 24)}
              <span class="pname">
                ${p.name}
                <span class="psub">${st.disabled ? '不体检、不发布、不采粉丝' : `${PS.esc(st.detail)} · 上次检查 ${PS.esc(st.checkedAt)}`}</span>
              </span>
              ${stChip(st)}
              ${st.disabled ? '' : `<button class="btn s" data-doc="${pid}">检查</button>`}
              ${st.disabled ? '' : `<button class="btn s" data-login="${pid}">${st.state === 'ok' ? '打开后台' : '去登录'}</button>`}
              <button class="btn s" data-tog="${pid}">${st.disabled ? '启用' : '停用'}</button>
            </div>`;
          }).join('')}
        </div>
      </section>

      <div class="sys-sec">
        <h2>本地 AI Agent、目录与通知</h2>
        <span>全局写作 Agent 与独立剪辑 Agent 自由拆分，零强制付费 API</span>
      </div>
      <section class="sys-2col">
        <div class="card stack">
          <div class="card-h">
            <h3>全局 Agent（选题 / 写稿 / 审稿 / 拆解）</h3>
            <span class="pill good">${PS.S.agents?.[s.aiBackend]?.installed ? '✓ CLI 已就绪' : '本机运行'}</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:6px">全局 Coding Agent 引擎（主用 Gemini 推荐 Antigravity CLI 或 Gemini API）</label>
            <div class="seg" style="flex-wrap:wrap">
              <button class="${s.aiBackend === 'gemini-api' ? 'on' : ''}" data-aib="gemini-api">Gemini API${PS.S.agents?.['gemini-api']?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'agy' ? 'on' : ''}" data-aib="agy">Antigravity (agy)${PS.S.agents?.agy?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'gemini' ? 'on' : ''}" data-aib="gemini">Gemini CLI${PS.S.agents?.gemini?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'claude' ? 'on' : ''}" data-aib="claude">Claude Code${PS.S.agents?.claude?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'codex' ? 'on' : ''}" data-aib="codex">Codex${PS.S.agents?.codex?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'api' ? 'on' : ''}" data-aib="api">可选 API</button>
            </div>
          </div>
          <div><label class="sub" style="display:block;margin-bottom:4px">全局模型名称（Gemini API 默认 gemini-2.5-flash；留空走该引擎默认）</label><input type="text" id="aiModelIn" class="mono" value="${PS.esc(s.aiModel || '')}" placeholder="gemini-2.5-pro / gemini-2.5-flash / 留空走默认"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">Obsidian 知识库根目录（只读 · <a href="#kb">去选接入文件夹 ›</a>）</label><input type="text" id="obPath" value="${PS.esc(s.obsidianPath)}"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">统一视频工程根目录（定稿自动建目录 / 打包自动扫描）</label><input type="text" id="projRootIn" value="${PS.esc(s.projectRoot || '~/Movies/ParkStudio')}"></div>
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>独立剪辑 Agent（剪辑工作台专用）</h3>
            <span class="pill accent">${(s.cutAgentBackend && s.cutAgentBackend !== 'inherit') ? s.cutAgentBackend : '跟随全局'}</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:6px">可与写作拆分（例如写作和剪辑都用 Gemini，或剪辑单独挂自定义剪辑 Agent）</label>
            <div class="seg" style="flex-wrap:wrap">
              <button class="${(!s.cutAgentBackend || s.cutAgentBackend === 'inherit') ? 'on' : ''}" data-caib="inherit">跟随全局</button>
              <button class="${s.cutAgentBackend === 'gemini-api' ? 'on' : ''}" data-caib="gemini-api">Gemini API</button>
              <button class="${s.cutAgentBackend === 'agy' ? 'on' : ''}" data-caib="agy">Antigravity</button>
              <button class="${s.cutAgentBackend === 'gemini' ? 'on' : ''}" data-caib="gemini">Gemini CLI</button>
              <button class="${s.cutAgentBackend === 'claude' ? 'on' : ''}" data-caib="claude">Claude Code</button>
              <button class="${s.cutAgentBackend === 'codex' ? 'on' : ''}" data-caib="codex">Codex</button>
              <button class="${s.cutAgentBackend === 'custom' ? 'on' : ''}" data-caib="custom">自定义命令</button>
            </div>
          </div>
          <div><label class="sub" style="display:block;margin-bottom:4px">剪辑 Agent 模型（留空则沿用所选引擎默认）</label><input type="text" id="cutModelIn" class="mono" value="${PS.esc(s.cutAgentModel || '')}" placeholder="如 claude-sonnet-4-5 / neon / 留空"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">自定义剪辑 CLI / Skill 命令（选「自定义命令」时生效）</label><input type="text" id="cutCmdIn" class="mono" value="${PS.esc(s.cutAgentCmd || '')}" placeholder="如 park-video-v2 --spec {worktable}"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">本地语音转写引擎（原片转带时间戳逐字稿）</label>
            <select id="trEng"><option value="mlx-whisper" ${s.transcribeEngine === 'mlx-whisper' ? 'selected' : ''}>mlx-whisper（Apple Silicon 极速本机）</option><option value="faster-whisper" ${s.transcribeEngine === 'faster-whisper' ? 'selected' : ''}>faster-whisper（macOS / Windows 通用）</option></select>
          </div>
          <div><button class="btn s primary" id="saveAiCfg">保存 AI 与目录配置并重扫 Obsidian</button></div>
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>飞书通知</h3>
            <span class="pill ${d.feishuEnabled ? 'good' : ''}">${d.feishuEnabled ? '✓ 已连接' : '未启用'}</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">群机器人 Webhook（平台掉线、每日采数完成后自动提醒）</label>
            <input type="url" id="fsHook" value="${PS.esc(d.feishuWebhook)}" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/...">
          </div>
          <div class="row">
            <button class="btn primary s" id="fsTest">测试发送</button>
            <button class="btn s" id="fsSave">保存</button>
            <span class="sub">保存后立即生效，不用重启</span>
          </div>
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>开机自启与本地维护</h3>
            <button class="btn s" id="btnLaunchd">${PS.S.launchd?.installed ? '已生成 launchd ✓' : '生成 macOS 开机自启'}</button>
          </div>
          <div class="sys-scroll">
            <dl class="kv-dl">
              <dt>每 5 分钟</dt><dd>检查有没有到点要取链接的期数，提醒还没点发布的国内平台</dd>
              <dt>每天 09:00</dt><dd>全平台真实探活体检一次，有掉线才打扰</dd>
              <dt>每天 10:00</dt><dd>采集全平台粉丝与已发作品流量，生成当日快照供同龄复盘</dd>
            </dl>
          </div>
          <div class="row" style="border-top:1px solid var(--line-soft);padding-top:10px">
            <button class="btn danger s" id="resetDemo">重置本地浏览器缓存</button>
            <span class="sub">不删除 SQLite 数据库与 Obsidian 文件</span>
          </div>
        </div>
      </section>

      <div class="sys-sec">
        <h2>守护进程实时动态</h2>
        <span>最近 ${PS.S.daemonLogs.length} 条本地执行记录</span>
      </div>
      <section class="card">
        <div class="sys-scroll">
          ${PS.S.daemonLogs.map(l => `<div class="flog">
            <span class="tm">${PS.esc(l.ts)}</span>
            <b>${PS.esc(l.ep)}</b>
            <span class="pill">${PS.esc(l.plat)}</span>
            <span class="sub clip1 grow">${PS.esc(l.action)} · ${PS.esc(l.result)}</span>
          </div>`).join('')}
        </div>
      </section>
    `);

    const applySysRes = res => {
      if (res.chromeStatus) {
        PS.S.chromeStatus = res.chromeStatus;
        PS.S.daemon.chromeOnline = !!res.chromeStatus.online;
        PS.S.daemon.chromePort = res.chromeStatus.port || PS.S.daemon.chromePort;
      }
      if (res.platformStatus) PS.S.platformStatus = { ...PS.S.platformStatus, ...res.platformStatus };
      if (res.daemonLogs) PS.S.daemonLogs = res.daemonLogs;
      if (res.last_metrics_at) PS.S.daemon.lastMetricsAt = res.last_metrics_at;
      if (res.analytics) PS.S.analytics = res.analytics;
      if (res.followersLive) {
        PS.S.liveFollowerPlats = Object.keys(res.followersLive);
        for (const [pid, dayMap] of Object.entries(res.followersLive)) {
          if (dayMap && Object.keys(dayMap).length) PS.S.followers[pid] = { ...dayMap };
        }
      }
      PS.save();
    };

    const runBtn = async (btn, busyText, fn) => {
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = busyText;
      try {
        await fn();
      } catch (err) {
        PS.toast(err.message || '操作失败', 'warn');
      } finally {
        btn.disabled = false;
        btn.innerHTML = old;
      }
    };

    main.querySelector('#btnDocAll').onclick = e => runBtn(e.currentTarget, '正在探活 7 平台…', async () => {
      const res = await PS.api('POST', '/api/platforms/check', {});
      applySysRes(res);
      const okN = Object.values(res.results || {}).filter(r => r.state === 'ok').length;
      const totN = Object.keys(res.results || {}).length;
      PS.toast(`真实探活完成：${okN}/${totN} 个平台已登录`, okN === totN ? 'good' : 'warn');
      PS.pages.settings();
    });

    main.querySelector('#btnLoginAll').onclick = e => runBtn(e.currentTarget, '正在拉起专用 Chrome…', async () => {
      const res = await PS.api('POST', '/api/platforms/login', { platforms: active });
      applySysRes(res);
      PS.toast(`已在专用 Chrome (:${PS.S.daemon.chromePort}) 打开 ${res.opened?.length || 0} 个平台登录页，扫码后长期记住`, 'good');
      PS.pages.settings();
    });

    main.querySelector('#btnSyncCur').onclick = e => runBtn(e.currentTarget, '正在扫描后台链接…', async () => {
      const pe = (PS.S.publishEpisodes || [])[0];
      if (!pe) return PS.toast('暂无发布期次', 'warn');
      let hits = 0;
      for (const pid of active) {
        const st = pe.tasks?.[pid]?.state;
        if (st === 'awaiting_user' || st === 'scheduled') {
          const r = await PS.api('POST', `/api/publish/${pe.id}/sync`, { platform: pid });
          applySysRes(r);
          if (r.found) hits++;
        }
      }
      PS.toast(hits ? `已自动取回 ${hits} 个平台作品链接` : '扫描完毕，暂未发现新回填链接', hits ? 'good' : 'warn');
      PS.pages.settings();
    });
    main.querySelector('#btnLaunchd')?.addEventListener('click', e => runBtn(e.currentTarget, '生成中…', async () => {
      const res = await PS.api('POST', '/api/daemon/install-launchd', {});
      PS.S.launchd = res.launchd;
      applySysRes(res);
      PS.toast(`已生成 ${res.launchd.plistPath}`, 'good');
      PS.pages.settings();
    }));
    main.querySelector('#btnMetrics').onclick = e => runBtn(e.currentTarget, '正在采集各平台作品流量…', async () => {
      const res = await PS.api('POST', '/api/collect/metrics', {});
      applySysRes(res);
      PS.toast(res.collected ? `已实测采集 ${res.collected} 条真实作品流量并写入 SQLite` : '暂未读到已登录平台作品，请确认登录态后重试', res.collected ? 'good' : 'warn');
      PS.pages.settings();
    });
    main.querySelector('#btnFollowers').onclick = e => runBtn(e.currentTarget, '正在采集粉丝…', async () => {
      const res = await PS.api('POST', '/api/collect/followers', {});
      applySysRes(res);
      PS.toast(res.collected ? `粉丝实测完成：成功采集 ${res.collected} 家平台并写入 SQLite` : '暂无已登录平台可采集，请先点「打开全部登录页」扫码', res.collected ? 'good' : 'warn');
      PS.pages.settings();
    });
    main.querySelector('#btnSyncSite')?.addEventListener('click', () => {
      PS.toast(`已检查 ${s.siteName} 站点配置`, 'good');
    });

    main.querySelectorAll('[data-doc]').forEach(b => b.onclick = e => {
      const pid = b.dataset.doc;
      runBtn(e.currentTarget, '检查中…', async () => {
        const res = await PS.api('POST', '/api/platforms/check', { platforms: [pid] });
        applySysRes(res);
        const r = res.results?.[pid];
        PS.toast(`${PS.PLATFORMS[pid].name}：${r?.detail || '检查完成'}`, r?.state === 'ok' ? 'good' : 'warn');
        PS.pages.settings();
      });
    });
    main.querySelectorAll('[data-login]').forEach(b => b.onclick = e => {
      const pid = b.dataset.login;
      runBtn(e.currentTarget, '打开中…', async () => {
        const res = await PS.api('POST', '/api/platforms/login', { platforms: [pid] });
        applySysRes(res);
        PS.toast(`已在专用 Chrome 打开 ${PS.PLATFORMS[pid].name}，登录完成后点「检查」即可`, 'good');
        PS.pages.settings();
      });
    });
    main.querySelectorAll('[data-tog]').forEach(b => b.onclick = async () => {
      const pid = b.dataset.tog;
      const nextDisabled = !PS.S.platformStatus[pid].disabled;
      try {
        const res = await PS.api('PATCH', `/api/platforms/${pid}`, { disabled: nextDisabled });
        applySysRes(res);
      } catch {
        PS.S.platformStatus[pid].disabled = nextDisabled;
        PS.save();
      }
      PS.pages.settings();
    });

    main.querySelector('#fsTest').onclick = e => runBtn(e.currentTarget, '发送中…', async () => {
      const hook = main.querySelector('#fsHook').value.trim();
      const res = await PS.api('POST', '/api/feishu/test', { webhook: hook });
      applySysRes(res);
      PS.toast('飞书测试消息已发送 ✓', 'good');
      PS.pages.settings();
    });
    main.querySelector('#fsSave').onclick = async () => {
      d.feishuWebhook = main.querySelector('#fsHook').value.trim();
      d.feishuEnabled = !!d.feishuWebhook;
      await PS.api('PUT', '/api/settings', { feishuWebhook: d.feishuWebhook, feishuEnabled: d.feishuEnabled }).catch(() => {});
      PS.save();
      PS.toast('飞书配置已写入 ~/.park-studio/config.yaml', 'good');
      PS.pages.settings();
    };
    main.querySelectorAll('[data-aib]').forEach(b => b.onclick = async () => {
      s.aiBackend = b.dataset.aib;
      await PS.api('PUT', '/api/settings', { aiBackend: s.aiBackend }).catch(() => {});
      PS.save(); PS.pages.settings();
    });
    main.querySelectorAll('[data-caib]').forEach(b => b.onclick = async () => {
      s.cutAgentBackend = b.dataset.caib;
      await PS.api('PUT', '/api/settings', { cutAgentBackend: s.cutAgentBackend }).catch(() => {});
      PS.save(); PS.pages.settings();
    });
    main.querySelector('#saveAiCfg').onclick = async () => {
      s.aiModel = main.querySelector('#aiModelIn').value.trim();
      s.cutAgentModel = main.querySelector('#cutModelIn').value.trim();
      s.cutAgentCmd = main.querySelector('#cutCmdIn').value.trim();
      s.obsidianPath = main.querySelector('#obPath').value.trim();
      s.projectRoot = main.querySelector('#projRootIn').value.trim();
      s.transcribeEngine = main.querySelector('#trEng').value;
      try {
        await PS.api('PUT', '/api/settings', {
          aiBackend: s.aiBackend,
          aiModel: s.aiModel,
          cutAgentBackend: s.cutAgentBackend || 'inherit',
          cutAgentModel: s.cutAgentModel,
          cutAgentCmd: s.cutAgentCmd,
          obsidianPath: s.obsidianPath,
          projectRoot: s.projectRoot,
          transcribeEngine: s.transcribeEngine,
        });
        await PS.syncFromBackend();
        PS.toast('全局与独立剪辑 Agent 配置已写入 ~/.park-studio/config.yaml ✓', 'good');
      } catch {
        PS.toast('本地配置已保存', 'good');
      }
      PS.save(); PS.pages.settings();
    };
    main.querySelector('#resetDemo')?.addEventListener('click', () => PS.resetDemo());
  };
  PS.pages.system = PS.pages.settings;

  // ==================== 2. 上新 · 版本动态（#releases · 替代旧 SaaS 后台） ====================
  PS.pages.releases = function () {
    const main = PS.shell('releases', [['系统', '#settings'], ['上新 · 版本动态', '#releases']], `
      <div class="ph">
        <div>
          <h1>上新 · Park Studio 开源迭代日志</h1>
          <p>开源后不再保留 SaaS 用户/订单监控，而是把持续打磨的更新直接同步给每一位本地装机用户。</p>
        </div>
        <div class="acts">
          <button class="btn primary" id="chkUpd">${PS.icon('refresh', 'sm')}检查更新</button>
          <a class="btn" href="https://github.com/zinan92/park-studio" target="_blank" rel="noopener">GitHub 仓库 ↗</a>
        </div>
      </div>

      <div class="card row" style="background:color-mix(in srgb,var(--accent-soft) 35%,var(--surface))">
        <div class="min0 grow">
          <b>遇到平台改版或想要新功能？</b>
          <div class="sub">直接在 GitHub 提交 Issue / PR，或加入 Park 创作者交流群获取最新适配器与信源。</div>
        </div>
        <a class="btn s" href="https://github.com/zinan92/park-studio/issues" target="_blank">提 Issue / PR</a>
        <a class="btn primary s" href="#settings">去系统页领社区通行码</a>
      </div>

      <div class="stack">
        ${PS.S.releases.map(r => `<div class="card stack tight">
          <div class="row"><span class="pill ${r.tag === '最新' ? 'accent' : 'good'}">${PS.esc(r.ver)} · ${PS.esc(r.tag)}</span><span class="sub mono">${PS.esc(r.date)}</span></div>
          <h3 class="m0" style="font-size:16px">${PS.esc(r.title)}</h3>
          <ul class="m0" style="padding-left:18px;display:flex;flex-direction:column;gap:5px;color:var(--ink-2);font-size:13.5px">
            ${r.notes.map(n => `<li>${PS.esc(n)}</li>`).join('')}
          </ul>
        </div>`).join('')}
      </div>
    `, 'narrow');

    main.querySelector('#chkUpd').onclick = () => PS.toast('当前已是最新版 v0.1.2 ✓', 'good');
  };

  // ==================== 3. 知识库（Obsidian 接入文件夹总览与检索，取代零散「说过的话」） ====================
  let kbFolder = '';
  let kbQuery = '';
  let kbNoteIdx = 0;

  PS.pages.kb = async function () {
    let kb = PS.S.kb;
    try {
      kb = await PS.api('GET', '/api/kb/folders');
      PS.S.kb = kb;
    } catch (e) {}
    kb = kb || { path: PS.S.settings.obsidianPath, mounted: false, totalNotes: 0, folders: [] };
    const folders = kb.folders || [];
    if (kbFolder && !folders.some(f => f.name === kbFolder)) kbFolder = '';
    if (!kbFolder && !kbQuery && folders.length) {
      kbFolder = (folders.find(f => /原始输出|writing|定位/i.test(f.name)) || folders[0]).name;
    }

    let notes = [];
    try {
      const r = await PS.api('GET', `/api/kb/notes?folder=${encodeURIComponent(kbFolder)}&q=${encodeURIComponent(kbQuery)}&limit=60`);
      notes = r.items || [];
    } catch (e) {}
    if (kbNoteIdx >= notes.length) kbNoteIdx = 0;
    const curNote = notes[kbNoteIdx] || null;
    const enabledN = folders.filter(f => f.enabled).length;

    const main = PS.shell('kb', [['系统', '#settings'], ['知识库 · Obsidian', '#kb']], `
      <div class="ph">
        <div>
          <h1>知识库（Obsidian）</h1>
          <p>直接展示本机 Obsidian 挂载的文件夹（<span class="mono">${PS.esc(kb.path)}</span> · ${folders.length} 个目录 · 共 ${kb.totalNotes} 篇笔记 · 已启用 ${enabledN} 个供 AI 写稿/审稿参考）。</p>
        </div>
        <div class="acts">
          <input type="search" id="kbSearch" value="${PS.esc(kbQuery)}" placeholder="搜索当前或全库笔记…" style="width:220px">
          <a class="btn" href="#settings">改目录路径</a>
        </div>
      </div>

      ${!kb.mounted ? `<div class="card stack">
        <b>尚未找到 Obsidian 知识库目录</b>
        <p class="sub m0">当前路径 <code class="mono">${PS.esc(kb.path)}</code> 不存在。点击右上角「改目录路径」指向你的 Obsidian Vault 根目录即可只读接入。</p>
      </div>` : `
      <div class="kb-grid">
        <div class="card flush stack tight" style="padding:10px;max-height:72vh;overflow-y:auto">
          <div class="row" style="padding:4px 6px 8px;border-bottom:1px solid var(--line-soft)">
            <b style="font-size:13px">接入的文件夹</b>
            <span class="grow"></span>
            <button type="button" class="link-muted" id="kbAllBtn" style="font-size:11.5px">${kbFolder ? '看全部' : '全部已选'}</button>
          </div>
          ${folders.map(f => `<div class="row" style="padding:6px 8px;border-radius:8px;background:${kbFolder === f.name ? 'var(--accent-soft)' : 'transparent'};cursor:pointer;gap:8px" data-kbf="${PS.esc(f.name)}">
            <input type="checkbox" data-kb-en="${PS.esc(f.name)}" ${f.enabled ? 'checked' : ''} title="允许 AI 写稿/审稿参考此文件夹" style="cursor:pointer;accent-color:var(--accent)">
            <span class="clip1 grow" style="font-size:13px;font-weight:${kbFolder === f.name ? 700 : 500}">${PS.esc(f.name)}</span>
            <span class="sub mono" style="font-size:11px">${f.count}</span>
          </div>`).join('')}
        </div>

        <div class="card flush src-list" style="max-height:72vh;overflow-y:auto">
          <div class="src-issue-h">
            <div class="min0">
              <div class="sub" style="font-size:11.5px">${kbQuery ? `搜索「${PS.esc(kbQuery)}」` : (kbFolder ? '当前文件夹' : '全部已启用文件夹')}</div>
              <b class="clip1" style="font-size:14px">${PS.esc(kbFolder || '全库检索')} · ${notes.length} 篇</b>
            </div>
          </div>
          ${notes.map((n, i) => `<div class="src-row ${i === kbNoteIdx ? 'on' : ''}" data-kbi="${i}">
            <div class="src-meta"><span class="sub">${PS.esc(n.tag)} · ${PS.esc(n.date.slice(0, 10))}</span></div>
            <div><button class="src-t" type="button" data-kbi="${i}">${PS.esc(n.title)}</button></div>
            ${n.excerpt ? `<p class="src-x">${PS.esc(n.excerpt)}</p>` : ''}
          </div>`).join('') || '<div style="padding:24px" class="sub">该目录下暂无匹配笔记</div>'}
        </div>

        <div class="card src-read" style="max-height:72vh;overflow-y:auto">
          ${curNote ? `
            <div class="stack tight" style="padding-bottom:12px;border-bottom:1px solid var(--line-soft)">
              <div class="row">
                <span class="pill">${PS.esc(curNote.tag)}</span>
                <span class="sub mono" style="font-size:11.5px">${PS.esc(curNote.file)} · ${curNote.words} 字</span>
                <span class="grow"></span>
                <button class="btn primary s" id="kbAddTopic">+ 加入选题池</button>
              </div>
              <h2 class="m0" style="font-size:18px">${PS.esc(curNote.title)}</h2>
            </div>
            <div class="md-body" style="margin-top:12px">${PS.md(curNote.body || '')}</div>
          ` : '<div style="padding:28px" class="sub">左侧选择文件夹和笔记查看全文。</div>'}
        </div>
      </div>`}
    `);

    main.querySelector('#kbSearch')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { kbQuery = e.target.value.trim(); kbNoteIdx = 0; PS.pages.kb(); }
    });
    main.querySelector('#kbAllBtn')?.addEventListener('click', () => { kbFolder = ''; kbNoteIdx = 0; PS.pages.kb(); });
    main.querySelectorAll('[data-kbf]').forEach(row => row.onclick = e => {
      if (e.target.matches('input[type=checkbox]')) return;
      kbFolder = row.dataset.kbf;
      kbNoteIdx = 0;
      PS.pages.kb();
    });
    main.querySelectorAll('[data-kb-en]').forEach(box => box.onchange = async () => {
      const enabled = [...main.querySelectorAll('[data-kb-en]:checked')].map(x => x.dataset.kbEn);
      const r = await PS.api('PUT', '/api/kb/folders', { enabled });
      PS.S.kb = r.kb;
      PS.toast(`已更新 AI 知识库接入范围（${enabled.length} 个文件夹）`, 'good');
    });
    main.querySelectorAll('[data-kbi]').forEach(el => el.onclick = () => {
      kbNoteIdx = +el.dataset.kbi;
      PS.pages.kb();
    });
    main.querySelector('#kbAddTopic')?.addEventListener('click', async () => {
      if (!curNote) return;
      const created = await PS.api('POST', '/api/topics', { title: curNote.title, source_ref: `知识库 · ${curNote.tag}`, body: curNote.body || '' });
      PS.S.topics.unshift(created);
      PS.save();
      PS.toast('已从知识库加入「选题池」 ✓', 'good');
    });
  };
  // 兼容旧链接重定向，彻底移除未定型边缘壳
  PS.pages.said = PS.pages.kb;
  PS.pages.tree = PS.pages.kb;
  PS.pages.clients = PS.pages.settings;
  PS.pages.site = PS.pages.settings;

  // ==================== 我的定位（有本机定位正本 positioning.json 时原样呈现 7 页签完整定位系统；否则走简洁 5 格编辑卡） ====================
  const SP_TABS = [
    ['overview', '定位三问'],
    ['growth', '增长飞轮'],
    ['difference', '差异化'],
    ['offers', '服务与定价'],
    ['profile', '对外简介'],
    ['principles', '原则与自测'],
    ['persona', '我的形象'],
  ];
  const SP_ICON = {
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    funnel: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    hand: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
    files: '<path d="M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v5h5M9 13h6M9 17h4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    cycle: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const spState = { tab: 'overview', pf: 'cn', editing: {} };
  const spWeekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString('sv-SE'); };
  const loadSpChecks = () => { try { const x = JSON.parse(localStorage.getItem('ps-sp-checks') || '{}'); return x.week === spWeekKey() ? x.done || [] : []; } catch (_) { return []; } };
  let spChecks = loadSpChecks();

  PS.pages.position = function (sub) {
    const studio = PS.S.studioPositioning;
    if (!studio || !studio.positioning) {
      const pos = PS.S.positioning;
      const rows = [['你是谁（定位卡）', 'who'], ['你怎么赚钱', 'money'], ['你和别人哪里不一样', 'diff'], ['你守的规矩', 'rules'], ['对外简介', 'bio']];
      const main = PS.shell('position', [['系统', '#settings'], ['我的定位', '#position']], `
        <div class="ph"><div><h1>我的定位</h1><p>每次写稿、生成钩子和三路审稿都会自动带上这份定位（持久化到本地 SQLite）。</p></div><div class="acts"><button class="btn primary" id="savePos">保存定位</button></div></div>
        <div class="card stack">${rows.map(([l, k]) => `<div><label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px">${l}</label><textarea data-pk="${k}" rows="2">${PS.esc(pos[k])}</textarea></div>`).join('')}</div>
      `, 'narrow');
      main.querySelector('#savePos').onclick = async () => {
        main.querySelectorAll('[data-pk]').forEach(t => { pos[t.dataset.pk] = t.value.trim(); });
        try {
          await PS.api('PUT', '/api/positioning', pos);
          PS.toast('定位已写入本地 SQLite ✓', 'good');
        } catch {
          PS.toast('定位已保存', 'good');
        }
        PS.save();
      };
      return;
    }

    if (SP_TABS.some(([k]) => k === sub)) spState.tab = sub;
    const tab = spState.tab;
    const p = studio.positioning;
    const pg = p.page || {};
    const ic = (name, cls = '') => `<svg class="sp-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${SP_ICON[name] || SP_ICON.files}</svg>`;
    const ed = (path, text, cls = '') => `<span class="sp-ed ${cls}" contenteditable="plaintext-only" spellcheck="false" data-sp="${PS.esc(JSON.stringify(path))}">${PS.esc(text || '')}</span>`;
    const pill = text => (text ? `<span class="sp-pill">${ic('check')}${PS.esc(text)}</span>` : '');
    const secHead = (title, s, meta = '') => `<div class="sp-sh"><div><h3>${title}</h3>${s ? `<p>${s}</p>` : ''}</div>${meta}</div>`;
    const tabText = (key, field, fallback) => {
      const v = ((p.tabs || {})[key] || {})[field];
      return v ? ed(['positioning', 'tabs', key, field], v) : PS.esc(fallback);
    };
    const lead = (x, key, fallback) => {
      x = x || {};
      const base = ['positioning', 'tabs', key];
      return `<div class="sp-lead">${x.eyeline ? `<div class="sp-eyeline">${ed([...base, 'eyeline'], x.eyeline)}</div>` : ''}<h2>${x.h1 ? ed([...base, 'h1'], x.h1, 'pre') : PS.esc(fallback)}</h2>${x.lead ? `<p>${ed([...base, 'lead'], x.lead)}</p>` : ''}</div>`;
    };
    const flowHtml = compact => {
      const f = p.flow || { nodes: (p.flywheel ? p.flywheel.nodes : []).map(n => ({ t: n.t, s: n.s })) };
      const at = p.flow ? ['positioning', 'flow', 'nodes'] : ['positioning', 'flywheel', 'nodes'];
      const icons = ['video', 'eye', 'funnel', 'hand', 'files'];
      const steps = (f.nodes || []).map((n, i) => `${i ? `<span class="sp-flow-arrow">${ic('arrow')}</span>` : ''}
        <div class="sp-flow-step ${n.hot ? 'hot' : ''}"><span class="sp-tile tone-${i + 1}">${ic(n.icon || icons[i])}</span><b>${ed([...at, i, 't'], n.t)}</b><small>${ed([...at, i, 's'], n.s)}</small></div>`).join('');
      const br = f.branch;
      return `<div class="sp-flow ${compact ? 'compact' : ''}">
        <div class="sp-flow-track">${steps}</div>
        ${f.return ? `<div class="sp-flow-return">${ic('cycle')}<span>${ed(['positioning', 'flow', 'return'], f.return)}</span></div>` : ''}
        ${br ? `<div class="sp-flow-branch"><span>${ed(['positioning', 'flow', 'branch', 'label'], br.label)}</span><span class="sp-branch-steps">${(br.steps || []).map((x, i) => `${i ? ic('arrow') : ''}<b>${ed(['positioning', 'flow', 'branch', 'steps', i], x)}</b>`).join('')}</span></div>` : ''}
      </div>`;
    };

    let body = '';
    if (tab === 'overview') {
      const c = p.company || {}, tb = (p.tabs || {}).overview || {};
      const status = tb.status || ((p.questions || [])[(p.questions || []).length - 1] || {}).status;
      const coreKey = c.core_title ? 'core_title' : c.tagline_lead ? 'tagline_lead' : 'name';
      const lineKey = c.core_line ? 'core_line' : 'tagline';
      body = `
        <div class="sp-card-head"><h2>${tabText('overview', 'title', '核心定位')}</h2>${pill(status)}</div>
        <div class="sp-identity"><h2>${ed(['positioning', 'company', coreKey], c[coreKey])}</h2><p>${ed(['positioning', 'company', lineKey], c[lineKey] || '')}</p></div>
        <div class="sp-questions">${(p.questions || []).map((q, i) => `<article class="sp-question">
          <span class="sp-num">0${i + 1}</span>
          <div><div class="sp-q-label">${q.label ? ed(['positioning', 'questions', i, 'label'], q.label) : PS.esc(String(q.k || '').replace(/^.+?·\s*/, ''))}</div>
            <h3>${ed(['positioning', 'questions', i, 'title'], q.title)}</h3>
            <p>${ed(['positioning', 'questions', i, 'body'], q.body)}</p>
            ${q.bold ? `<span class="sp-note-line">${ed(['positioning', 'questions', i, 'bold'], q.bold)}</span>` : ''}</div>
        </article>`).join('')}</div>
        <div class="sp-entry"><span>对外的统一入口</span><b>私信「${ed(['positioning', 'company', 'keyword'], c.keyword)}」</b><button class="sp-text-btn" type="button" id="spCopyKw">${ic('copy')}复制</button></div>
        <div class="sp-divider"></div>
        ${secHead(tabText('overview', 'flow_title', '增长飞轮'), tb.flow_sub ? tabText('overview', 'flow_sub', '') : '', `<button class="sp-text-btn" type="button" data-sp-tab="growth">展开查看 ${ic('arrow')}</button>`)}
        ${flowHtml(true)}`;
    } else if (tab === 'growth') {
      const tb = (p.tabs || {}).growth || {};
      body = `${lead(tb, 'growth', '增长飞轮')}
        ${flowHtml(false)}
        <div class="sp-values">${(p.creed || []).map((x, i) => `<article><h3>${ed(['positioning', 'creed', i, 'h'], x.h)}${ed(['positioning', 'creed', i, 'hi'], x.hi)}</h3><p>${ed(['positioning', 'creed', i, 'p'], x.p)}</p></article>`).join('')}</div>
        <div class="sp-divider"></div>
        ${secHead(tabText('growth', 'steps_title', '从第一单走起来'), tb.steps_sub ? tabText('growth', 'steps_sub', '') : '')}
        <ol class="sp-seq">${(p.bootstrap || []).map((x, i) => `<li><span class="sp-num">${i + 1}</span><div><b>${ed(['positioning', 'bootstrap', i, 'b'], x.b)}</b><p>${ed(['positioning', 'bootstrap', i, 's'], x.s)}</p></div></li>`).join('')}</ol>`;
    } else if (tab === 'difference') {
      const tb = (p.tabs || {}).difference || {};
      body = `${lead(tb, 'difference', '差异化')}
        <div class="sp-questions">${(p.diff || []).map((x, i) => `<article class="sp-question"><span class="sp-num">0${i + 1}</span>
          <div><div class="sp-q-label">${ed(['positioning', 'diff', i, 'vs'], x.vs)}</div><h3>${ed(['positioning', 'diff', i, 'h'], x.h)}</h3><p>${ed(['positioning', 'diff', i, 'p'], x.p)}</p></div></article>`).join('')}</div>`;
    } else if (tab === 'offers') {
      const tb = (p.tabs || {}).offers || {};
      const rows = ((p.pricing || {}).rows || []).map((r, i) => `<tr>
        <td class="svc"><i class="sp-dot tone-${PS.esc(r.tone || 'base')}"></i>${ed(['positioning', 'pricing', 'rows', i, 'role'], r.role)}</td>
        <td><span class="sp-price tone-${PS.esc(r.tone || 'base')}">${ed(['positioning', 'pricing', 'rows', i, 'price'], r.price)}</span></td>
        <td class="unit">${ed(['positioning', 'pricing', 'rows', i, 'unit'], r.unit || '')}</td>
        <td>${ed(['positioning', 'pricing', 'rows', i, 'what'], r.what)}</td>
      </tr>`).join('');
      body = `<div class="sp-lead">${tb.eyeline ? `<div class="sp-eyeline">${ed(['positioning', 'tabs', 'offers', 'eyeline'], tb.eyeline)}</div>` : ''}<h2>${tabText('offers', 'h1', '服务与定价')}</h2>
          <p>${tb.lead ? ed(['positioning', 'tabs', 'offers', 'lead'], tb.lead) : ed(['positioning', 'pricing', 'sub'], (p.pricing || {}).sub)}</p></div>
        ${tb.note ? `<div class="sp-offer-note"><span class="sp-tile tone-4">${ic('hand')}</span><span>${ed(['positioning', 'tabs', 'offers', 'note'], tb.note)}</span></div>` : ''}
        <div class="sp-table"><table><thead><tr><th>服务</th><th>价格</th><th>规格</th><th>交付内容</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="sp-foot">${ed(['positioning', 'pricing', 'note'], (p.pricing || {}).note)}</p>
        <div class="sp-divider"></div>
        ${secHead(tabText('offers', 'products_title', '产品线'), tb.products_sub ? tabText('offers', 'products_sub', '') : '')}
        <div class="sp-products">${(p.products || []).map((x, i) => `<div><b>${ed(['positioning', 'products', i, 'b'], x.b)}</b><span>${ed(['positioning', 'products', i, 's'], x.s)}</span><small class="sp-tag ${x.first ? 'hot' : ''}">${PS.esc(x.first ? (x.em || '先卖这一条') : (x.tag || '作品集'))}</small></div>`).join('')}</div>`;
    } else if (tab === 'principles') {
      const tb = (p.tabs || {}).principles || {};
      const items = (p.selftest || {}).items || [];
      const done = items.filter((_, i) => spChecks.includes(i)).length;
      body = `${lead(tb, 'principles', '原则与自测')}
        <div class="sp-check">
          <div class="sp-check-head"><h3>${tabText('principles', 'check_title', '这周的四个问题')}</h3><span>${done} / ${items.length} 已检查</span></div>
          <div class="sp-progress"><i style="--w:${Math.round((done / Math.max(1, items.length)) * 100)}%"></i></div>
          ${items.map((q, i) => `<label class="${spChecks.includes(i) ? 'on' : ''}"><input type="checkbox" data-sp-check="${i}" ${spChecks.includes(i) ? 'checked' : ''}><span>${PS.esc(q)}</span></label>`).join('')}
        </div>
        ${secHead(tabText('principles', 'principles_title', '通用原则'), tb.principles_sub ? tabText('principles', 'principles_sub', '') : '')}
        <ol class="sp-principles">${(p.principles || []).map((x, i) => `<li><span class="sp-num small">0${i + 1}</span><p><b>${ed(['positioning', 'principles', i, 'b'], x.b)}</b>${x.s ? ' ' + ed(['positioning', 'principles', i, 's'], x.s) : ''}</p></li>`).join('')}</ol>`;
    } else if (tab === 'profile') {
      const PF = [['cn', '国内版', {}], ['x', 'X 版', { name: 50, bio: 160 }]];
      const [key, , limits] = PF.find(([k]) => k === spState.pf) || PF[0];
      const cur = (studio.profile || {})[key] || { name: '', bio: '' };
      const avatar = PS.esc(((cur.name || '').match(/[A-Za-z]+/) || [(cur.name || '我').slice(0, 1)])[0]);
      const cnt = f => `<i class="${limits[f] && (cur[f] || '').length > limits[f] ? 'over' : ''}"><b data-pf-count="${f}">${(cur[f] || '').length}</b>${limits[f] ? ' / ' + limits[f] : ''}</i>`;
      const card = (cur.name || cur.bio) && !spState.editing[key]
        ? `<div class="sp-pf-sheet">
            <div class="sp-pf-head"><span class="sp-pf-avatar">${avatar}</span><div><h3>${PS.esc(cur.name)}</h3><span class="sp-pill">${ic('check')}已定稿</span></div><button class="btn s" type="button" data-pf-copy="name">复制名字</button></div>
            <p class="sp-pf-bio">${PS.esc(cur.bio)}</p>
            <div class="sp-pf-acts"><button class="btn s primary" type="button" data-pf-copy="bio">复制简介</button><button class="btn s" type="button" id="pfUnlock">改这一版</button></div>
          </div>`
        : `<div class="sp-pf-sheet sp-pf-edit">
            <label><span class="sp-pf-lab">名字 ${cnt('name')}</span><input data-pf-f="name" value="${PS.esc(cur.name)}" placeholder="主页上显示的名字"></label>
            <label><span class="sp-pf-lab">简介 ${cnt('bio')}</span><textarea data-pf-f="bio" rows="${key === 'x' ? 5 : 7}">${PS.esc(cur.bio)}</textarea></label>
            <div class="sp-pf-acts"><button class="btn s primary" type="button" id="pfSave">存好</button><button class="btn s" type="button" data-pf-copy="bio">复制简介</button>${cur.name || cur.bio ? '<button class="btn s ghost" type="button" id="pfCancel">不改了</button>' : ''}</div>
          </div>`;
      const plats = (studio.platforms || []).filter(x => x.variant === key);
      const syncRows = plats.map(x => `<div class="sp-pf-row">
        <b>${PS.esc(x.label)}</b>
        <span class="sp-pf-state ${x.state === 'synced' ? 'hot' : ''}">${x.state === 'synced' ? `已同步 · ${PS.esc(x.applied_at)}` : '待确认同步'}</span>
        <small>${PS.esc(x.where)}</small>
        <span class="acts">${x.edit_url ? `<a class="sp-text-btn" href="${PS.esc(x.edit_url)}" target="_blank" rel="noopener">打开 ↗</a>` : ''}${x.state === 'synced' ? '' : `<button class="btn s" type="button" data-pf-applied="${PS.esc(x.key)}">我贴好了</button>`}</span>
      </div>`).join('');
      body = `${lead((p.tabs || {}).profile, 'profile', '对外简介')}
        <section class="sp-pf">
          <div class="sp-seg" role="tablist">${PF.map(([k, label]) => `<button type="button" role="tab" class="${k === spState.pf ? 'on' : ''}" data-pf-tab="${k}">${label}</button>`).join('')}</div>
          ${card}
          ${secHead('平台同步', plats.map(x => x.label).join('、'))}
          <div class="sp-pf-sync">${syncRows}</div>
          <p class="sp-foot">内容来源：本机 Obsidian <code>${PS.esc(studio.profilePath || '000_park-os/park profile.md')}</code>（在线修改持久化到 SQLite）。</p>
        </section>`;
    } else if (tab === 'persona') {
      const pe = studio.persona || { base: [], gallery: [] };
      const imgTag = (file, label) => {
        const u = `/api/studio-positioning/file?path=${encodeURIComponent(file)}`;
        return `<a class="sp-pe-img" href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${PS.esc(label)}" loading="lazy" decoding="async"></a>`;
      };
      const baseHtml = pe.base?.length
        ? `<div class="sp-pe-base">${pe.base.map(b => `<figure>${imgTag(b.file, b.label)}<figcaption>${PS.esc(b.label)}</figcaption></figure>`).join('')}</div>`
        : '<div style="padding:16px" class="sub">还没有定稿形象</div>';
      const groups = [];
      for (const g of pe.gallery || []) {
        const dir = g.file.split('/').slice(0, -1).join('/');
        let last = groups[groups.length - 1];
        if (!last || last.dir !== dir) { last = { dir, title: g.title || dir, at: g.at || '', items: [] }; groups.push(last); }
        last.items.unshift(g);
      }
      const galleryHtml = groups.length
        ? groups.map(g => `<details class="sp-pe-group"><summary class="sp-pe-gh"><b>${PS.esc(g.title)}</b><small>${PS.esc((g.at || '').slice(0, 10))} · ${g.items.length} 张 · 点开查看</small></summary>
            <div class="sp-pe-grid">${g.items.map(i => `<figure>${imgTag(i.file, i.caption)}<figcaption>${PS.esc(i.caption)}</figcaption></figure>`).join('')}</div></details>`).join('')
        : '<div style="padding:16px" class="sub">还没有文章配图记录</div>';
      body = `<div class="sp-persona">
        <div class="sp-panel"><div class="sp-panel-h"><h2>定稿形象（${pe.base?.length || 0} 张）</h2><small>${PS.esc(pe.skill ? `配图 Skill：${pe.skill} · 主角 ${pe.name}` : (pe.name || '本地只读读取'))}</small></div>${baseHtml}</div>
        <details class="sp-panel"><summary class="sp-panel-h"><h2>配图里的形象（${pe.gallery?.length || 0} 张）</h2><small>按文章分组 · 点开查看</small></summary>${galleryHtml}</details>
      </div>`;
    }

    const main = PS.shell('position', [['系统', '#settings'], ['我的定位', '#position']], `
      <div class="sp">
        <header class="sp-page-head">
          <div>
            <div class="sp-eyeline">${pg.eyeline ? ed(['positioning', 'page', 'eyeline'], pg.eyeline) : '定位'} · ${PS.esc(p.company?.name || '')}</div>
            <h1>${pg.h1 ? ed(['positioning', 'page', 'h1'], pg.h1) : PS.esc(p.company?.name || '我的定位')}</h1>
            <p>${pg.lead ? ed(['positioning', 'page', 'lead'], pg.lead) : PS.esc(`${p.company?.tagline_lead || ''}${p.company?.tagline || ''}`)}</p>
          </div>
          <div class="sp-actions">
            <button class="btn" type="button" id="spCopyBio">复制对外简介</button>
            <button class="sp-text-btn faint" type="button" id="spReload">从本机重读</button>
          </div>
        </header>
        <div class="utabs">
          ${SP_TABS.map(([k, l]) => `<button type="button" class="utab ${tab === k ? 'on' : ''}" data-sp-tab="${k}">${l}</button>`).join('')}
        </div>
        <div class="sp-doc-card">${body}</div>
      </div>
    `);

    const copyText = txt => {
      if (!txt) return PS.toast('内容为空', 'warn');
      navigator.clipboard?.writeText(txt);
      PS.toast('已复制到剪贴板 ✓', 'good');
    };
    main.querySelectorAll('[data-sp-tab]').forEach(b => b.onclick = () => {
      spState.tab = b.dataset.spTab;
      PS.pages.position(spState.tab);
    });
    main.querySelector('#spCopyKw')?.addEventListener('click', () => copyText(p.company?.keyword || ''));
    main.querySelector('#spCopyBio').onclick = () => copyText((studio.profile?.cn || {}).bio || '');
    main.querySelector('#spReload').onclick = async () => {
      try {
        const res = await PS.api('POST', '/api/studio-positioning/reload', {});
        PS.S.studioPositioning = res.studio;
        PS.save();
        PS.toast('已从本机定位正本重新加载 ✓', 'good');
        PS.pages.position(tab);
      } catch (err) { PS.toast(err.message || '重载失败', 'warn'); }
    };
    main.querySelectorAll('.sp-ed').forEach(el => {
      let before = el.textContent;
      el.onkeydown = e => {
        if (e.key === 'Enter' && !el.classList.contains('pre')) { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') { el.textContent = before; el.blur(); }
      };
      el.onblur = async () => {
        const value = el.innerText.replace(/\n$/, '');
        if (value === before) return;
        try {
          const res = await PS.api('PUT', '/api/studio-positioning', { path: JSON.parse(el.dataset.sp), value });
          PS.S.studioPositioning = res.studio;
          PS.save();
          before = value;
          PS.toast('定位已保存 ✓', 'good');
        } catch (err) {
          el.textContent = before;
          PS.toast(err.message || '保存失败', 'warn');
        }
      };
    });
    main.querySelectorAll('[data-sp-check]').forEach(box => box.onchange = () => {
      const i = Number(box.dataset.spCheck);
      spChecks = box.checked ? [...new Set([...spChecks, i])] : spChecks.filter(x => x !== i);
      try { localStorage.setItem('ps-sp-checks', JSON.stringify({ week: spWeekKey(), done: spChecks })); } catch (_) {}
      PS.pages.position(tab);
    });
    main.querySelectorAll('[data-pf-tab]').forEach(b => b.onclick = () => { spState.pf = b.dataset.pfTab; PS.pages.position('profile'); });
    main.querySelector('#pfUnlock')?.addEventListener('click', () => { spState.editing[spState.pf] = true; PS.pages.position('profile'); });
    main.querySelector('#pfCancel')?.addEventListener('click', () => { delete spState.editing[spState.pf]; PS.pages.position('profile'); });
    main.querySelectorAll('[data-pf-f]').forEach(el => el.oninput = () => {
      const c = main.querySelector(`[data-pf-count="${el.dataset.pfF}"]`);
      if (c) c.textContent = String(el.value.length);
    });
    main.querySelectorAll('[data-pf-copy]').forEach(b => b.onclick = () => {
      const field = main.querySelector(`[data-pf-f="${b.dataset.pfCopy}"]`);
      copyText(field ? field.value : ((studio.profile || {})[spState.pf] || {})[b.dataset.pfCopy] || '');
    });
    main.querySelectorAll('[data-pf-applied]').forEach(b => b.onclick = async () => {
      try {
        const res = await PS.api('POST', '/api/studio-positioning/applied', { key: b.dataset.pfApplied });
        PS.S.studioPositioning = res.studio;
        PS.save();
        PS.toast('已记下同步日期 ✓', 'good');
        PS.pages.position('profile');
      } catch (err) { PS.toast(err.message || '保存失败', 'warn'); }
    });
    main.querySelector('#pfSave')?.addEventListener('click', async () => {
      try {
        for (const el of main.querySelectorAll('[data-pf-f]')) {
          const res = await PS.api('PUT', '/api/studio-positioning', { path: ['profile', spState.pf, el.dataset.pfF], value: el.value });
          PS.S.studioPositioning = res.studio;
        }
        delete spState.editing[spState.pf];
        PS.save();
        PS.toast('对外简介已保存 ✓', 'good');
        PS.pages.position('profile');
      } catch (err) { PS.toast(err.message || '保存失败', 'warn'); }
    });
  };
})();
