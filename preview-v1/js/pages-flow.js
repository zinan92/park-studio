/* v1 写一条四步：找 / 拆 / 写 / 审 */
(function () {
  'use strict';
  const PS = window.PS;
  PS.pages.feed = function (tab = 'viral') {
    const cur = ['viral', 'obsidian', 'link'].includes(tab) ? tab : 'viral';
    let body = '';
    if (cur === 'viral') body = `<div class="stack">${PS.S.feed.map(f => `<div class="feed-card"><div class="feed-mult"><b>${f.multiple}×</b><small>高于平时</small></div><div class="min0 stack tight"><div class="row" style="gap:8px">${PS.plogo(f.platform, 20)}<b>${PS.esc(f.author)}</b><span class="sub">点赞 ${PS.fmt(f.likes)} · ${PS.esc(f.ago)}</span></div><div style="font-size:15.5px;font-weight:700">${PS.esc(f.title)}</div><div class="sub"><b>为什么火：</b>${PS.esc(f.why)}</div><div class="sub"><b style="color:var(--accent)">可以怎么讲：</b>${PS.esc(f.angle)}</div></div><div class="stack tight"><a class="btn primary s" href="#chai">拆这条</a></div></div>`).join('')}</div>`;
    else if (cur === 'obsidian') body = `<div class="card stack">${PS.S.obsidianNotes.map(n => `<div class="card" style="background:var(--sunk);padding:14px"><div class="row"><b class="mono">${PS.esc(n.file)}</b><span class="grow"></span><a class="btn primary s" href="#write">转口播稿 ›</a></div><p class="sub m0" style="margin-top:6px">${PS.esc(n.excerpt)}</p></div>`).join('')}</div>`;
    else body = `<div class="card stack" style="max-width:740px"><h3 class="m0">贴单链本地拆解（零 API 费）</h3><div class="row"><input type="url" class="grow" placeholder="https://..."><a class="btn primary" href="#chai">开始拆解</a></div></div>`;
    PS.shell('feed', [['写一条', '#feed'], ['找 · 爆款榜', '#feed']], `<div class="ph"><div><h1>找 · 爆款与本地素材</h1></div><div class="acts"><div class="seg"><button class="${cur === 'viral' ? 'on' : ''}" onclick="location.hash='#feed/viral'">对标爆款流</button><button class="${cur === 'obsidian' ? 'on' : ''}" onclick="location.hash='#feed/obsidian'">Obsidian 笔记库</button><button class="${cur === 'link' ? 'on' : ''}" onclick="location.hash='#feed/link'">贴链接拆</button></div></div></div>${body}`);
  };
  PS.pages.chai = function () {
    const r = PS.S.reports[0];
    PS.shell('chai', [['写一条', '#feed'], ['拆 · 拆解报告', '#chai']], `
      <div class="ph"><div><h1>拆 · 左右对照拆解报告</h1></div><div class="acts"><a class="btn primary" href="#write">去写稿 ›</a></div></div>
      <section class="cmp-split">
        <div class="cmp-give"><p class="cmp-lab">你给的 · 原作品</p><div class="row">${PS.plogo(r.platform, 20)}<b>${PS.esc(r.author)}</b></div><h3 class="m0">${PS.esc(r.sourceTitle)}</h3><p class="sub m0">${PS.esc(r.sourceExcerpt)}</p></div>
        <div class="cmp-arrow">→</div>
        <div class="cmp-get"><p class="cmp-lab">拿到的 · 拆解结论</p><div class="big3"><div><span class="sub">点赞</span><b>${PS.fmt(r.likes)}</b></div><div><span class="sub">平时中位数</span><b>${PS.fmt(r.median)}</b></div><div><span class="sub">高于平时</span><b class="hot">${r.multiple}×</b></div></div><div class="card" style="background:var(--sunk)"><b>主线：</b>${PS.esc(r.mainLine)}<div class="sub" style="margin-top:6px"><b>开头：</b>${PS.esc(r.hook)}</div></div><div class="stack tight">${r.angles.map(a => `<div class="row" style="padding:10px 12px;border:1px solid var(--line);border-radius:10px"><div class="grow"><b>${PS.esc(a.title)}</b><div class="sub">${PS.esc(a.fit)}</div></div><a class="btn primary s" href="#write">写这个 ›</a></div>`).join('')}</div></div>
      </section>`);
  };
  let lr = 'said';
  PS.pages.write = function () {
    const sc = PS.S.script;
    const left = lr === 'said' ? PS.S.said.map(x => `<div class="card" style="padding:11px;background:var(--surface)"><span class="pill accent">${PS.esc(x.topic)}</span><div style="margin-top:4px;font-size:13px">${PS.esc(x.text)}</div></div>`).join('')
      : lr === 'checklist' ? sc.checklistScore.map(c => `<div class="card" style="padding:11px;background:var(--surface)"><div class="row"><b>${PS.esc(c.name)}</b><span class="grow"></span><span class="pill good">${c.score} 分</span></div><p class="sub m0">${PS.esc(c.note)}</p></div>`).join('')
      : `<div class="card" style="padding:12px;background:var(--surface)"><span class="diff-del">嗯就是</span>很多人<span class="diff-del">经常</span>问我<span class="diff-del">啊</span> Park 你到底用哪一套……</div>`;
    const main = PS.shell('write', [['写一条', '#feed'], ['写 · 口播稿', '#write']], `
      <div class="ph"><div><h1>写 · 我的口播稿</h1></div><div class="acts"><a class="btn primary" href="#audit">去三路审稿 ›</a></div></div>
      <section class="cmp-split">
        <div class="cmp-give"><div class="seg"><button class="${lr === 'said' ? 'on' : ''}" data-lr="said">我说过的话</button><button class="${lr === 'checklist' ? 'on' : ''}" data-lr="checklist">清单打分</button><button class="${lr === 'diff' ? 'on' : ''}" data-lr="diff">自己说</button></div>${left}</div>
        <div class="cmp-arrow">→</div>
        <div class="cmp-get"><input type="text" value="${PS.esc(sc.title)}" style="font-weight:700"><textarea class="script-ed">${PS.esc(sc.body)}</textarea></div>
      </section>`);
    main.querySelectorAll('[data-lr]').forEach(b => b.onclick = () => { lr = b.dataset.lr; PS.pages.write(); });
  };
  PS.pages.audit = function () {
    const au = PS.S.script.audit, tc = { '新': 'tag-new', '改': 'tag-edit', '待填': 'tag-todo' };
    PS.shell('audit', [['写一条', '#feed'], ['审 · 三路审稿单', '#audit']], `
      <div class="ph"><div><h1>审 · 三路并行诊断</h1></div><div class="acts"><a class="btn primary" href="#publish">定稿 → 进发布中控 ›</a></div></div>
      <section class="diag3"><div class="card"><b>价值诊断</b><p class="sub">${PS.esc(au.value)}</p></div><div class="card"><b>共鸣诊断</b><p class="sub">${PS.esc(au.resonance)}</p></div><div class="card"><b>节奏诊断</b><p class="sub">${PS.esc(au.rhythm)}</p></div></section>
      <section class="card stack">${au.revised.map(p => `<div style="padding:10px 14px;border-radius:10px;background:var(--sunk)">${p.tag !== '留' ? `<span class="${tc[p.tag]}">【${p.tag}】</span>` : ''}${PS.esc(p.text)}</div>`).join('')}</section>`);
  };
})();
