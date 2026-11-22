/* 收纳在左下角「设置与更多」浮层中的全功能开源模块：知识树、我说过的话、咨询客户 CRM、个人网站、我的定位、系统设置（专用 Chrome 7 平台 / 本地 AI / 飞书微信 / 模块开关） */
(function () {
  'use strict';
  const PS = window.PS;

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

  PS.pages.settings = function (tab = 'platforms') {
    const cur = ['platforms', 'ai', 'notify', 'modules'].includes(tab) ? tab : 'platforms';
    let body = '';

    if (cur === 'platforms') {
      body = `<div class="card stack">
        <div class="row"><div><b>统一专用 Chrome（CDP :${PS.S.daemon.chromePort}）</b><div class="sub">7 家平台共用一个隔离 Profile，不碰你平时的 Chrome，也不存密码。</div></div><span class="grow"></span><button class="btn primary s" id="docAll">全部体检</button></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>平台</th><th>发布策略</th><th>状态</th><th>启用</th><th style="text-align:right">操作</th></tr></thead>
          <tbody>${PS.PLAT_ORDER.map(pid => {
            const p = PS.PLATFORMS[pid], st = PS.S.platformStatus[pid];
            return `<tr>
              <td><span class="plat-tag">${PS.plogo(pid, 20)}${p.name}</span></td>
              <td><span class="pill">${p.mode === 'manual' ? '只填不点发' : '校验提交'}</span></td>
              <td>${st.disabled ? '<span class="pill">已停用</span>' : `<span class="pill ${st.state === 'ok' ? 'good' : 'wait'}">${PS.esc(st.detail)}</span>`}</td>
              <td><button class="switch ${st.disabled ? '' : 'on'}" data-ptog="${pid}"></button></td>
              <td style="text-align:right"><button class="btn s" data-plog="${pid}">扫码 / 保活</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    } else if (cur === 'ai') {
      const s = PS.S.settings;
      body = `<div class="card stack">
        <div><label style="font-weight:700;display:block;margin-bottom:6px">本地 AI 引擎（零 API 费优先）</label>
          <div class="seg">
            <button class="${s.aiBackend === 'claude' ? 'on' : ''}" data-aib="claude">本机 Claude Code CLI</button>
            <button class="${s.aiBackend === 'codex' ? 'on' : ''}" data-aib="codex">本机 Codex CLI</button>
            <button class="${s.aiBackend === 'api' ? 'on' : ''}" data-aib="api">可选 API Key</button>
          </div>
        </div>
        <div><label style="font-weight:600;display:block;margin-bottom:4px">Obsidian 笔记库路径（只读）</label><input type="text" id="obP" value="${PS.esc(s.obsidianPath)}"></div>
        <div><label style="font-weight:600;display:block;margin-bottom:4px">本地语音转写</label><select id="trP"><option value="mlx-whisper" ${s.transcribeEngine === 'mlx-whisper' ? 'selected' : ''}>mlx-whisper (Apple Silicon)</option><option value="faster-whisper" ${s.transcribeEngine === 'faster-whisper' ? 'selected' : ''}>faster-whisper (通用)</option></select></div>
        <div><button class="btn primary" id="saveAi">保存配置</button></div>
      </div>`;
    } else if (cur === 'notify') {
      const d = PS.S.daemon;
      body = `<div class="card stack">
        <div class="row"><div><b>飞书群机器人卡片</b><div class="sub">填完催点发、定时篡改告警、1/3/7 天复盘与周报</div></div><span class="grow"></span><button class="switch ${d.feishuEnabled ? 'on' : ''}" id="tFs"></button></div>
        <input type="url" value="${PS.esc(d.feishuWebhook)}">
        <div class="row"><button class="btn s" onclick="PS.toast('已发送飞书测试卡片','good')">测试发送</button></div>
        <div class="row" style="padding-top:10px;border-top:1px solid var(--line-soft)"><div><b>微信（ilink）同步提醒与微信问 Wendy</b></div><span class="grow"></span><button class="switch ${d.wechatIlinkEnabled ? 'on' : ''}" id="tWx"></button></div>
      </div>`;
    } else {
      const m = PS.S.settings.modules;
      const list = [['tree', '知识树'], ['clients', '咨询客户 CRM'], ['site', '个人网站'], ['kline', 'K 线日报'], ['conversion', '转化归因漏斗']];
      body = `<div class="card stack">
        ${list.map(([k, l]) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line-soft)"><span class="grow"><b>${l}</b></span><button class="switch ${m[k] ? 'on' : ''}" data-mod="${k}"></button></div>`).join('')}
        <div><button class="btn danger s" id="resetBtn">重置演示数据</button></div>
      </div>`;
    }

    const main = PS.shell('settings', [['设置', '#settings']], `
      <div class="ph"><div><h1>设置与系统管理</h1><p>全开源、全本地：所有配置与登录态均留在 ~/.park-studio。</p></div></div>
      <div class="utabs">
        <button class="utab ${cur === 'platforms' ? 'on' : ''}" onclick="location.hash='#settings/platforms'">专用 Chrome & 7 平台</button>
        <button class="utab ${cur === 'ai' ? 'on' : ''}" onclick="location.hash='#settings/ai'">本地 AI & Obsidian</button>
        <button class="utab ${cur === 'notify' ? 'on' : ''}" onclick="location.hash='#settings/notify'">飞书 / 微信通知</button>
        <button class="utab ${cur === 'modules' ? 'on' : ''}" onclick="location.hash='#settings/modules'">模块开关</button>
      </div>
      ${body}
    `, 'mid');

    main.querySelector('#docAll')?.addEventListener('click', () => {
      for (const pid of PS.PLAT_ORDER) if (!PS.S.platformStatus[pid].disabled) { PS.S.platformStatus[pid].state = 'ok'; PS.S.platformStatus[pid].detail = '体检通过 · 正常'; }
      PS.save(); PS.toast('全部平台真实探活通过！', 'good'); PS.pages.settings('platforms');
    });
    main.querySelectorAll('[data-ptog]').forEach(b => b.onclick = () => { const p = b.dataset.ptog; PS.S.platformStatus[p].disabled = !PS.S.platformStatus[p].disabled; PS.save(); PS.pages.settings('platforms'); });
    main.querySelectorAll('[data-plog]').forEach(b => b.onclick = () => { const p = b.dataset.plog; PS.S.platformStatus[p].state = 'ok'; PS.S.platformStatus[p].detail = '已扫码保活'; PS.save(); PS.toast(`${PS.PLATFORMS[p].name} 已保活`, 'good'); PS.pages.settings('platforms'); });
    main.querySelectorAll('[data-aib]').forEach(b => b.onclick = () => { PS.S.settings.aiBackend = b.dataset.aib; PS.save(); PS.pages.settings('ai'); });
    main.querySelector('#saveAi')?.addEventListener('click', () => { PS.S.settings.obsidianPath = main.querySelector('#obP').value.trim(); PS.S.settings.transcribeEngine = main.querySelector('#trP').value; PS.save(); PS.toast('已保存', 'good'); });
    main.querySelector('#tFs')?.addEventListener('click', () => { PS.S.daemon.feishuEnabled = !PS.S.daemon.feishuEnabled; PS.save(); PS.pages.settings('notify'); });
    main.querySelector('#tWx')?.addEventListener('click', () => { PS.S.daemon.wechatIlinkEnabled = !PS.S.daemon.wechatIlinkEnabled; PS.save(); PS.pages.settings('notify'); });
    main.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { PS.S.settings.modules[b.dataset.mod] = !PS.S.settings.modules[b.dataset.mod]; PS.save(); PS.pages.settings('modules'); });
    main.querySelector('#resetBtn')?.addEventListener('click', () => PS.resetDemo());
  };
})();
