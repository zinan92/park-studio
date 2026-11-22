/* 选题工作台（日报·对标 / 爆款榜 / 拆解报告 / 选题池 / 写稿骨架 / 审稿改写 / 定稿） + 剪辑工作台（待剪 / 剪辑中 3 步镜头表 Spec Table / 剪好了） */
(function () {
  'use strict';
  const PS = window.PS;

  // ==================== 选题 · 找：日报 · 对标（#source） ====================
  let srcTab = 'newsletter', srcIdx = 0;

  PS.pages.source = function (sub) {
    if (['newsletter', 'saved', 'dev', 'bench', 'obsidian', 'materials', 'kline'].includes(sub)) { srcTab = sub; srcIdx = 0; }
    let body = '';

    if (['newsletter', 'saved', 'dev'].includes(srcTab)) {
      const list = PS.S.sources[srcTab] || [];
      const cur = list[srcIdx] || list[0];
      body = `<div class="two-col">
        <div class="list-col">
          ${list.map((it, i) => `<button class="list-item ${i === srcIdx ? 'on' : ''}" data-si="${i}">
            <div class="row" style="gap:6px"><span class="sub" style="font-size:11.5px">${PS.esc(it.date)}</span></div>
            <b style="font-size:13.5px">${PS.esc(it.title)}</b>
          </button>`).join('')}
        </div>
        <div class="card stack">
          ${cur ? `
            <div class="row"><span class="pill accent">${PS.esc(cur.tag)}</span><span class="sub">${PS.esc(cur.date)}</span><span class="grow"></span><button class="btn primary s" id="addTopicBtn">+ 加入选题</button></div>
            <h2 class="m0" style="font-size:19px">${PS.esc(cur.title)}</h2>
            <p class="m0" style="font-size:14.5px;line-height:1.85;color:var(--ink-2)">${PS.esc(cur.body)}</p>
          ` : '<p class="sub">暂无内容</p>'}
        </div>
      </div>`;
    } else if (srcTab === 'bench') {
      return PS.pages.feed();
    } else if (srcTab === 'obsidian') {
      body = `<div class="card stack">
        <div class="row"><span class="pill good">Obsidian 只读同步</span><span class="mono sub">${PS.esc(PS.S.settings.obsidianPath)}</span></div>
        ${PS.S.obsidianNotes.map(n => `<div class="row" style="padding:12px 14px;border-radius:10px;background:var(--sunk)">
          <div class="min0 grow"><b class="mono" style="font-size:13px">${PS.esc(n.file)}</b><div class="sub" style="margin-top:3px">${PS.esc(n.excerpt)}</div></div>
          <button class="btn primary s" data-ob="${n.id}">+ 加入选题</button>
        </div>`).join('')}
      </div>`;
    } else if (srcTab === 'materials') {
      body = `<div class="grid-3">${PS.S.sources.materials.map(m => `<div class="card stack tight">
        <span class="pill info" style="width:fit-content">${PS.esc(m.cat)}</span>
        <b>${PS.esc(m.title)}</b><span class="sub">${PS.esc(m.hint)}</span>
        <button class="btn s" style="width:fit-content;margin-top:4px" onclick="PS.toast('已复制提示词模板','good')">复制模板</button>
      </div>`).join('')}</div>`;
    } else {
      body = `<div class="grid-3">${PS.S.sources.kline.map(k => `<div class="card stack tight">
        <div class="row"><b>${k.sym}</b><span class="grow"></span><span class="pill ${k.chg.startsWith('+') ? 'good' : 'warn'}">${k.chg}</span></div>
        <div class="kpi-val" style="font-size:22px">${k.price}</div>
        <span class="sub">${k.note}</span>
      </div>`).join('')}</div>`;
    }

    const main = PS.shell('source', [['选题工作台', '#source'], ['找 · 日报与对标', '#source']], `
      <div class="ph">
        <div>
          <h1>找 · 日报与对标</h1>
          <p>每天打开先看一眼今天发生了什么、对标哪条火了，或直接从 Obsidian 笔记库挑一条加入选题池。</p>
        </div>
        <div class="acts">
          <div class="seg">
            <button class="${srcTab === 'newsletter' ? 'on' : ''}" onclick="location.hash='#source/newsletter'">AI 日报 ${PS.S.sources.newsletter.length}</button>
            <button class="${srcTab === 'saved' ? 'on' : ''}" onclick="location.hash='#source/saved'">搞钱 ${PS.S.sources.saved.length}</button>
            <button class="${srcTab === 'dev' ? 'on' : ''}" onclick="location.hash='#source/dev'">开发日报</button>
            <button onclick="location.hash='#feed'">对标发了什么</button>
            <button class="${srcTab === 'obsidian' ? 'on' : ''}" onclick="location.hash='#source/obsidian'">Obsidian</button>
          </div>
        </div>
      </div>
      ${body}
    `);

    main.querySelectorAll('[data-si]').forEach(b => b.onclick = () => { srcIdx = +b.dataset.si; PS.pages.source(); });
    main.querySelector('#addTopicBtn')?.addEventListener('click', () => {
      const it = PS.S.sources[srcTab][srcIdx];
      PS.S.topics.unshift({ id: Date.now(), title: it.title, stage: '写', score: 14, updated: '刚刚', trash: false });
      PS.save();
      PS.toast('已加入「选题池」', 'good');
    });
    main.querySelectorAll('[data-ob]').forEach(b => b.onclick = () => {
      const n = PS.S.obsidianNotes.find(x => x.id === b.dataset.ob);
      PS.S.topics.unshift({ id: Date.now(), title: n.file.split('/').pop().replace(/\.md$/, ''), stage: '写', score: 14, updated: '刚刚', trash: false });
      PS.save();
      PS.toast('Obsidian 笔记已加入「选题池」', 'good');
    });
  };

  // ==================== 选题 · 爆款榜（#feed） & 拆解报告（#chai） ====================
  let feedScope = 'shared'; // shared | mine

  PS.pages.feed = function () {
    const sharedOn = PS.S.settings.sharedBenchmarkOptIn;
    const main = PS.shell('feed', [['选题工作台', '#source'], ['对标爆款榜', '#feed']], `
      <div class="ph">
        <div>
          <h1>对标发了什么</h1>
          <p>按「高于平时中位数几倍」排序，点「拆」用本机 Coding Agent 零 API 费拆解。</p>
        </div>
        <div class="acts">
          <div class="seg">
            <button class="${feedScope === 'shared' ? 'on' : ''}" id="fsShared">共享对标库（${PS.S.settings.sharedBenchmarkCount} 号）</button>
            <button class="${feedScope === 'mine' ? 'on' : ''}" id="fsMine">我盯的号</button>
            <button onclick="location.hash='#chai'">拆过的（${PS.S.reports.length}）</button>
          </div>
          <a class="btn" href="#source">回日报</a>
        </div>
      </div>

      ${feedScope === 'shared' ? `<div class="card row" style="padding:11px 16px;background:color-mix(in srgb,var(--accent-soft) 35%,var(--surface))">
        <span class="pill ${sharedOn ? 'good' : 'wait'}">${sharedOn ? '已加入社区共享池' : '未开启贡献'}</span>
        <span class="sub grow">由 Park 社区用户用各自本机流量自愿共享的<b>公开爆款元数据</b>（绝不上传 Cookie 或私密数据）· 你的本机已贡献 ${PS.S.settings.sharedContributed} 条</span>
        <a class="link-muted" href="#settings">去系统页管理开关 ›</a>
      </div>` : ''}

      <div class="stack">
        ${PS.S.feed.map(f => `<div class="feed-card">
          <div class="feed-mult"><b>${f.multiple}×</b><small>平时 ${PS.fmt(f.median)}</small></div>
          <div class="min0 stack tight">
            <div class="row" style="gap:7px">${PS.plogo(f.platform, 18)}<b>${PS.esc(f.author)}</b><span class="sub">赞 ${PS.fmt(f.likes)} · ${PS.esc(f.ago)}</span></div>
            <div style="font-size:15px;font-weight:700">${PS.esc(f.title)}</div>
            <div class="callout-warm"><b>为什么火：</b>${PS.esc(f.why)}<br><b>可以怎么讲：</b>${PS.esc(f.angle)}</div>
          </div>
          <div class="stack tight">
            <button class="btn primary s" data-tear="${f.id}">拆</button>
            <button class="btn s" data-add="${f.id}">+ 进选题池</button>
          </div>
        </div>`).join('')}
      </div>
    `, 'mid');

    main.querySelector('#fsShared')?.addEventListener('click', () => { feedScope = 'shared'; PS.pages.feed(); });
    main.querySelector('#fsMine')?.addEventListener('click', () => { feedScope = 'mine'; PS.pages.feed(); });
    main.querySelectorAll('[data-tear]').forEach(b => b.onclick = () => {
      PS.toast('本机 Coding Agent 已拆解完成', 'good');
      location.hash = '#chai';
    });
    main.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const f = PS.S.feed.find(x => x.id === +b.dataset.add);
      PS.S.topics.unshift({ id: Date.now(), title: f.title, stage: '写', score: 14, updated: '刚刚', trash: false });
      PS.save();
      PS.toast('已放进「选题池」', 'good');
    });
  };

  PS.pages.chai = function () {
    const r = PS.S.reports[0];
    const main = PS.shell('chai', [['选题工作台', '#source'], ['对标爆款榜', '#feed'], ['拆解报告', '#chai']], `
      <div class="ph">
        <div>
          <h1>${PS.esc(r.sourceTitle)}</h1>
          <p>${PS.esc(r.author)} · 本地转写 + Coding Agent 拆解</p>
        </div>
        <div class="acts">
          <a class="btn" href="#feed">回爆款榜</a>
          <button class="btn primary" onclick="location.hash='#write'">用这篇结构写稿 ›</button>
        </div>
      </div>

      <div class="grid-3">
        <div class="kpi-card"><div class="kpi-lab">点赞</div><div class="kpi-val">${PS.fmt(r.likes)}</div></div>
        <div class="kpi-card"><div class="kpi-lab">平时中位数</div><div class="kpi-val">${PS.fmt(r.median)}</div></div>
        <div class="kpi-card"><div class="kpi-lab">高于平时</div><div class="kpi-val" style="color:var(--accent)">${r.multiple}×</div></div>
      </div>

      <div class="card stack">
        <h3 class="m0">结构与主线</h3>
        <div class="callout-warm"><b>主线：</b>${PS.esc(r.mainLine)}<br><b>开头怎么抓人：</b>${PS.esc(r.hook)}</div>
        <ul class="m0" style="padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:13.5px">
          ${r.motives.map(m => `<li>${PS.esc(m)}</li>`).join('')}
        </ul>
      </div>

      <div class="card stack">
        <h3 class="m0">可选复刻角度</h3>
        ${r.angles.map(a => `<div class="row" style="padding:10px 12px;background:var(--sunk);border-radius:9px">
          <div class="min0 grow"><b>${PS.esc(a.title)}</b><div class="sub">${PS.esc(a.fit)}</div></div>
          <a class="btn primary s" href="#write">写这个 ›</a>
        </div>`).join('')}
      </div>
    `, 'narrow');
  };

  // ==================== 选题 · 写：选题池（#pool） → 骨架/写稿（#write） → 审稿（#audit） ====================
  PS.pages.pool = function () {
    const alive = PS.S.topics.filter(t => !t.trash);
    const trashed = PS.S.topics.filter(t => t.trash);

    const main = PS.shell('pool', [['选题工作台', '#source'], ['选题池', '#pool']], `
      <div class="ph">
        <div>
          <h1>选题池</h1>
          <p>挑好要讲的题都放这里，点进去走「骨架 → 写稿 → 审稿 → 定稿」。</p>
        </div>
      </div>

      <div class="card">
        <form class="row" id="quickAdd">
          <input type="text" id="qaInput" class="grow" placeholder="自己有个题？写一句题目直接加进去…">
          <button class="btn primary" type="submit">+ 加进去</button>
        </form>
      </div>

      <div class="stack tight">
        ${alive.map(t => `<div class="card row" style="padding:13px 16px">
          <div class="min0 grow">
            <b style="font-size:14.5px">${PS.esc(t.title)}</b>
            <div class="sub" style="margin-top:2px">停在「${t.stage}」 · 选题分 ${t.score}/15 · ${PS.esc(t.updated)}</div>
          </div>
          <a class="btn primary s" href="#write">写骨架 / 出稿 ›</a>
          <button class="btn ghost s" data-trash="${t.id}">${PS.icon('trash', 'sm')}</button>
        </div>`).join('')}
      </div>

      ${trashed.length ? `<details class="sub"><summary>回收站（${trashed.length} 条，保留 30 天）</summary>
        <div class="stack tight" style="margin-top:8px">${trashed.map(t => `<div class="row card" style="padding:10px 14px"><span class="grow">${PS.esc(t.title)}</span><button class="btn s" data-res="${t.id}">恢复</button></div>`).join('')}</div>
      </details>` : ''}
    `, 'narrow');

    main.querySelector('#quickAdd').onsubmit = e => {
      e.preventDefault();
      const v = main.querySelector('#qaInput').value.trim();
      if (!v) return;
      PS.S.topics.unshift({ id: Date.now(), title: v, stage: '写', score: 13, updated: '刚刚', trash: false });
      PS.save();
      PS.toast('已加入选题池', 'good');
      PS.pages.pool();
    };
    main.querySelectorAll('[data-trash]').forEach(b => b.onclick = () => { const h = PS.S.topics.find(x => x.id === +b.dataset.trash); if (h) h.trash = true; PS.save(); PS.pages.pool(); });
    main.querySelectorAll('[data-res]').forEach(b => b.onclick = () => { const h = PS.S.topics.find(x => x.id === +b.dataset.res); if (h) h.trash = false; PS.save(); PS.pages.pool(); });
  };

  PS.pages.write = function () {
    const sc = PS.S.script;
    const cp = PS.S.cutProject;
    const chars = sc.body.replace(/\s/g, '').length;

    const main = PS.shell('write', [['选题工作台', '#source'], ['选题池', '#pool'], ['骨架与写稿', '#write']], `
      <div class="ph">
        <div>
          <h1>骨架与口播稿</h1>
          <p>${chars} 字 · 预计口播 ${Math.max(1, Math.round(chars / 250))} 分钟 · 由本机 ${PS.S.settings.aiBackend === 'claude' ? 'Claude Code' : 'Codex'} 辅助。</p>
        </div>
        <div class="acts">
          <button class="btn" id="openSaid">插入「我说过的话」</button>
          <a class="btn primary" href="#audit">去审稿 ›</a>
        </div>
      </div>

      <div class="card stack">
        <b style="font-size:14px">① 挑一个开头钩子（单选）</b>
        <div class="stack tight">
          ${cp.hooks.map((h, i) => `<label class="hook-opt ${cp.pickedHook === i ? 'on' : ''}">
            <input type="radio" name="hk" value="${i}" ${cp.pickedHook === i ? 'checked' : ''}>
            <span style="font-size:13.5px">${PS.esc(h)}</span>
          </label>`).join('')}
        </div>
      </div>

      <div class="card stack">
        <div class="row">
          <b style="font-size:14px">② 口播全文</b>
          <span class="grow"></span>
          <button class="link-muted" id="openPrompter">打开提词器</button>
        </div>
        <input type="text" id="scTitle" value="${PS.esc(sc.title)}" style="font-weight:700">
        <textarea class="script-ed" id="scBody">${PS.esc(sc.body)}</textarea>
        <div class="row">
          <button class="btn" id="saveSc">保存草稿</button>
          <span class="grow"></span>
          <a class="btn primary" href="#audit">去审稿（三路诊断） ›</a>
        </div>
      </div>
    `, 'narrow');

    main.querySelectorAll('input[name="hk"]').forEach(r => r.onchange = () => {
      cp.pickedHook = +r.value;
      PS.save();
      PS.pages.write();
    });
    main.querySelector('#saveSc').onclick = () => {
      sc.title = main.querySelector('#scTitle').value.trim();
      sc.body = main.querySelector('#scBody').value;
      PS.save();
      PS.toast('草稿已保存', 'good');
    };
    main.querySelector('#openSaid').onclick = () => {
      PS.modal({
        title: '从「我说过的话」挑一句真话插进去',
        body: `<div class="stack tight">${PS.S.said.filter(x => !x.muted).map(x => `<div class="row" style="padding:10px 12px;background:var(--sunk);border-radius:9px"><span class="grow">${PS.esc(x.text)}</span><button class="btn primary s" data-ins="${x.id}">插入</button></div>`).join('')}</div>`,
        onOpen(m, close) {
          m.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => {
            const it = PS.S.said.find(x => x.id === +b.dataset.ins);
            sc.body = sc.body.trim() + '\n\n' + it.text;
            PS.save();
            close();
            PS.toast('已插入口播稿', 'good');
            PS.pages.write();
          });
        },
      });
    };
    main.querySelector('#openPrompter').onclick = () => {
      PS.modal({
        title: '全屏提词器', wide: true,
        body: `<div class="prompter-screen">${PS.esc(sc.body).replace(/\n/g, '<br><br>')}</div>`,
        foot: `<button class="btn primary" data-close>关闭</button>`,
      });
    };
  };

  PS.pages.audit = function () {
    const au = PS.S.script.audit;
    const tagCls = { '新': 'tag-new', '改': 'tag-edit', '待填': 'tag-todo' };
    const main = PS.shell('audit', [['选题工作台', '#source'], ['选题池', '#pool'], ['审稿 · 改写', '#audit']], `
      <div class="ph">
        <div>
          <h1>改写 · 审稿单</h1>
          <p>这一步用的方法：三路并行诊断（价值 · 共鸣 · 节奏 dbs-script-flow）</p>
        </div>
        <div class="acts">
          <a class="btn" href="#write">自己改</a>
          <button class="btn primary" id="acceptAll">一键接受</button>
        </div>
      </div>

      <div class="card stack tight">
        <div class="callout-warm">
          <b>价值：</b>${PS.esc(au.value)}<br>
          <b>共鸣：</b>${PS.esc(au.resonance)}<br>
          <b>节奏：</b>${PS.esc(au.rhythm)}
        </div>
      </div>

      <div class="card stack">
        ${au.revised.map(p => `<div style="line-height:1.85;font-size:14.5px;padding:8px 12px;border-radius:8px;background:${p.tag === '待填' ? 'var(--hot-soft)' : 'transparent'}">
          ${p.tag !== '留' ? `<span class="${tagCls[p.tag]}">【${p.tag}】</span>` : ''}${PS.esc(p.text)}
        </div>`).join('')}
      </div>

      <div class="row">
        <a class="link-muted" href="#write">‹ 回到骨架</a>
        <span class="grow"></span>
        <button class="btn primary" id="finalizeBtn">稿子定了 → 进定稿与剪辑台 ›</button>
      </div>
    `, 'narrow');

    main.querySelector('#acceptAll').onclick = () => {
      PS.S.script.body = au.revised.map(p => p.text).join('\n\n');
      PS.save();
      PS.toast('已采用改写版本', 'good');
    };
    main.querySelector('#finalizeBtn').onclick = () => {
      const ep42 = PS.S.episodes.find(e => e.episode === 42);
      if (ep42) ep42.finalAt = '今天';
      PS.save();
      PS.toast('稿子已定稿！可直接进入「剪辑」工作台出镜头表', 'good');
      location.hash = '#done/105';
    };
  };

  // ==================== 选题 · 定：定稿网格（#scripts） & 定稿详情（#done） ====================
  PS.pages.scripts = function () {
    const main = PS.shell('scripts', [['选题工作台', '#source'], ['定稿', '#scripts']], `
      <div class="ph">
        <div>
          <h1>定稿</h1>
          <p>定好稿的每一篇都在这里，点开就能照着提词器拍，或者直接送进「剪辑工作台」。</p>
        </div>
      </div>
      <div class="grid-3">
        ${PS.S.episodes.map(e => `<a class="card stack tight" href="#done/${e.id}" style="color:var(--ink);text-decoration:none">
          <div class="row"><span class="pill good">定稿了</span><span class="sub">EP${e.episode}</span><span class="grow"></span><span class="sub">${PS.esc(e.finalAt || '今天')}</span></div>
          <b class="clip2" style="font-size:15px">${PS.esc(e.title)}</b>
          <span class="sub">${e.chars} 字 · 约 ${Math.round(e.durationSec / 60)} 分钟</span>
        </a>`).join('')}
      </div>
    `, 'mid');
  };

  PS.pages.done = function (id) {
    const ep = PS.S.episodes.find(e => e.id === +(id || 105)) || PS.S.episodes[0];
    const main = PS.shell('done', [['选题工作台', '#source'], ['定稿', '#scripts'], [`EP${ep.episode}`, `#done/${ep.id}`]], `
      <div class="ph">
        <div>
          <span class="pill good" style="margin-bottom:6px">定稿了 · EP${ep.episode}</span>
          <h1>${PS.esc(ep.title)}</h1>
        </div>
        <div class="acts">
          <button class="btn" id="copyFull">复制全文</button>
          <button class="btn" id="openTp">提词器</button>
        </div>
      </div>

      <div class="card" style="line-height:1.9;font-size:15px;white-space:pre-wrap">${PS.esc(PS.S.script.body)}</div>

      <div class="row">
        <a class="link-muted" href="#audit">还要改？回审稿页</a>
        <span class="grow"></span>
        <a class="btn" href="#scripts">回定稿列表</a>
        <a class="btn primary" href="#cut">去剪辑台（出镜头表） ›</a>
      </div>
    `, 'narrow');

    main.querySelector('#copyFull').onclick = () => { navigator.clipboard?.writeText(PS.S.script.body); PS.toast('已复制口播稿全文', 'good'); };
    main.querySelector('#openTp').onclick = () => {
      PS.modal({ title: '全屏提词器', wide: true, body: `<div class="prompter-screen">${PS.esc(PS.S.script.body).replace(/\n/g, '<br><br>')}</div>`, foot: `<button class="btn primary" data-close>关闭</button>` });
    };
  };

  // ==================== 剪辑工作台：待剪 / 剪辑中（3 步：Hook → 动效镜头表 Spec Table → 交给 Agent）/ 剪好了 ====================
  let cutStep = 'motion'; // hook | motion | hand

  PS.pages['cut-todo'] = function () {
    PS.shell('cut-todo', [['剪辑工作台', '#cut'], ['待剪', '#cut-todo']], `
      <div class="ph"><div><h1>待剪</h1><p>已定稿、待选 Hook 与排镜头表（Spec Table）的内容。</p></div></div>
      <div class="card row">
        <div class="min0 grow"><b>EP42 · ${PS.esc(PS.S.cutProject.title)}</b><div class="sub">原片：${PS.esc(PS.S.cutProject.sourceFile)} · ${PS.S.cutProject.duration}</div></div>
        <a class="btn primary s" href="#cut">进入剪辑台 ›</a>
      </div>
    `, 'mid');
  };

  PS.pages.cut = function (sub) {
    if (['hook', 'motion', 'hand'].includes(sub)) cutStep = sub;
    const cp = PS.S.cutProject;
    let body = '';

    if (cutStep === 'hook') {
      body = `<div class="card stack">
        <div class="row"><b>勾选放在成片最前面的 1–2 句原话（Hook）</b><span class="sub">原话不改写，在正文原位置照常保留</span></div>
        <div class="stack tight">
          ${cp.lines.map(l => {
            const on = cp.hookIdx.includes(l.i);
            return `<div class="tx-line ${on ? 'hook' : ''}" data-hk="${l.i}">
              <span class="mono sub" style="margin-right:8px">${l.ts}</span>
              ${on ? '<span class="pill accent" style="margin-right:6px">Hook</span>' : ''}
              ${PS.esc(l.text)}
            </div>`;
          }).join('')}
        </div>
        <div class="row"><span class="sub">已选 ${cp.hookIdx.length} 句作为开头 Hook</span><span class="grow"></span><button class="btn primary" id="toMotion">下一步：动效与镜头表 ›</button></div>
      </div>`;
    } else if (cutStep === 'motion') {
      body = `
        <div class="card row" style="padding:12px 16px">
          <span class="mono" style="font-size:13px">${PS.esc(cp.sourceFile)}</span>
          <span class="sub">${cp.duration}</span>
          <span class="grow"></span>
          <span class="sub">动效密度：</span>
          <div class="seg">
            ${['低', '中', '高'].map(lv => `<button class="${cp.density === lv ? 'on' : ''}" data-den="${lv}">${lv}</button>`).join('')}
          </div>
          <button class="btn s" id="replanBtn">${PS.icon('refresh', 'sm')}AI 重新排镜头表</button>
        </div>

        <div class="cut-split">
          <div class="card stack tight">
            <div class="card-h"><h3>口播逐字稿（点击序号定位右侧镜头卡）</h3></div>
            ${cp.lines.map(l => `<div class="tx-line ${cp.hookIdx.includes(l.i) ? 'hook' : ''} ${cp.selectedShot === l.shot ? 'sel' : ''}" data-pick-shot="${l.shot}">
              <span class="shot-chip ${cp.selectedShot === l.shot ? 'on' : ''}">${l.shot}</span>
              <span class="mono sub" style="margin-right:6px">${l.ts}</span>
              ${PS.esc(l.text)}
            </div>`).join('')}
          </div>

          <div class="stack tight">
            ${cp.shots.map(s => `<div class="spec-card ${cp.selectedShot === s.id ? 'on' : ''}" data-pick-shot="${s.id}">
              <div class="row">
                <span class="shot-chip ${cp.selectedShot === s.id ? 'on' : ''}">${s.id}</span>
                <b>${PS.esc(s.style)}</b>
                <span class="sub mono">${s.ts}</span>
                <span class="grow"></span>
                <button class="btn s" data-swap="${s.id}">换一个</button>
              </div>
              <div class="spec-prev"><span>${PS.esc(s.preview)}</span><span style="opacity:.55;font-size:11px">SPEC #${s.id}</span></div>
              <textarea rows="2" data-reason="${s.id}" style="font-size:12.5px">${PS.esc(s.reason)}</textarea>
            </div>`).join('')}
            <div class="row" style="margin-top:6px"><span class="grow"></span><button class="btn primary" id="toHand">下一步：交给本地 Agent 渲染 ›</button></div>
          </div>
        </div>
      `;
    } else {
      const promptTxt = `按 ~/.park-studio/projects/EP${cp.episode}/worktable.json 里的 Hook（第 ${cp.hookIdx.join('、')} 句）和 ${cp.shots.length} 个动效镜头表，用 park-video-v2 剪辑 ${cp.sourceFile}（${cp.burnSubs ? '烧字幕' : '不烧字幕'}），出成片后回填到 Park Studio。`;
      body = `<div class="stack" style="max-width:740px;margin:0 auto">
        <div class="card stack">
          <div class="row"><b>交给本机 Agent 渲染（不上传视频到任何服务器）</b><span class="grow"></span>
            <div class="seg">
              <button class="${cp.burnSubs ? 'on' : ''}" data-sub="1">烧字幕</button>
              <button class="${!cp.burnSubs ? 'on' : ''}" data-sub="0">不烧字幕</button>
            </div>
          </div>
          <ul class="m0 sub" style="padding-left:18px;line-height:1.8">
            <li>前置 Hook：已选 ${cp.hookIdx.length} 句原话</li>
            <li>镜头表（Spec Table）：共 ${cp.shots.length} 处动效（密度：${cp.density}）</li>
            <li>自动校验输出 faststart，确保抖音/小红书一次传过</li>
          </ul>
          <pre class="codebox">${PS.esc(promptTxt)}</pre>
          <div class="row">
            <button class="btn primary" id="copyPrompt">${PS.icon('copy', 'sm')}复制指令给 Claude / Codex</button>
            <button class="link-muted" id="dlSpec">查看 / 下载 worktable.json</button>
          </div>
        </div>

        <div class="card row">
          <div class="min0 grow"><b>本地渲染完后，标记「剪好了」</b><div class="sub">成片自动进入「发布工作台」，生成 7 平台发布工程</div></div>
          <button class="btn good" id="markCutDone">${PS.icon('check', 'sm')}剪好了 → 去发布工作台</button>
        </div>
      </div>`;
    }

    const main = PS.shell('cut', [['剪辑工作台', '#cut'], [`EP${cp.episode} · 镜头表`, '#cut']], `
      <div class="ph">
        <div>
          <h1>剪辑 · EP${cp.episode} ${PS.esc(cp.title)}</h1>
          <p>三步走完剪辑：先定 Hook，再调镜头表（Spec Table），最后导出 worktable.json 交给本机 Agent 渲染。</p>
        </div>
        <div class="acts">
          <div class="stepper">
            <button class="step-btn ${cutStep === 'hook' ? 'on' : ''}" data-cs="hook"><i>1</i>Hook</button>
            <button class="step-btn ${cutStep === 'motion' ? 'on' : ''}" data-cs="motion"><i>2</i>动效 · 镜头表</button>
            <button class="step-btn ${cutStep === 'hand' ? 'on' : ''}" data-cs="hand"><i>3</i>交给 agent</button>
          </div>
        </div>
      </div>
      ${body}
    `);

    main.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { cutStep = b.dataset.cs; PS.pages.cut(); });
    main.querySelectorAll('[data-hk]').forEach(el => el.onclick = () => {
      const i = +el.dataset.hk;
      cp.hookIdx = cp.hookIdx.includes(i) ? cp.hookIdx.filter(x => x !== i) : [...cp.hookIdx, i].sort();
      PS.save();
      PS.pages.cut();
    });
    main.querySelector('#toMotion')?.addEventListener('click', () => { cutStep = 'motion'; PS.pages.cut(); });
    main.querySelector('#toHand')?.addEventListener('click', () => { cutStep = 'hand'; PS.pages.cut(); });
    main.querySelectorAll('[data-den]').forEach(b => b.onclick = () => { cp.density = b.dataset.den; PS.save(); PS.toast(`动效密度已切为「${cp.density}」`); PS.pages.cut(); });
    main.querySelector('#replanBtn')?.addEventListener('click', () => PS.toast('本机 Agent 已按最新密度刷新 6 个镜头规格', 'good'));
    main.querySelectorAll('[data-pick-shot]').forEach(el => el.onclick = e => {
      if (e.target.closest('button,textarea')) return;
      cp.selectedShot = +el.dataset.pickShot;
      PS.pages.cut();
    });
    main.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
      const s = cp.shots.find(x => x.id === +b.dataset.swap);
      const styles = ['画中画 · 居中大字弹出', '数据高亮卡（焦橙冲击）', '左右分屏对比动效', '关键词阶梯浮现'];
      s.style = styles[(styles.indexOf(s.style) + 1) % styles.length];
      PS.save();
      PS.toast(`镜头 #${s.id} 已切换为「${s.style}」`, 'good');
      PS.pages.cut();
    });
    main.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { cp.burnSubs = b.dataset.sub === '1'; PS.save(); PS.pages.cut(); });
    main.querySelector('#copyPrompt')?.addEventListener('click', () => PS.toast('已复制渲染指令，贴给本机 Claude/Codex 即可自动出片', 'good'));
    main.querySelector('#dlSpec')?.addEventListener('click', () => {
      PS.modal({
        title: `worktable.json（EP${cp.episode} 剪辑规格表）`, wide: true,
        body: `<pre class="codebox">${PS.esc(JSON.stringify({ episode: cp.episode, source: cp.sourceFile, burnSubtitles: cp.burnSubs, hooks: cp.hookIdx, shots: cp.shots }, null, 2))}</pre>`,
        foot: `<button class="btn primary" data-close>关闭</button>`,
      });
    });
    main.querySelector('#markCutDone')?.addEventListener('click', () => {
      const ep42 = PS.S.episodes.find(e => e.episode === 42);
      if (ep42) { ep42.videoName = 'EP42-ParkStudio开源发布-成片.mp4'; ep42.videoSizeMb = 388; }
      PS.save();
      PS.toast('EP42 成片已登记！正在进入「发布工作台」', 'good');
      location.hash = '#pub-pack';
    });
  };

  PS.pages['cut-done'] = function () {
    PS.shell('cut-done', [['剪辑工作台', '#cut'], ['剪好了', '#cut-done']], `
      <div class="ph"><div><h1>剪好了</h1><p>已完成本地剪辑的成片，点击直接进入发布工作台。</p></div></div>
      <div class="stack tight">
        ${PS.S.episodes.filter(e => e.videoName).map(e => `<div class="card row" style="padding:13px 16px">
          <div class="min0 grow"><b>EP${e.episode} · ${PS.esc(e.nick)}</b><div class="sub mono">${PS.esc(e.videoName)} · ${e.videoSizeMb} MB</div></div>
          <a class="btn primary s" href="#pub-confirm">去发布工作台 ›</a>
        </div>`).join('')}
      </div>
    `, 'mid');
  };
})();
