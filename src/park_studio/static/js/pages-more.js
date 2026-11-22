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
      if (st.disabled) return '<span class="pill">– 已停用</span>';
      if (st.state === 'ok') return '<span class="pill good">✓ 已登录</span>';
      return '<span class="pill wait">! 待保活</span>';
    };

    const main = PS.shell('settings', [['系统', '#settings']], `
      <div class="ph">
        <div>
          <h1>系统</h1>
          <p>Park Studio 本机运行状态、7 平台专用浏览器体检、飞书/站点集成与 Park 开源社区连接。</p>
        </div>
        <div class="acts">
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
          <div class="val ok">已挂载</div>
          <div class="dl mono">${PS.esc(s.obsidianPath)}</div>
        </div>
        <div class="stile">
          <div class="lab">专用浏览器</div>
          <div class="val ok">${d.chromeOnline ? '在线' : '未启动'}</div>
          <div class="dl">独立 Profile · CDP :${d.chromePort}</div>
        </div>
        <div class="stile">
          <div class="lab">平台登录</div>
          <div class="val ${warnPlats.length ? 'warn' : 'ok'}">${warnPlats.length ? `${okCount}/${active.length} 正常` : `全部正常`}</div>
          <div class="dl">上次体检 ${PS.esc(d.lastMetricsAt)}${warnPlats.length ? ` · ${warnPlats.map(p => PS.PLATFORMS[p].name).join('、')}待保活` : ''}</div>
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
            <span class="pill good">本机运行</span>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:6px">Coding Agent 引擎</label>
            <div class="seg">
              <button class="${s.aiBackend === 'claude' ? 'on' : ''}" data-aib="claude">Claude Code CLI</button>
              <button class="${s.aiBackend === 'codex' ? 'on' : ''}" data-aib="codex">Codex CLI</button>
              <button class="${s.aiBackend === 'api' ? 'on' : ''}" data-aib="api">可选 API</button>
            </div>
          </div>
          <div><label class="sub" style="display:block;margin-bottom:4px">Obsidian 笔记库路径（只读）</label><input type="text" id="obPath" value="${PS.esc(s.obsidianPath)}"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">本地语音转写</label>
            <select id="trEng"><option value="mlx-whisper" ${s.transcribeEngine === 'mlx-whisper' ? 'selected' : ''}>mlx-whisper（Apple Silicon 极速本机）</option><option value="faster-whisper" ${s.transcribeEngine === 'faster-whisper' ? 'selected' : ''}>faster-whisper（macOS / Windows 通用）</option></select>
          </div>
          <div><button class="btn s primary" id="saveAiCfg">保存本地配置</button></div>
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
          <div class="card-h"><h3>自动任务</h3><span class="sub">launchd / 任务计划</span></div>
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

    const pushLog = (plat, action, result) => {
      PS.S.daemonLogs.unshift({ ts: '刚刚', ep: '系统', plat, action, result });
      PS.S.daemon.lastMetricsAt = '刚刚';
      PS.save();
    };

    main.querySelector('#btnDocAll').onclick = () => {
      for (const pid of PS.PLAT_ORDER) if (!PS.S.platformStatus[pid].disabled) { PS.S.platformStatus[pid].state = 'ok'; PS.S.platformStatus[pid].checkedAt = '刚刚'; PS.S.platformStatus[pid].detail = '已登录 · 创作者后台正常'; }
      pushLog('7 平台', '全部检查', '真实探活全部绿灯');
      PS.toast('已完成全部启用平台真实探活：全绿正常！', 'good');
      PS.pages.settings();
    };
    main.querySelector('#btnLoginAll').onclick = () => {
      pushLog('专用 Chrome', '打开登录页', '已在独立 Profile 打开全部启用平台登录页');
      PS.toast('已在专用 Chrome (:9333) 打开全部平台登录页，扫码后自动记住', 'good');
      PS.pages.settings();
    };
    main.querySelector('#btnSyncCur').onclick = () => {
      pushLog('7 平台', '取链接', `已扫描并同步 EP${curEp.episode} 最新链接`);
      PS.toast(`已完成「${curEp.nick}」链接同步`, 'good');
      PS.pages.settings();
    };
    main.querySelector('#btnMetrics').onclick = () => { pushLog('7 平台', '采流量', '已采集最新播放与互动'); PS.toast('流量采集完成，大屏已更新', 'good'); PS.pages.settings(); };
    main.querySelector('#btnFollowers').onclick = () => {
      for (const p of active) { const ds = Object.keys(PS.S.followers[p]).sort(); PS.S.followers[p][ds[ds.length - 1]] += Math.floor(Math.random() * 10) + 2; }
      pushLog('7 平台', '采粉丝', '粉丝快照已写入 SQLite'); PS.toast('粉丝采集完成', 'good'); PS.pages.settings();
    };
    main.querySelector('#btnSyncSite')?.addEventListener('click', () => { pushLog(s.siteName, '同步站点', '近 7 天注册与归因收入已更新'); PS.toast('知识站转化数据已同步', 'good'); PS.pages.settings(); });

    main.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => {
      const pid = b.dataset.doc;
      PS.S.platformStatus[pid].state = 'ok'; PS.S.platformStatus[pid].checkedAt = '刚刚'; PS.S.platformStatus[pid].detail = '探活通过 · 正常';
      pushLog(PS.PLATFORMS[pid].name, '单项体检', '登录态有效'); PS.toast(`${PS.PLATFORMS[pid].name} 体检通过`, 'good'); PS.pages.settings();
    });
    main.querySelectorAll('[data-login]').forEach(b => b.onclick = () => {
      const pid = b.dataset.login;
      PS.S.platformStatus[pid].state = 'ok'; PS.S.platformStatus[pid].checkedAt = '刚刚'; PS.S.platformStatus[pid].detail = '已在专用 Chrome 登录保活';
      pushLog(PS.PLATFORMS[pid].name, '打开后台', '登录态已刷新保活'); PS.toast(`已在专用 Chrome 打开 ${PS.PLATFORMS[pid].name} 后台`, 'good'); PS.pages.settings();
    });
    main.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
      const pid = b.dataset.tog; PS.S.platformStatus[pid].disabled = !PS.S.platformStatus[pid].disabled; PS.save(); PS.pages.settings();
    });

    main.querySelector('#fsTest').onclick = () => PS.toast('飞书测试卡片发送成功 ✓', 'good');
    main.querySelector('#fsSave').onclick = () => { d.feishuWebhook = main.querySelector('#fsHook').value.trim(); d.feishuEnabled = !!d.feishuWebhook; PS.save(); PS.toast('飞书配置已保存并生效', 'good'); PS.pages.settings(); };
    main.querySelector('#swFsLogin').onclick = () => { s.feishuLogin = !s.feishuLogin; PS.save(); PS.pages.settings(); };
    main.querySelector('#swWx').onclick = () => { d.wechatIlinkEnabled = !d.wechatIlinkEnabled; PS.save(); PS.pages.settings(); };
    main.querySelector('#swSite').onclick = () => { s.siteEnabled = !s.siteEnabled; PS.save(); PS.pages.settings(); };
    main.querySelector('#stTest')?.addEventListener('click', () => PS.toast(`已连上 ${s.siteName}：接口 200 OK`, 'good'));
    main.querySelector('#stSave')?.addEventListener('click', () => { s.siteName = main.querySelector('#stName').value.trim(); s.siteUrl = main.querySelector('#stUrl').value.trim(); PS.save(); PS.toast('站点配置已保存并立即生效', 'good'); });

    main.querySelectorAll('[data-aib]').forEach(b => b.onclick = () => { s.aiBackend = b.dataset.aib; PS.save(); PS.pages.settings(); });
    main.querySelector('#saveAiCfg').onclick = () => { s.obsidianPath = main.querySelector('#obPath').value.trim(); s.transcribeEngine = main.querySelector('#trEng').value; PS.save(); PS.toast('本地 AI 与目录配置已保存', 'good'); };

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

  PS.pages.position = function () {
    const pos = PS.S.positioning;
    const rows = [['你是谁（定位卡）', 'who'], ['你怎么赚钱', 'money'], ['你和别人哪里不一样', 'diff'], ['你守的规矩', 'rules'], ['对外简介', 'bio']];
    const main = PS.shell('position', [['我的定位', '#position']], `
      <div class="ph"><div><h1>我的定位</h1><p>点左上角品牌随时进来修改；每次写稿和审稿都会自动带上这份定位。</p></div><div class="acts"><button class="btn primary" id="savePos">保存定稿</button></div></div>
      <div class="card stack">${rows.map(([l, k]) => `<div><label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px">${l}</label><textarea data-pk="${k}" rows="2">${PS.esc(pos[k])}</textarea></div>`).join('')}</div>
    `, 'narrow');
    main.querySelector('#savePos').onclick = () => {
      main.querySelectorAll('[data-pk]').forEach(t => { pos[t.dataset.pk] = t.value.trim(); });
      PS.save(); PS.toast('定位已保存', 'good');
    };
  };
})();
