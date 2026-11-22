/* v1 信源 / 知识树 / 原话 / 客户 / 个人站 / 定位 / 设置 */
(function () {
  'use strict';
  const PS = window.PS;
  let st = 'newsletter', si = 0;
  PS.pages.source = function (sub) {
    if (['newsletter', 'saved', 'dev'].includes(sub)) { st = sub; si = 0; }
    const list = PS.S.sources[st] || [], cur = list[si] || list[0];
    const main = PS.shell('source', [['Park 信源', '#source']], `<div class="ph"><div><h1>Park 信源</h1></div><div class="acts"><div class="seg"><button class="${st === 'newsletter' ? 'on' : ''}" onclick="location.hash='#source/newsletter'">AI 日报</button><button class="${st === 'saved' ? 'on' : ''}" onclick="location.hash='#source/saved'">搞钱日报</button><button class="${st === 'dev' ? 'on' : ''}" onclick="location.hash='#source/dev'">开发日报</button></div></div></div><div class="two-col"><div class="list-col">${list.map((it, i) => `<button class="list-item ${i === si ? 'on' : ''}" data-si="${i}"><b>${PS.esc(it.title)}</b></button>`).join('')}</div><div class="card stack"><h2 class="m0">${PS.esc(cur?.title)}</h2><p class="m0">${PS.esc(cur?.body)}</p></div></div>`);
    main.querySelectorAll('[data-si]').forEach(b => b.onclick = () => { si = +b.dataset.si; PS.pages.source(); });
  };
  let slug = 'content-ops';
  PS.pages.tree = function () {
    const cur = PS.S.tree.find(x => x.slug === slug) || PS.S.tree[0];
    const main = PS.shell('tree', [['知识树', '#tree']], `<div class="ph"><div><h1>知识树</h1></div></div><div class="two-col"><div class="list-col">${PS.S.tree.map(b => `<button class="list-item ${b.slug === cur.slug ? 'on' : ''}" data-s="${b.slug}"><b>${PS.esc(b.name)}</b></button>`).join('')}</div><div class="card stack"><h2 class="m0">${PS.esc(cur.name)}</h2><p class="m0">${PS.esc(cur.trunk)}</p><ul>${cur.standards.map(x => `<li>${PS.esc(x)}</li>`).join('')}</ul></div></div>`);
    main.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { slug = b.dataset.s; PS.pages.tree(); });
  };
  PS.pages.scripts = () => PS.shell('scripts', [['口播稿与原话', '#scripts']], `<div class="ph"><div><h1>口播稿与我说过的话</h1></div></div><div class="card stack">${PS.S.said.map(s => `<div style="padding:10px 12px;background:var(--sunk);border-radius:9px"><span class="pill accent">${PS.esc(s.topic)}</span> ${PS.esc(s.text)}</div>`).join('')}</div>`);
  PS.pages.clients = () => PS.shell('clients', [['咨询客户', '#clients']], `<div class="ph"><div><h1>咨询客户 CRM</h1></div></div><section class="card pad-0"><table class="tbl"><thead><tr><th>姓名</th><th>方向</th><th>阶段</th><th>来源</th><th class="n">金额</th></tr></thead><tbody>${PS.S.clients.map(c => `<tr><td><b>${PS.esc(c.name)}</b></td><td>${PS.esc(c.niche)}</td><td><span class="pill good">${c.stage}</span></td><td>${PS.esc(c.source)}</td><td class="n">${c.amount ? '¥' + PS.fmt(c.amount) : '–'}</td></tr>`).join('')}</tbody></table></section>`);
  PS.pages.site = () => PS.shell('site', [['个人网站', '#site']], `<div class="ph"><div><h1>个人网站</h1></div></div><div class="card"><b>${PS.esc(PS.S.settings.siteName)}</b> · <span class="mono sub">${PS.esc(PS.S.settings.siteUrl)}</span></div>`);
  PS.pages.position = () => PS.shell('position', [['我的定位', '#position']], `<div class="ph"><div><h1>我的定位</h1></div></div><div class="card stack"><p class="m0"><b>你是谁：</b>${PS.esc(PS.S.positioning.who)}</p><p class="m0"><b>怎么赚钱：</b>${PS.esc(PS.S.positioning.money)}</p></div>`);
  PS.pages.settings = function (tab = 'platforms') {
    const cur = ['platforms', 'ai', 'modules'].includes(tab) ? tab : 'platforms';
    const body = cur === 'platforms' ? `<div class="card pad-0"><table class="tbl"><thead><tr><th>平台</th><th>策略</th><th>状态</th><th>启用</th></tr></thead><tbody>${PS.PLAT_ORDER.map(pid => { const p = PS.PLATFORMS[pid], st = PS.S.platformStatus[pid]; return `<tr><td><span class="plat-tag">${PS.plogo(pid, 20)}${p.name}</span></td><td>${p.mode === 'manual' ? '只填不点发' : '校验提交'}</td><td><span class="pill ${st.state === 'ok' ? 'good' : 'wait'}">${PS.esc(st.detail)}</span></td><td><button class="switch ${st.disabled ? '' : 'on'}" data-p="${pid}"></button></td></tr>`; }).join('')}</tbody></table></div>`
      : cur === 'ai' ? `<div class="card stack"><b>当前本地 AI：${PS.S.settings.aiBackend}</b><span class="sub">Obsidian：${PS.esc(PS.S.settings.obsidianPath)}</span></div>`
      : `<div class="card stack"><button class="btn danger" onclick="PS.resetDemo()">重置 v1 演示数据</button></div>`;
    const main = PS.shell('settings', [['设置与平台', '#settings']], `<div class="ph"><div><h1>设置与平台</h1></div><div class="acts"><div class="seg"><button class="${cur === 'platforms' ? 'on' : ''}" onclick="location.hash='#settings/platforms'">7 平台</button><button class="${cur === 'ai' ? 'on' : ''}" onclick="location.hash='#settings/ai'">本地 AI</button><button class="${cur === 'modules' ? 'on' : ''}" onclick="location.hash='#settings/modules'">重置</button></div></div></div>${body}`);
    main.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const p = b.dataset.p; PS.S.platformStatus[p].disabled = !PS.S.platformStatus[p].disabled; PS.save(); PS.pages.settings('platforms'); });
  };
})();
