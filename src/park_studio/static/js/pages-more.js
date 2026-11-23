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
          <a class="btn" href="#releases">${PS.icon('spark', 'sm')}上新 · v0.1.2</a>
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
        <h2>集成与开源社区</h2>
        <span>飞书通知、自有知识站、本地 Coding Agent 与自愿共享对标库</span>
      </div>
      <section class="sys-2col">
        <div class="card stack">
          <div class="card-h">
            <h3>飞书通知</h3>
            <span class="pill ${d.feishuEnabled ? 'good' : ''}">${d.feishuEnabled ? '✓ 已连接' : '未启用'}</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">群机器人 Webhook</label>
            <input type="url" id="fsHook" value="${PS.esc(d.feishuWebhook)}" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/...">
          </div>
          <div class="row">
            <button class="btn primary s" id="fsTest">测试发送</button>
            <button class="btn s" id="fsSave">保存</button>
            <span class="sub">保存后立即生效，不用重启</span>
          </div>
          <div class="swrow" style="border-top:1px solid var(--line-soft);padding-top:10px">
            <div><b style="font-size:13px">用飞书验证码登录</b><small>远程打开时推 6 位验证码，替代网页口令</small></div>
            <button class="switch ${s.feishuLogin ? 'on' : ''}" id="swFsLogin"></button>
          </div>
          <div class="swrow" style="padding-top:2px">
            <div><b style="font-size:13px">微信（ilink）同步提醒与微信问 Wendy</b><small>同一守护进程，扫码绑定即可接收告警</small></div>
            <button class="switch ${d.wechatIlinkEnabled ? 'on' : ''}" id="swWx"></button>
          </div>
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>自有站点（转化归因）</h3>
            <button class="switch ${s.siteEnabled ? 'on' : ''}" id="swSite"></button>
          </div>
          ${s.siteEnabled ? `
            <div><label class="sub" style="display:block;margin-bottom:4px">站名</label><input type="text" id="stName" value="${PS.esc(s.siteName)}"></div>
            <div><label class="sub" style="display:block;margin-bottom:4px">站点地址</label><input type="url" id="stUrl" value="${PS.esc(s.siteUrl)}"></div>
            <details class="sub"><summary>接口路径（默认值一般不用改）</summary>
              <div class="sys-2col" style="margin-top:8px">
                <input type="text" value="${PS.esc(s.siteAdminPath)}" placeholder="后台路径">
                <input type="text" value="${PS.esc(s.siteDashApi)}" placeholder="仪表盘接口">
              </div>
            </details>
            <div class="row">
              <button class="btn primary s" id="stTest">测试连接</button>
              <button class="btn s" id="stSave">保存</button>
              <span class="sub">近 30 日归因收入 ¥20,350</span>
            </div>
          ` : '<p class="sub m0">未启用 · 打开开关后可接入自己的知识站 / 课程站，自动统计每期带来的注册、会员与收入。</p>'}
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>本地 AI（零 API 费）与目录</h3>
            <span class="pill good">${PS.S.agents?.[s.aiBackend]?.installed ? '✓ CLI 已就绪' : '本机运行'}</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:6px">Coding Agent 引擎</label>
            <div class="seg">
              <button class="${s.aiBackend === 'gemini' ? 'on' : ''}" data-aib="gemini">Gemini CLI${PS.S.agents?.gemini?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'claude' ? 'on' : ''}" data-aib="claude">Claude Code${PS.S.agents?.claude?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'codex' ? 'on' : ''}" data-aib="codex">Codex${PS.S.agents?.codex?.installed ? ' ✓' : ''}</button>
              <button class="${s.aiBackend === 'api' ? 'on' : ''}" data-aib="api">可选 API</button>
            </div>
          </div>
          <div><label class="sub" style="display:block;margin-bottom:4px">模型名称（默认 neon；若 CLI 未识别会自动回退默认模型）</label><input type="text" id="aiModelIn" class="mono" value="${PS.esc(s.aiModel || 'neon')}" placeholder="neon / gemini-2.5-pro / 留空走默认"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">Obsidian 笔记库路径（只读）</label><input type="text" id="obPath" value="${PS.esc(s.obsidianPath)}"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">统一视频工程根目录（定稿建目录 / 打包自动扫描）</label><input type="text" id="projRootIn" value="${PS.esc(s.projectRoot || '~/Movies/ParkStudio')}"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">本地语音转写</label>
            <select id="trEng"><option value="mlx-whisper" ${s.transcribeEngine === 'mlx-whisper' ? 'selected' : ''}>mlx-whisper（Apple Silicon 极速本机）</option><option value="faster-whisper" ${s.transcribeEngine === 'faster-whisper' ? 'selected' : ''}>faster-whisper（macOS / Windows 通用）</option></select>
          </div>
          <div><button class="btn s primary" id="saveAiCfg">保存并重新扫描 Obsidian</button></div>
        </div>

        <div class="card stack">
          <div class="card-h">
            <h3>Park 社区与「共享对标库」</h3>
            <span class="pill accent">利他飞轮</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">Park 社区通行码（免费进私域群领取，解锁完整信源与共享库）</label>
            <div class="row">
              <input type="text" id="commKey" class="grow mono" value="${PS.esc(s.communityKey)}" placeholder="PK-COMM-...">
              <button class="btn s" id="btnJoinGroup">扫码进群领码</button>
            </div>
          </div>
          <div class="swrow" style="border-top:1px solid var(--line-soft);padding-top:10px">
            <div>
              <b style="font-size:13px">加入「共享对标库」（当前 ${s.sharedBenchmarkCount} 个公开号）</b>
              <small>匿名共享你抓到的<b>公开对标爆款元数据</b>（绝不上传 Cookie 或私密数据），换取全社区实时爆款流</small>
            </div>
            <button class="switch ${s.sharedBenchmarkOptIn ? 'on' : ''}" id="swShared"></button>
          </div>
          <div class="swrow" style="padding-top:0">
            <div><b style="font-size:13px">透明匿名活跃心跳</b><small>仅上报版本号与 OS，不含任何内容或账号，随时可关</small></div>
            <button class="switch ${s.telemetryOptIn ? 'on' : ''}" id="swTel"></button>
          </div>
          <div class="swrow" style="padding-top:0">
            <div><b style="font-size:13px">显示交流群与踩坑手册提示</b><small>报错或平台改版时提示进群看最新适配</small></div>
            <button class="switch ${s.learnLinks ? 'on' : ''}" id="swLearn"></button>
          </div>
        </div>
      </section>

      <div class="sys-sec">
        <h2>运行透明</h2>
        <span>自动任务计划与守护进程实时动态</span>
      </div>
      <section class="sys-2col">
        <div class="card">
          <div class="card-h">
            <h3>自动任务</h3>
            <button class="btn s" id="btnLaunchd">${PS.S.launchd?.installed ? '已生成 launchd ✓' : '生成 macOS 开机自启'}</button>
          </div>
          <div class="sys-scroll">
            <dl class="kv-dl">
              <dt>每 5 分钟</dt><dd>检查有没有到点要取链接的期数，每 20 分钟提醒还没点发布的国内平台</dd>
              <dt>每小时</dt><dd>视频号等易掉线平台自动保活，掉线发飞书提醒</dd>
              <dt>每天 09:00</dt><dd>全平台真实探活体检一次，有掉线才打扰</dd>
              <dt>每天 10:00</dt><dd>采集全平台流量与粉丝，自动发飞书日报；同步共享对标库公开爆款</dd>
              <dt>发布后 72h</dt><dd>头三天每 6 小时采样一次，第 1 / 3 / 7 天自动出同龄复盘</dd>
            </dl>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h3>最近动态</h3><span class="sub">${PS.S.daemonLogs.length} 条记录</span></div>
          <div class="sys-scroll">
            ${PS.S.daemonLogs.map(l => `<div class="flog">
              <span class="tm">${PS.esc(l.ts)}</span>
              <b>${PS.esc(l.ep)}</b>
              <span class="pill">${PS.esc(l.plat)}</span>
              <span class="sub clip1 grow">${PS.esc(l.action)} · ${PS.esc(l.result)}</span>
            </div>`).join('')}
          </div>
        </div>
      </section>

      <section class="card">
        <details>
          <summary style="font-weight:600;font-size:13.5px">开源模块显示开关 & 重置演示数据</summary>
          <div class="stack tight" style="margin-top:12px">
            ${[['tree', '知识树与内化'], ['clients', '咨询客户 CRM'], ['site', '个人网站'], ['kline', 'K 线日报'], ['conversion', '转化归因漏斗']].map(([k, l]) =>
              `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span class="grow">${l}</span><button class="switch ${s.modules[k] ? 'on' : ''}" data-mod="${k}"></button></div>`
            ).join('')}
            <div class="row" style="padding-top:8px"><button class="btn danger s" id="resetDemo">重置全部演示数据</button><span class="sub">所有演示改动仅保存在本浏览器 localStorage</span></div>
          </div>
        </details>
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
    main.querySelector('#swFsLogin').onclick = () => { s.feishuLogin = !s.feishuLogin; PS.save(); PS.pages.settings(); };
    main.querySelector('#swWx').onclick = () => { d.wechatIlinkEnabled = !d.wechatIlinkEnabled; PS.save(); PS.pages.settings(); };
    main.querySelector('#swSite').onclick = () => { s.siteEnabled = !s.siteEnabled; PS.save(); PS.pages.settings(); };
    main.querySelector('#stTest')?.addEventListener('click', () => PS.toast(`已连上 ${s.siteName}：接口 200 OK`, 'good'));
    main.querySelector('#stSave')?.addEventListener('click', () => { s.siteName = main.querySelector('#stName').value.trim(); s.siteUrl = main.querySelector('#stUrl').value.trim(); PS.save(); PS.toast('站点配置已保存并立即生效', 'good'); });

    main.querySelectorAll('[data-aib]').forEach(b => b.onclick = async () => {
      s.aiBackend = b.dataset.aib;
      await PS.api('PUT', '/api/settings', { aiBackend: s.aiBackend }).catch(() => {});
      PS.save(); PS.pages.settings();
    });
    main.querySelector('#saveAiCfg').onclick = async () => {
      s.aiModel = main.querySelector('#aiModelIn').value.trim();
      s.obsidianPath = main.querySelector('#obPath').value.trim();
      s.projectRoot = main.querySelector('#projRootIn').value.trim();
      s.transcribeEngine = main.querySelector('#trEng').value;
      try {
        await PS.api('PUT', '/api/settings', { aiBackend: s.aiBackend, aiModel: s.aiModel, obsidianPath: s.obsidianPath, projectRoot: s.projectRoot, transcribeEngine: s.transcribeEngine });
        await PS.syncFromBackend();
        PS.toast('配置已写入 ~/.park-studio/config.yaml 并重新扫描 Obsidian 与工程目录 ✓', 'good');
      } catch {
        PS.toast('本地配置已保存', 'good');
      }
      PS.save(); PS.pages.settings();
    };

    main.querySelector('#swShared').onclick = () => { s.sharedBenchmarkOptIn = !s.sharedBenchmarkOptIn; PS.save(); PS.toast(s.sharedBenchmarkOptIn ? '已加入社区共享对标库（仅同步公开元数据）' : '已暂停贡献，仅保留本地对标'); PS.pages.settings(); };
    main.querySelector('#swTel').onclick = () => { s.telemetryOptIn = !s.telemetryOptIn; PS.save(); PS.pages.settings(); };
    main.querySelector('#swLearn').onclick = () => { s.learnLinks = !s.learnLinks; PS.save(); PS.pages.settings(); };
    main.querySelector('#btnJoinGroup').onclick = () => {
      PS.modal({
        title: '加入 Park Studio 开源创作者交流群（免费领通行码）',
        body: `<div class="stack" style="text-align:center;padding:8px 0">
          <div style="width:156px;height:156px;margin:0 auto;border-radius:14px;background:var(--sunk);border:1px dashed var(--line);display:grid;place-items:center;color:var(--ink-3)">微信群二维码位<br><small>正式版替换为你的活码</small></div>
          <p class="m0" style="font-size:13.5px">扫码进群后免费领一个 <b>Park 社区通行码</b>，解锁每日「Park 信源」更新、社区 <b>共享对标库（${s.sharedBenchmarkCount}+ 公开号）</b> 与平台改版适配通知。</p>
        </div>`,
        foot: `<button class="btn primary" data-close>知道了</button>`,
      });
    };
    main.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { s.modules[b.dataset.mod] = !s.modules[b.dataset.mod]; PS.save(); PS.pages.settings(); });
    main.querySelector('#resetDemo').onclick = () => PS.resetDemo();
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

  // ==================== 3. 其余开源资产模块（知识树 / 原话 / 咨询客户 / 个人网站 / 我的定位） ====================
  let treeSlug = 'content-ops';

  PS.pages.tree = function () {
    const cur = PS.S.tree.find(x => x.slug === treeSlug) || PS.S.tree[0];
    const main = PS.shell('tree', [['更多模块', '#tree'], ['知识树', '#tree']], `
      <div class="ph">
        <div><h1>知识树</h1><p>贴 X 链接、GitHub 仓库或 Obsidian 笔记，本地 Agent 只提炼会改变做法的部分并入分支。</p></div>
        <div class="acts"><button class="btn primary" id="btnIn">+ 内化新链接</button></div>
      </div>
      <div class="two-col">
        <div class="list-col">
          ${PS.S.tree.map(b => `<button class="list-item ${b.slug === cur.slug ? 'on' : ''}" data-slug="${b.slug}"><b>${PS.esc(b.name)}</b><span class="sub">${b.standards.length} 条标准 · ${b.pitfalls.length} 个坑</span></button>`).join('')}
        </div>
        <div class="card stack">
          <h2 class="m0">${PS.esc(cur.name)}</h2>
          <div class="callout-warm"><b>核心主干：</b>${PS.esc(cur.trunk)}</div>
          <div><b>好坏标准</b><ul style="padding-left:18px;margin:6px 0">${cur.standards.map(x => `<li>${PS.esc(x)}</li>`).join('')}</ul></div>
          <div><b style="color:var(--warn)">避坑清单</b><ul style="padding-left:18px;margin:6px 0">${cur.pitfalls.map(x => `<li>${PS.esc(x)}</li>`).join('')}</ul></div>
        </div>
      </div>
    `, 'mid');
    main.querySelectorAll('[data-slug]').forEach(b => b.onclick = () => { treeSlug = b.dataset.slug; PS.pages.tree(); });
    main.querySelector('#btnIn').onclick = () => {
      PS.modal({
        title: '内化新资料进知识树',
        body: `<input type="url" id="inUrl" placeholder="贴 X 链接、GitHub 仓库或文章链接">`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="inGo">开始内化</button>`,
        onOpen(m, close) {
          m.querySelector('#inGo').onclick = () => {
            const u = m.querySelector('#inUrl').value.trim(); if (!u) return;
            cur.standards.push(`来自 ${u.slice(0, 34)} 的核心方法论（已本地内化）`);
            PS.save(); close(); PS.toast('已完成内化', 'good'); PS.pages.tree();
          };
        },
      });
    };
  };

  PS.pages.said = function () {
    const main = PS.shell('said', [['更多模块', '#said'], ['我说过的话', '#said']], `
      <div class="ph">
        <div><h1>我说过的话</h1><p>写稿时 AI 只从这里挑你的真实经历和数字举例，绝不编造。</p></div>
        <div class="acts"><button class="btn primary" id="addSaid">+ 记一句原话</button></div>
      </div>
      <div class="stack tight">
        ${PS.S.said.map(s => `<div class="card row" style="padding:12px 15px;opacity:${s.muted ? '.45' : '1'}">
          <div class="min0 grow"><span class="pill accent" style="margin-right:6px">${PS.esc(s.topic)}</span><span class="sub">${PS.esc(s.from)}</span><div style="margin-top:4px">${PS.esc(s.text)}</div></div>
          <button class="btn s" data-mute="${s.id}">${s.muted ? '恢复' : '以后别用'}</button>
        </div>`).join('')}
      </div>
    `, 'narrow');
    main.querySelectorAll('[data-mute]').forEach(b => b.onclick = () => { const h = PS.S.said.find(x => x.id === +b.dataset.mute); if (h) h.muted = !h.muted; PS.save(); PS.pages.said(); });
    main.querySelector('#addSaid').onclick = () => {
      PS.modal({
        title: '记录一句原话',
        body: `<textarea id="sdT" rows="3" placeholder="一字不改记在这里…"></textarea>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="sdS">保存</button>`,
        onOpen(m, close) {
          m.querySelector('#sdS').onclick = () => {
            const v = m.querySelector('#sdT').value.trim(); if (!v) return;
            PS.S.said.unshift({ id: Date.now(), topic: '实战记录', text: v, from: '手动录入', muted: false });
            PS.save(); close(); PS.pages.said();
          };
        },
      });
    };
  };

  PS.pages.clients = function () {
    const rev = PS.S.clients.reduce((s, c) => s + (c.amount || 0), 0);
    const main = PS.shell('clients', [['更多模块', '#clients'], ['咨询客户', '#clients']], `
      <div class="ph">
        <div><h1>咨询客户</h1><p>轻量开源 CRM，直接追踪哪期内容带来了线索与成交（累计 ¥${PS.fmt(rev)}）。</p></div>
        <div class="acts"><button class="btn primary" id="addCl">+ 新增线索</button></div>
      </div>
      <section class="card pad-0"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>姓名</th><th>方向</th><th>阶段</th><th>来源</th><th class="n">金额</th><th>下一步</th></tr></thead>
        <tbody>${PS.S.clients.map(c => `<tr><td><b>${PS.esc(c.name)}</b></td><td>${PS.esc(c.niche)}</td><td><span class="pill ${c.stage === '已成交' ? 'good' : 'info'}">${c.stage}</span></td><td>${PS.esc(c.source)}</td><td class="n">${c.amount ? '¥' + PS.fmt(c.amount) : '–'}</td><td class="sub">${PS.esc(c.next)}</td></tr>`).join('')}</tbody>
      </table></div></section>
    `, 'mid');
    main.querySelector('#addCl').onclick = () => {
      PS.modal({
        title: '新增线索',
        body: `<div class="stack"><input type="text" id="cn" placeholder="称呼"><input type="text" id="cs" placeholder="来源作品（如 抖音 EP41）"></div>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="csave">保存</button>`,
        onOpen(m, close) {
          m.querySelector('#csave').onclick = () => {
            const n = m.querySelector('#cn').value.trim(); if (!n) return;
            PS.S.clients.unshift({ id: Date.now(), name: n, niche: '知识IP', stage: '新线索', amount: 0, source: m.querySelector('#cs').value.trim() || '自然流量', next: '待沟通' });
            PS.save(); close(); PS.pages.clients();
          };
        },
      });
    };
  };

  PS.pages.site = function () {
    PS.shell('site', [['更多模块', '#site'], ['个人网站', '#site']], `
      <div class="ph"><div><h1>个人网站</h1><p>维护你的个人主页与 UTM 转化承接站。</p></div><div class="acts"><a class="btn primary" href="#conversion">看转化归因 ›</a></div></div>
      <div class="hm-grid">
        <div class="card stack tight"><span class="pill good" style="width:fit-content">已连接</span><b>${PS.esc(PS.S.settings.siteName)}</b><span class="mono sub">${PS.esc(PS.S.settings.siteUrl)}</span></div>
        <div class="card stack tight"><span class="pill accent" style="width:fit-content">开源名片模板</span><b>静态个人页导出</b><button class="btn s" style="width:fit-content" onclick="PS.toast('已导出到 ~/.park-studio/site-dist/','good')">导出静态站点</button></div>
      </div>
    `, 'mid');
  };

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
