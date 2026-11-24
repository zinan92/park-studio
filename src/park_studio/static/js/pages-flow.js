/* 选题工作台（日报·对标 / 爆款榜 / 拆解报告 / 选题池 / 写稿骨架 / 审稿改写 / 定稿） + 剪辑工作台（待剪 / 剪辑中 3 步镜头表 Spec Table / 剪好了） */
(function () {
  'use strict';
  const PS = window.PS;

  // ==================== 选题 · 找：日报 · 对标（#source，完整对齐管理员版 topic-studio） ====================
  let srcTab = 'newsletter', srcIdx = 0, srcDay = '', savedDay = '', srcItemId = '', savedSelKey = '';
  const issueCache = new Map();
  const savedCache = new Map();
  const itemDetailCache = new Map();

  const origLink = url => /^https?:\/\//.test(url || '')
    ? `<a class="src-orig" href="${PS.esc(url)}" target="_blank" rel="noopener noreferrer" data-ext="1">原文 ↗</a>`
    : '';
  const cnMonthDay = iso => {
    const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[2])} 月 ${Number(m[3])} 日` : String(iso || '');
  };
  const NUM_RE = /(<a\b[^>]*>[\s\S]*?<\/a>|https?:\/\/[^\s<]+)|([$¥￥]\d[\d,.]*\+?|\d[\d,.]*\s*(?:万|亿)\+?|\d{1,3}(?:,\d{3})+\+?)/g;
  const bigNums = html => html.replace(NUM_RE, (m, keep, n) => keep ? m : `<b class="money-num">${n}</b>`);

  function renderNewsletterReader(it, loading = false) {
    if (!it) return '<p class="sub" style="padding:36px 0;text-align:center">点左边任意一条，在这里读全文。</p>';
    const meta = [it.author, it.site, cnMonthDay(it.day)].filter(Boolean).join(' · ');
    const deepHtml = it.deep
      ? `<div class="src-deep"><div class="src-full-h">深读</div><div class="src-md">${PS.md(it.deep)}</div></div>`
      : '';
    let origHtml = '';
    if (loading) {
      origHtml = '<div class="src-notice">正在读取本地原文…</div>';
    } else if (it.original) {
      origHtml = `<div class="src-full-h">原文</div><div class="src-md">${PS.md(it.original)}</div>`;
    } else {
      origHtml = `<div class="src-notice">这一条的原文未落盘在本地日报管道目录，${it.url ? '可点标题旁的「原文 ↗」去原帖看。' : '当前仅有上面的摘要。'}</div>`;
    }
    return `
      <div class="src-read-h">
        <h2>${PS.esc(it.title)}${origLink(it.url)}</h2>
        <div class="row wrap">
          <span class="sub grow">${PS.esc(meta)}</span>
          <button class="btn primary s" type="button" id="addTopicBtn">+ 加入选题</button>
        </div>
      </div>
      <div class="src-daily">
        ${it.group ? `<span class="src-cat-pill">${PS.esc(it.group)}</span>` : ''}
        ${it.summary ? `<p>${PS.esc(it.summary)}</p>` : ''}
      </div>
      ${deepHtml}
      ${origHtml}
    `;
  }

  function renderMoneyCardReader(c) {
    const [hero, ...more] = c.images || [];
    const res = c.results || [];
    const secs = c.sections || [];
    const fig = (im, cls) => `<figure class="${cls}"><a href="${PS.esc(im.src)}" target="_blank" rel="noopener"><img src="${PS.esc(im.src)}" alt="${PS.esc(im.caption || '')}"></a>${im.caption ? `<figcaption>${PS.esc(im.caption)}</figcaption>` : ''}</figure>`;
    const revHtml = c.state === 'ok'
      ? `<span class="pill good">已通过</span><button class="btn s" type="button" data-mcstate="wait">撤下</button>`
      : c.state === 'out'
        ? `<span class="pill">不要了</span><button class="btn s" type="button" data-mcstate="wait">改回等审</button>`
        : `<button class="btn s" type="button" data-mcstate="out">不要</button><button class="btn primary s" type="button" data-mcstate="ok">通过</button>`;
    return `
      <div class="src-read-h">
        <h2>${PS.esc(c.title)}${origLink(c.url)}</h2>
        <div class="row wrap">
          <span class="pill ${c.verdict === '值得试' ? 'accent' : c.verdict === '流量卡' ? 'info' : ''}">${PS.esc(c.verdict || '机会卡')}</span>
          <span class="sub grow">${PS.esc(cnMonthDay(c.day))} · Pete 出卡</span>
          ${revHtml}
          <button class="btn primary s" type="button" id="addTopicBtn">+ 加入选题</button>
        </div>
      </div>
      <div class="money-detail">
        ${c.headline ? `<p class="m0 money-what">${PS.esc(c.headline)}</p>` : ''}
        ${res.length ? `<div class="money-stats">${res.map(r => `<div class="money-stat"><b>${PS.esc(r.value)}</b>${r.label ? `<span class="sub">${PS.esc(r.label)}</span>` : ''}${r.url ? `<a class="money-ref" href="${PS.esc(r.url)}" target="_blank" rel="noopener noreferrer">成就 reference ↗</a>` : ''}</div>`).join('')}</div>` : ''}
        ${c.proof ? `<div class="money-proof"><span class="money-lbl">${PS.esc(c.proof.label)}</span><div class="src-md">${bigNums(PS.md(c.proof.text))}</div></div>` : ''}
        ${secs.map(x => `<div class="money-sec">${x.label ? `<b>${PS.esc(x.label)}</b>` : ''}<div class="src-md">${bigNums(PS.md(x.text))}</div></div>`).join('')}
        ${hero ? `<div class="money-media">${fig(hero, 'money-hero')}${more.length ? `<div class="money-thumbs">${more.map(im => fig(im, 'money-thumb')).join('')}</div>` : ''}</div>` : ''}
        ${c.url ? `<div class="row"><a class="btn s" href="${PS.esc(c.url)}" target="_blank" rel="noopener noreferrer">看原帖 ↗</a></div>` : ''}
      </div>
    `;
  }

  function renderNoteReader(cur) {
    if (!cur) return '<p class="sub" style="padding:36px 0;text-align:center">暂无内容</p>';
    const meta = [cur.author, cur.site, cur.day ? cnMonthDay(cur.day) : cur.date].filter(Boolean).join(' · ');
    return `
      <div class="src-read-h">
        <h2>${PS.esc(cur.title)}${origLink(cur.url)}</h2>
        <div class="row wrap">
          <span class="sub grow">${PS.esc(meta)}</span>
          <button class="btn primary s" type="button" id="addTopicBtn">+ 加入选题</button>
        </div>
      </div>
      ${cur.tag ? `<span class="src-cat-pill">${PS.esc(cur.tag)}</span>` : ''}
      <div class="src-md">${PS.md(cur.body || cur.excerpt || '')}</div>
    `;
  }

  function renderDevDailyHTML(d) {
    const sections = d?.sections || [];
    const row = x => `<li>
      <span class="pill ${x.kind === 'fix' ? 'info' : 'good'}">${x.kind === 'fix' ? '修好了' : '新功能'}</span>
      <span class="min0"><b>${PS.esc(x.title)}</b>${x.why ? `<span class="sub">${PS.esc(x.why)}</span>` : ''}</span>
      ${x.at ? `<span class="sub mono" style="font-size:12px">${PS.esc(x.at)}</span>` : ''}
    </li>`;
    const renderDays = list => list.map(g => `<div class="pd-day"><b class="pd-day-h">${PS.esc(cnMonthDay(g.day))}</b><ul class="pd-list">${g.items.map(row).join('')}</ul></div>`).join('');
    const renderOlder = list => list.length
      ? `<details class="pd-older"><summary>更早的 · ${list.reduce((a, g) => a + g.items.length, 0)} 条</summary>${renderDays(list)}</details>`
      : '';
    return `<div class="stack">
      <p class="sub m0">这几天做了什么：本机 Git 仓库近 ${d?.days_range || 14} 天的新功能与修复（默认展开最新一天，更早的收起来）。</p>
      ${sections.map(sec => `<section class="card stack">
        <div class="card-h" style="margin-bottom:2px"><h3>${PS.esc(sec.name)}</h3><span class="sub mono" style="font-size:11.5px">${PS.esc(sec.path || '')}</span></div>
        ${sec.days?.length ? renderDays(sec.days.slice(0, 1)) + renderOlder(sec.days.slice(1)) : '<p class="sub m0">这几天没有新提交。</p>'}
      </section>`).join('') || '<section class="card"><p class="sub m0">暂未配置本地 Git 仓库。</p></section>'}
    </div>`;
  }

  PS.pages.source = async function (sub, arg) {
    if (['newsletter', 'saved', 'dev', 'bench', 'obsidian', 'materials', 'kline'].includes(sub)) {
      if (srcTab !== sub) { srcTab = sub; srcIdx = 0; srcItemId = ''; savedSelKey = ''; }
    }
    if (srcTab === 'newsletter' && arg) {
      if (srcDay !== arg) { srcDay = arg; srcItemId = ''; }
    }
    if (srcTab === 'saved' && arg) {
      if (savedDay !== arg) { savedDay = arg; savedSelKey = ''; }
    }
    if (srcTab === 'bench') return PS.pages.feed();
    if (srcTab === 'materials') return PS.pages.materials(arg);
    if (srcTab === 'obsidian') return PS.pages.kb ? PS.pages.kb() : null;

    let iss = PS._newsletterIssue || null;
    if (srcTab === 'newsletter') {
      const wantDay = srcDay || (iss ? iss.day : '');
      if (wantDay && issueCache.has(wantDay)) {
        iss = issueCache.get(wantDay);
      } else if (!iss || (srcDay && iss.day !== srcDay)) {
        try {
          const r = await PS.api('GET', `/api/source/newsletter${srcDay ? `?day=${encodeURIComponent(srcDay)}` : ''}`);
          if (r.issue) {
            iss = r.issue;
            issueCache.set(iss.day, iss);
            if (!srcDay) PS._newsletterIssue = iss;
          }
        } catch (e) {}
      } else if (iss) {
        issueCache.set(iss.day, iss);
      }
    }

    let savedD = PS._savedDaily || null;
    if (srcTab === 'saved') {
      const wantDay = savedDay || (savedD ? savedD.day : '');
      if (wantDay && savedCache.has(wantDay)) {
        savedD = savedCache.get(wantDay);
      } else if (!savedD || (savedDay && savedD.day !== savedDay)) {
        try {
          const r = await PS.api('GET', `/api/source/saved${savedDay ? `?day=${encodeURIComponent(savedDay)}` : ''}`);
          if (r) {
            savedD = r;
            if (r.day) savedCache.set(r.day, r);
            if (!savedDay) PS._savedDaily = r;
          }
        } catch (e) {}
      } else if (savedD && savedD.day) {
        savedCache.set(savedD.day, savedD);
      }
    }

    let devD = PS._devDaily || null;
    if (srcTab === 'dev' && !devD) {
      try { devD = await PS.api('GET', '/api/source/dev'); PS._devDaily = devD; } catch (e) {}
    }

    const newsCount = (PS._newsletterIssue?.total) || (iss?.total) || PS.S.sources.newsletter.length;
    const savedCount = (PS._savedDaily?.total) ?? (savedD?.total) ?? PS.S.sources.saved.length;
    let body = '';
    let flatItems = [];

    if (srcTab === 'newsletter' && iss && iss.parts?.length) {
      iss.parts.forEach(p => p.groups.forEach(g => g.items.forEach(it => flatItems.push(it))));
      if (!srcItemId || !flatItems.some(x => x.id === srcItemId)) {
        srcItemId = flatItems[0]?.id || '';
      }
      const listHtml = `
        <div class="src-issue-h">
          <div class="min0">
            <div class="sub" style="font-size:12px">${iss.latest ? '最新一期' : '往期'}</div>
            <b class="clip1" style="font-size:15px">${PS.esc(iss.title)}</b>
          </div>
          <select id="srcDay" aria-label="选择期数">
            ${(iss.days || [iss.day]).map(d => `<option value="${PS.esc(d)}" ${d === iss.day ? 'selected' : ''}>${PS.esc(d)}</option>`).join('')}
          </select>
        </div>
        ${iss.parts.map(p => `
          <div class="src-day">${PS.esc(p.name)} ${p.count} 条</div>
          ${p.groups.map(g => `
            ${g.name ? `<div class="src-group">${PS.esc(g.name)}</div>` : ''}
            ${g.items.map(it => `
              <div class="src-row ${it.id === srcItemId ? 'on' : ''}" data-open="${PS.esc(it.id)}">
                <div class="src-meta">
                  <span class="sub">${PS.esc([it.author, it.site].filter(Boolean).join(' · '))}</span>
                  ${it.hasDeep ? '<span class="pill info" style="padding:1px 6px;font-size:10.5px">深读</span>' : ''}
                </div>
                <div><button class="src-t" type="button" data-open="${PS.esc(it.id)}">${PS.esc(it.title)}</button>${origLink(it.url)}</div>
                ${it.summary ? `<p class="src-x">${PS.esc(it.summary)}</p>` : ''}
              </div>
            `).join('')}
          `).join('')}
        `).join('')}
      `;
      const activeBasic = flatItems.find(x => x.id === srcItemId) || flatItems[0];
      const cacheKey = activeBasic ? `${iss.day}:${activeBasic.id}` : '';
      const cached = cacheKey ? itemDetailCache.get(cacheKey) : null;
      body = `<div class="src-split" id="srcSplit">
        <div class="card flush src-list" id="srcList">${listHtml}</div>
        <div class="card src-read" id="srcRead">${renderNewsletterReader(cached || activeBasic, !cached && !!activeBasic)}</div>
      </div>`;
    } else if (srcTab === 'saved' && savedD && (savedD.cards?.length || savedD.items?.length)) {
      const cards = savedD.cards || [];
      const items = savedD.items || [];
      const allKeys = [...cards.map(c => `c:${c.id}`), ...items.map((it, i) => `i:${i}`)];
      if (!savedSelKey || !allKeys.includes(savedSelKey)) savedSelKey = allKeys[0] || '';

      const cardRows = cards.map(c => {
        const key = `c:${c.id}`;
        const top = (c.results || [])[0];
        return `<div class="src-row ${savedSelKey === key ? 'on' : ''}" data-skey="${PS.esc(key)}">
          <div class="src-meta">
            <span class="pill ${c.verdict === '值得试' ? 'accent' : c.verdict === '流量卡' ? 'info' : ''}" style="padding:1px 7px;font-size:11px">${PS.esc(c.verdict || '机会卡')}</span>
            <span class="sub">Pete 商业机会卡</span>
          </div>
          <div><button class="src-t" type="button" data-skey="${PS.esc(key)}">${PS.esc(c.title)}</button>${origLink(c.url)}</div>
          ${top ? `<p class="src-x"><b class="money-num">${PS.esc(top.value)}</b> ${PS.esc(top.label)}</p>` : (c.headline ? `<p class="src-x">${PS.esc(c.headline)}</p>` : '')}
        </div>`;
      }).join('');

      const itemRows = items.map((it, i) => {
        const key = `i:${i}`;
        return `<div class="src-row ${savedSelKey === key ? 'on' : ''}" data-skey="${key}">
          <div class="src-meta">
            <span class="pill" style="padding:1px 7px;font-size:11px">${PS.esc(it.tag || '收藏')}</span>
            <span class="sub">${PS.esc([it.author, it.site].filter(Boolean).join(' · '))}</span>
          </div>
          <div><button class="src-t" type="button" data-skey="${key}">${PS.esc(it.title)}</button>${origLink(it.url)}</div>
          ${it.excerpt ? `<p class="src-x">${PS.esc(it.excerpt)}</p>` : ''}
        </div>`;
      }).join('');

      const renderSavedCurrent = () => {
        if (savedSelKey.startsWith('c:')) {
          const cid = savedSelKey.slice(2);
          const card = cards.find(c => c.id === cid);
          return card ? renderMoneyCardReader(card) : '<p class="sub">暂无内容</p>';
        }
        const idx = Number(savedSelKey.slice(2) || 0);
        return renderNoteReader(items[idx] || items[0]);
      };

      body = `
        <p class="sub m0" style="margin-top:-8px">Park 亲手收藏、剪下、star 的，和 Pete 从里面挑出来的赚钱机会，一天一期。</p>
        <div class="src-split" id="srcSplit">
          <div class="card flush src-list" id="srcList">
            <div class="src-issue-h">
              <div class="min0">
                <div class="sub" style="font-size:12px">${savedD.latest ? '最新一天' : '往期'}</div>
                <b class="clip1" style="font-size:15px">${PS.esc(cnMonthDay(savedD.day))} · ${savedD.total} 条</b>
              </div>
              <select id="srcDay" aria-label="看哪一天">
                ${(savedD.days || [savedD.day]).map(d => `<option value="${PS.esc(d)}" ${d === savedD.day ? 'selected' : ''}>${PS.esc(d)}</option>`).join('')}
              </select>
            </div>
            ${cards.length ? `<div class="src-group">Pete 商业机会卡 · ${cards.length} 张</div>${cardRows}` : ''}
            ${items.length ? `<div class="src-day">亲手收藏与剪藏 ${items.length} 条</div>${itemRows}` : ''}
          </div>
          <div class="card src-read" id="srcRead">${renderSavedCurrent()}</div>
        </div>`;
    } else if (srcTab === 'dev') {
      body = renderDevDailyHTML(devD);
    } else if (srcTab === 'obsidian' || srcTab === 'newsletter' || srcTab === 'saved') {
      const list = srcTab === 'obsidian' ? (PS.S.obsidianNotes || []) : (PS.S.sources[srcTab] || []);
      const cur = list[srcIdx] || list[0];
      const headTitle = srcTab === 'saved' ? '搞钱日报' : srcTab === 'obsidian' ? 'Obsidian 原始输出' : 'AI 日报';
      body = `<div class="src-split" id="srcSplit">
        <div class="card flush src-list" id="srcList">
          <div class="src-issue-h">
            <div class="min0">
              <div class="sub" style="font-size:12px">${srcTab === 'obsidian' ? PS.esc(PS.S.settings.obsidianPath) : '本地 Obsidian 只读'}</div>
              <b class="clip1" style="font-size:15px">${headTitle} · ${list.length} 篇</b>
            </div>
          </div>
          ${list.map((it, i) => `<div class="src-row ${i === srcIdx ? 'on' : ''}" data-si="${i}">
            <div class="src-meta">
              <span class="sub">${PS.esc([it.author || it.tag, it.site, it.date].filter(Boolean).join(' · '))}</span>
            </div>
            <div><button class="src-t" type="button" data-si="${i}">${PS.esc(it.title)}</button>${origLink(it.url)}</div>
            ${it.excerpt ? `<p class="src-x">${PS.esc(it.excerpt)}</p>` : ''}
          </div>`).join('') || '<div style="padding:24px" class="sub">暂无内容</div>'}
        </div>
        <div class="card src-read" id="srcRead">${renderNoteReader(cur)}</div>
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

    const main = PS.shell('source', [['选题工作台', '#source'], ['Park 信源', '#source']], `
      <div class="ph">
        <div>
          <h1>找 · 日报与对标</h1>
          <p>AI 日报、搞钱日报（Pete 机会卡 + 收藏）、开发日报与 Park 的对标，默认看最新一天，往期右上角切换。</p>
        </div>
        <div class="acts">
          <div class="seg">
            <button class="${srcTab === 'newsletter' ? 'on' : ''}" onclick="location.hash='#source/newsletter'">AI 日报 ${newsCount}</button>
            <button class="${srcTab === 'saved' ? 'on' : ''}" onclick="location.hash='#source/saved'">搞钱日报 ${savedCount}</button>
            <button class="${srcTab === 'dev' ? 'on' : ''}" onclick="location.hash='#source/dev'">开发日报</button>
            <button onclick="location.hash='#feed'">对标爆款 ${PS.S.benchmarks?.total || ''}</button>
            <button onclick="location.hash='#materials'">素材库</button>
          </div>
        </div>
      </div>
      ${body}
    `);

    const bindAddTopic = getItem => {
      main.querySelector('#addTopicBtn')?.addEventListener('click', async () => {
        const it = getItem();
        if (!it) return;
        const parts = [];
        if (it.summary) parts.push(`## 日报摘要\n\n${it.summary}`);
        if (it.headline) parts.push(`## 一句话\n\n${it.headline}`);
        if (it.deep) parts.push(`## 深读\n\n${it.deep}`);
        if (it.original) parts.push(`## 原文\n\n${it.original}`);
        else if (it.body) parts.push(it.body);
        const fullBody = parts.join('\n\n').slice(0, 12000);
        const ref = it.group ? `AI 日报 · ${it.group}` : it.verdict ? `搞钱日报 · ${it.verdict}` : (it.tag || '信源');
        try {
          const created = await PS.api('POST', '/api/topics', { title: it.title, source_ref: ref, body: fullBody });
          PS.S.topics.unshift(created);
        } catch {
          PS.S.topics.unshift({ id: Date.now(), title: it.title, stage: '写', score: 14, updated: '刚刚', trash: false });
        }
        PS.save();
        PS.toast('已加入「选题池」（已写入本地 SQLite）', 'good');
      });
    };

    if (srcTab === 'newsletter' && iss && flatItems.length) {
      let currentDetail = itemDetailCache.get(`${iss.day}:${srcItemId}`) || flatItems.find(x => x.id === srcItemId);
      let reqSeq = 0;
      const readBox = main.querySelector('#srcRead');
      const listBox = main.querySelector('#srcList');

      const openNewsletterItem = async id => {
        srcItemId = id;
        const basic = flatItems.find(x => x.id === id);
        if (!basic) return;
        listBox.querySelectorAll('.src-row.on').forEach(el => el.classList.remove('on'));
        listBox.querySelector(`.src-row[data-open="${id}"]`)?.classList.add('on');
        const ck = `${iss.day}:${id}`;
        if (itemDetailCache.has(ck)) {
          currentDetail = itemDetailCache.get(ck);
          readBox.innerHTML = renderNewsletterReader(currentDetail, false);
          readBox.scrollTop = 0;
          bindAddTopic(() => currentDetail);
          return;
        }
        const mine = ++reqSeq;
        currentDetail = basic;
        readBox.innerHTML = renderNewsletterReader(basic, true);
        readBox.scrollTop = 0;
        try {
          const detail = await PS.api('GET', `/api/source/newsletter/item?day=${encodeURIComponent(iss.day)}&id=${encodeURIComponent(id)}`);
          if (mine !== reqSeq) return;
          itemDetailCache.set(ck, detail);
          currentDetail = detail;
          readBox.innerHTML = renderNewsletterReader(detail, false);
          bindAddTopic(() => currentDetail);
        } catch (e) {
          if (mine !== reqSeq) return;
          readBox.innerHTML = renderNewsletterReader(basic, false);
          bindAddTopic(() => currentDetail);
        }
      };

      listBox.addEventListener('click', e => {
        if (e.target.closest('[data-ext]')) return;
        const row = e.target.closest('[data-open]');
        if (row) openNewsletterItem(row.dataset.open);
      });
      main.querySelector('#srcDay')?.addEventListener('change', e => {
        srcDay = e.target.value;
        srcItemId = '';
        location.hash = `#source/newsletter/${encodeURIComponent(srcDay)}`;
      });

      if (!itemDetailCache.has(`${iss.day}:${srcItemId}`)) {
        openNewsletterItem(srcItemId);
      } else {
        bindAddTopic(() => currentDetail);
      }
    } else if (srcTab === 'saved' && savedD && (savedD.cards?.length || savedD.items?.length)) {
      const readBox = main.querySelector('#srcRead');
      const listBox = main.querySelector('#srcList');
      const cards = savedD.cards || [];
      const items = savedD.items || [];
      const curObj = () => savedSelKey.startsWith('c:')
        ? cards.find(c => c.id === savedSelKey.slice(2))
        : items[Number(savedSelKey.slice(2) || 0)];

      const bindReaderActs = () => {
        bindAddTopic(curObj);
        readBox.querySelectorAll('[data-mcstate]').forEach(b => b.onclick = async () => {
          const c = curObj();
          if (!c) return;
          const st = b.dataset.mcstate;
          await PS.api('POST', '/api/source/moneycard-state', { id: c.id, state: st }).catch(() => {});
          c.state = st;
          readBox.innerHTML = renderMoneyCardReader(c);
          bindReaderActs();
          PS.toast(st === 'ok' ? '已标记「通过」' : st === 'out' ? '已标记「不要」' : '已改回等审', 'good');
        });
      };

      listBox.addEventListener('click', e => {
        if (e.target.closest('[data-ext]')) return;
        const row = e.target.closest('[data-skey]');
        if (!row) return;
        savedSelKey = row.dataset.skey;
        listBox.querySelectorAll('.src-row.on').forEach(el => el.classList.remove('on'));
        row.classList.add('on');
        const obj = curObj();
        readBox.innerHTML = savedSelKey.startsWith('c:') ? renderMoneyCardReader(obj) : renderNoteReader(obj);
        readBox.scrollTop = 0;
        bindReaderActs();
      });
      main.querySelector('#srcDay')?.addEventListener('change', e => {
        savedDay = e.target.value;
        savedSelKey = '';
        location.hash = `#source/saved/${encodeURIComponent(savedDay)}`;
      });
      bindReaderActs();
    } else if (srcTab !== 'dev') {
      const list = srcTab === 'obsidian' ? (PS.S.obsidianNotes || []) : (PS.S.sources[srcTab] || []);
      main.querySelector('#srcList')?.addEventListener('click', e => {
        if (e.target.closest('[data-ext]')) return;
        const row = e.target.closest('[data-si]');
        if (row) { srcIdx = +row.dataset.si; PS.pages.source(); }
      });
      bindAddTopic(() => list[srcIdx] || list[0]);
    }
  };

  // ==================== 选题 · 爆款榜（#feed） & 拆解报告（#chai） ====================
  let feedScope = 'shared'; // shared | mine

  // ==================== 选题 · 找：真实对标爆款库（002_对标内容 + 追踪账号 CDP 抓取 + 本地 Agent 拆解） ====================
  let bmAuthor = '';
  let bmSort = 'multiple';
  let bmSelId = '';
  const bmDetailCache = new Map();

  const TEARDOWN_MODES = [
    { id: 'lite', label: '⚡ 极简速览' },
    { id: 'standard', label: '🎯 7 角度' },
    { id: 'deep', label: '🔬 深度全维' },
    { id: 'custom', label: '⚙ 自定义' },
  ];
  const TEARDOWN_MODULE_OPTS = [
    { id: 'mainline', label: '一句话主线 + 爆款原因 + 2 开头钩子' },
    { id: 'opening', label: '前 15 秒抓手与核心承诺' },
    { id: 'segments', label: '全片结构分节（3–5 段留存作用）' },
    { id: 'angles7', label: 'Dan Koe 7 个可换切入角度 + 80–130 字可直接念开头 + Top 2 最能打' },
    { id: 'agenda', label: '人设动机 / 私域变现路径 / 照抄雷区' },
    { id: 'pacing', label: '信息密度节奏与画面 / B-roll 手法' },
  ];

  PS.pages.feed = async function () {
    let bm = PS.S.benchmarks;
    try {
      bm = await PS.api('GET', `/api/benchmarks?author=${encodeURIComponent(bmAuthor)}&sort=${encodeURIComponent(bmSort)}&limit=120`);
      PS.S.benchmarks = bm;
    } catch (e) {}
    bm = bm || { total: 0, hit3x: 0, authors: [], tracked: [], items: [] };
    const items = bm.items || [];
    if (!bmSelId || !items.some(x => x.id === bmSelId)) bmSelId = items[0]?.id || '';
    const tdMode = PS.S.settings.teardownMode || 'standard';
    const tdModules = Array.isArray(PS.S.settings.teardownModules) && PS.S.settings.teardownModules.length
      ? PS.S.settings.teardownModules
      : ['mainline', 'opening', 'segments', 'angles7'];
    const tdCustom = PS.S.settings.teardownCustomPrompt || '';

    const renderStructured = det => {
      const st = det?.structured;
      if (!st || typeof st !== 'object') return '';
      const angles = Array.isArray(st.angles) ? st.angles : [];
      const strongestMap = new Map();
      for (const s of (Array.isArray(st.strongest) ? st.strongest : [])) {
        if (s && typeof s.index === 'number') strongestMap.set(s.index, s.why || '');
        else if (s && s.lens) {
          const hit = angles.findIndex(a => a && a.lens === s.lens);
          if (hit >= 0) strongestMap.set(hit, s.why || '');
        }
      }
      const blocks = [];
      if (st.opening && (st.opening.hook || st.opening.promise)) {
        blocks.push(`<div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13px">开头 15 秒抓手</b>
          ${st.opening.hook ? `<div style="font-size:13px"><b>前 3 秒打断：</b>${PS.esc(st.opening.hook)}</div>` : ''}
          ${st.opening.promise ? `<div style="font-size:13px"><b>核心承诺：</b>${PS.esc(st.opening.promise)}</div>` : ''}
        </div>`);
      }
      if (Array.isArray(st.segments) && st.segments.length) {
        blocks.push(`<div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13px">全片结构分节</b>
          <div class="stack tight">${st.segments.map((sg, i) => `<div style="font-size:12.5px">
            <span class="pill" style="font-size:11px;padding:1px 7px">${i + 1}. ${PS.esc(sg.part || '')}</span>
            <span class="sub" style="margin-left:6px">${PS.esc(sg.role || '')}</span>
            <div style="margin-top:3px;color:var(--ink-2)">${PS.esc(sg.summary || '')}</div>
          </div>`).join('')}</div>
        </div>`);
      }
      if (st.universal_truth || angles.length) {
        blocks.push(`<div class="stack tight" style="margin-top:4px">
          ${st.universal_truth ? `<div class="callout-warm"><b>底层共通真相：</b>${PS.esc(st.universal_truth)}</div>` : ''}
          ${angles.length ? `<div class="row" style="margin-top:6px"><b style="font-size:14px">7 个可换切入角度（Dan Koe · Find your angle）</b><span class="sub" style="font-size:12px">选一个最顺口的直接进写稿台</span></div>
          <div class="stack tight" style="gap:10px">
            ${angles.map((a, idx) => {
              const topWhy = strongestMap.has(idx) ? strongestMap.get(idx) : null;
              return `<div class="card stack tight" style="padding:12px 14px;${topWhy !== null ? 'border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent-soft) 35%,var(--surface))' : ''}">
                <div class="row" style="gap:8px;flex-wrap:wrap">
                  <span class="pill ${topWhy !== null ? 'accent' : ''}">${idx + 1}. ${PS.esc(a.lens || `角度 ${idx + 1}`)}</span>
                  ${topWhy !== null ? `<span class="pill good">★ 最能打</span>` : ''}
                  ${topWhy ? `<span class="sub" style="font-size:12px">${PS.esc(topWhy)}</span>` : ''}
                  <span class="grow"></span>
                  <button class="btn primary s" type="button" data-use-angle="${idx}">用这个角度写 ›</button>
                </div>
                ${a.say ? `<blockquote style="margin:4px 0;padding:8px 12px;border-left:3px solid var(--accent);background:var(--sunk);border-radius:6px;font-size:13.5px;line-height:1.65">“${PS.esc(a.say)}”</blockquote>` : ''}
                ${a.text ? `<div style="font-size:12.5px;color:var(--ink-2)"><b>展开方向：</b>${PS.esc(a.text)}</div>` : ''}
                ${a.needs_own ? `<div class="sub" style="font-size:11.5px">✎ 需补个人真实细节：${PS.esc(a.needs_own)}</div>` : ''}
              </div>`;
            }).join('')}
          </div>` : ''}
        </div>`);
      }
      if (st.agenda && (st.agenda.persona || st.agenda.funnel || st.agenda.risk)) {
        blocks.push(`<div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13px">变现与人设动机</b>
          ${st.agenda.persona ? `<div style="font-size:12.5px"><b>人设定位：</b>${PS.esc(st.agenda.persona)}</div>` : ''}
          ${st.agenda.funnel ? `<div style="font-size:12.5px"><b>转化路径：</b>${PS.esc(st.agenda.funnel)}</div>` : ''}
          ${st.agenda.risk ? `<div style="font-size:12.5px;color:var(--warn)"><b>照抄雷区：</b>${PS.esc(st.agenda.risk)}</div>` : ''}
        </div>`);
      }
      if (st.pacing && (st.pacing.rhythm || st.pacing.visuals)) {
        blocks.push(`<div class="card stack tight" style="background:var(--sunk);border:0">
          <b style="font-size:13px">节奏与画面手法</b>
          ${st.pacing.rhythm ? `<div style="font-size:12.5px"><b>节奏密度：</b>${PS.esc(st.pacing.rhythm)}</div>` : ''}
          ${st.pacing.visuals ? `<div style="font-size:12.5px"><b>画面 / 字幕：</b>${PS.esc(st.pacing.visuals)}</div>` : ''}
        </div>`);
      }
      return blocks.length ? `<div class="stack tight" style="margin-top:14px">${blocks.join('')}</div>` : '';
    };

    const renderBmReader = (det, loading = false) => {
      if (!det) return '<div style="padding:28px" class="sub">左侧选一条对标爆款查看拆解报告，或点击右上角「+ 添加对标账号 / AI 拆解新视频」。</div>';
      const multBadge = det.multiple > 0
        ? `<span class="pill ${det.multiple >= 3 ? 'accent' : 'good'}">${det.multiple}× 平时</span>`
        : '';
      const modeLabel = TEARDOWN_MODES.find(m => m.id === (det.structured?.mode || tdMode))?.label || '🎯 7 角度';
      return `
        <div class="stack tight" style="padding-bottom:14px;border-bottom:1px solid var(--line-soft)">
          <div class="row" style="gap:7px;flex-wrap:wrap">
            ${PS.plogo(det.platform || 'douyin', 18)}
            <b>${PS.esc(det.author)}</b>
            ${multBadge}
            ${det.likes ? `<span class="pill">赞 ${PS.fmt(det.likes)}</span>` : ''}
            ${det.structured?.mode ? `<span class="pill accent">${PS.esc(modeLabel)}</span>` : ''}
            ${det.published ? `<span class="sub mono" style="font-size:12px">${PS.esc(det.published)}</span>` : ''}
            <span class="grow"></span>
            ${det.url ? `<a class="btn s" href="${PS.esc(det.url)}" target="_blank" rel="noopener">原视频 ↗</a>` : ''}
            <button class="btn s" id="bmReTearBtn">${PS.icon('spark', 'sm')}按「${PS.esc(TEARDOWN_MODES.find(m => m.id === tdMode)?.label || '7 角度')}」重拆</button>
            <button class="btn primary s" id="bmAddTopicBtn">+ 加入选题池</button>
          </div>
          <h2 class="m0" style="font-size:19px;line-height:1.35">${PS.esc(det.title)}</h2>
        </div>
        ${det.mainline ? `<div class="callout-warm" style="margin-top:14px"><b>主线：</b>${PS.esc(det.mainline)}</div>` : ''}
        ${det.whyHit ? `<div class="card stack tight" style="margin-top:12px;background:var(--sunk);border:0"><b style="font-size:13px">为什么爆</b><div class="md-body">${PS.md(det.whyHit)}</div></div>` : ''}
        ${renderStructured(det)}
        <div class="md-body" style="margin-top:14px">${loading ? '<p class="sub">正在加载完整拆解与逐字稿…</p>' : PS.md(det.body || det.excerpt || '暂无正文')}</div>`;
    };

    const listHtml = `
      <div class="src-issue-h" style="flex-wrap:wrap;gap:8px">
        <div class="min0">
          <div class="sub" style="font-size:12px">已入库 ${bm.total} 条 · 3× 爆款 ${bm.hit3x} 条</div>
          <b class="clip1" style="font-size:14.5px">对标爆款榜（真实库）</b>
        </div>
        <select id="bmAuthorSel" aria-label="按对标博主筛选" style="max-width:150px">
          <option value="">全部博主 (${bm.authors?.length || 0})</option>
          ${(bm.authors || []).map(a => `<option value="${PS.esc(a.name)}" ${a.name === bmAuthor ? 'selected' : ''}>${PS.esc(a.name)} (${a.count})</option>`).join('')}
        </select>
      </div>
      ${items.map(it => `<div class="src-row ${it.id === bmSelId ? 'on' : ''}" data-bmid="${PS.esc(it.id)}">
        <div class="src-meta">
          ${it.multiple > 0 ? `<span class="pill ${it.multiple >= 3 ? 'accent' : ''}" style="padding:1px 7px;font-size:11px">${it.multiple}×</span>` : ''}
          <span class="sub">${PS.esc(it.author)}${it.likes ? ` · 赞 ${PS.kfmt(it.likes)}` : ''}${it.published ? ` · ${it.published.slice(5)}` : ''}</span>
        </div>
        <div><button class="src-t" type="button" data-bmid="${PS.esc(it.id)}">${PS.esc(it.title)}</button>${origLink(it.url)}</div>
        ${it.excerpt ? `<p class="src-x">${PS.esc(it.excerpt)}</p>` : ''}
      </div>`).join('') || '<div style="padding:24px" class="sub">暂无对标内容，点右上角添加对标账号或配置 Obsidian 对标目录。</div>'}`;

    const trackedBar = (bm.tracked || []).length
      ? `<div class="card row" style="padding:10px 14px;flex-wrap:wrap;gap:8px">
          <span class="sub" style="font-size:12px;font-weight:600">已追踪主页：</span>
          ${bm.tracked.map(acc => `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px">
            ${PS.plogo(acc.platform, 14)}<b>${PS.esc(acc.name)}</b>
            <span class="sub" style="font-size:11px">${PS.esc(acc.last_fetched_at)}</span>
            <button type="button" class="link-muted" data-bm-fetch="${acc.id}" style="font-size:11.5px;color:var(--accent)">抓最新</button>
            <button type="button" class="link-muted" data-bm-del="${acc.id}" style="font-size:11px">×</button>
          </span>`).join('')}
        </div>`
      : '';

    const activeBasic = items.find(x => x.id === bmSelId) || items[0];
    const cached = activeBasic ? bmDetailCache.get(activeBasic.id) : null;

    const main = PS.shell('feed', [['选题工作台', '#source'], ['对标爆款库', '#feed']], `
      <div class="ph">
        <div>
          <h1>对标爆款库</h1>
          <p>支持 3 层可配置拆解（极简速览 / Dan Koe 7 角度 / 深度全维 / 自定义模块与 Prompt）· 直接读取 Obsidian <code>002_对标内容</code>（${bm.total} 条）。</p>
        </div>
        <div class="acts" style="flex-wrap:wrap">
          <div class="seg" id="bmModeSeg" title="切换 AI 拆解深度与角度模板">
            ${TEARDOWN_MODES.map(m => `<button class="${tdMode === m.id ? 'on' : ''}" data-tdm="${m.id}">${m.label}</button>`).join('')}
          </div>
          <div class="seg">
            <button class="${bmSort === 'multiple' ? 'on' : ''}" data-bms="multiple">按几倍平时</button>
            <button class="${bmSort === 'likes' ? 'on' : ''}" data-bms="likes">按点赞</button>
            <button class="${bmSort === 'latest' ? 'on' : ''}" data-bms="latest">最新</button>
          </div>
          <button class="btn" id="bmAddAccBtn">+ 添加对标账号</button>
          <button class="btn primary" id="bmNewTearBtn">${PS.icon('spark', 'sm')}AI 拆解新视频</button>
          <a class="btn" href="#source">回日报</a>
        </div>
      </div>
      ${trackedBar}
      <div class="src-split" id="bmSplit">
        <div class="card flush src-list" id="bmList">${listHtml}</div>
        <div class="card src-read" id="bmRead">${renderBmReader(cached || activeBasic, !cached && !!activeBasic)}</div>
      </div>
    `);

    const readBox = main.querySelector('#bmRead');
    const listBox = main.querySelector('#bmList');
    let curDetail = cached || activeBasic;

    const openCustomTeardownModal = () => {
      PS.modal({
        title: '自定义对标拆解模板（模块勾选 + Prompt 模板）',
        wide: true,
        body: `<div class="stack">
          <div>
            <b style="font-size:13px">第 2 层：按需勾选拆解模块</b>
            <div class="stack tight" style="margin-top:8px">
              ${TEARDOWN_MODULE_OPTS.map(opt => `<label class="row" style="gap:8px;cursor:pointer;font-size:13px">
                <input type="checkbox" data-td-mod="${opt.id}" ${tdModules.includes(opt.id) ? 'checked' : ''} style="accent-color:var(--accent)">
                <span>${PS.esc(opt.label)}</span>
              </label>`).join('')}
            </div>
          </div>
          <div>
            <b style="font-size:13px">第 3 层：完全自定义 Prompt 模板（留空则按上方勾选模块自动组装）</b>
            <p class="sub m0" style="font-size:12px;margin:4px 0 6px">可用占位符：<code>{title}</code> 标题 · <code>{author}</code> 作者 · <code>{url}</code> 链接 · <code>{transcript}</code> 逐字稿 · <code>{positioning}</code> 我的定位</p>
            <textarea id="tdCustomPromptIn" rows="6" placeholder="例如：请只帮我拆解这条视频的 3 个情绪钩子、2 个评论区争议点，以及适合我方 B 站/抖音的 100 字开场白…\n\n标题：{title}\n逐字稿：{transcript}">${PS.esc(tdCustom)}</textarea>
          </div>
        </div>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="tdSaveCustom">保存自定义配置并启用</button>`,
        onOpen(mb, close) {
          mb.querySelector('#tdSaveCustom').onclick = async () => {
            const mods = [...mb.querySelectorAll('[data-td-mod]:checked')].map(el => el.dataset.tdMod);
            const promptTxt = mb.querySelector('#tdCustomPromptIn').value.trim();
            PS.S.settings.teardownMode = 'custom';
            PS.S.settings.teardownModules = mods.length ? mods : ['mainline'];
            PS.S.settings.teardownCustomPrompt = promptTxt;
            await PS.api('PUT', '/api/settings', {
              teardownMode: 'custom',
              teardownModules: PS.S.settings.teardownModules,
              teardownCustomPrompt: promptTxt,
            }).catch(() => {});
            PS.save();
            close();
            PS.toast('已保存自定义拆解模板（写入 config.yaml）✓', 'good');
            PS.pages.feed();
          };
        },
      });
    };

    main.querySelectorAll('[data-tdm]').forEach(b => b.onclick = async () => {
      const m = b.dataset.tdm;
      if (m === 'custom') return openCustomTeardownModal();
      PS.S.settings.teardownMode = m;
      await PS.api('PUT', '/api/settings', { teardownMode: m }).catch(() => {});
      PS.save();
      PS.toast(`已切换拆解模式：${TEARDOWN_MODES.find(x => x.id === m)?.label || m}`, 'good');
      PS.pages.feed();
    });

    const bindReaderBtns = det => {
      main.querySelector('#bmAddTopicBtn')?.addEventListener('click', async () => {
        if (!det) return;
        const body = [det.mainline ? `## 对标主线\n${det.mainline}` : '', det.whyHit ? `## 为什么爆\n${det.whyHit}` : '', det.url ? `参考原视频：${det.url}` : ''].filter(Boolean).join('\n\n');
        try {
          const created = await PS.api('POST', '/api/topics', { title: det.title, source_ref: `对标 · ${det.author}`, body });
          PS.S.topics.unshift(created);
          PS.save();
          PS.toast('已加入「选题池」（写入本地 SQLite）', 'good');
        } catch (err) { PS.toast(err.message || '加入失败', 'warn'); }
      });
      main.querySelectorAll('[data-use-angle]').forEach(btn => btn.onclick = async () => {
        const idx = +btn.dataset.useAngle;
        const angle = det?.structured?.angles?.[idx];
        if (!angle) return;
        const title = `${det.title}（${angle.lens}角度）`;
        const body = [
          angle.say ? `## 开场（可直接开口念）\n${angle.say}` : '',
          angle.text ? `## 展开方向\n${angle.text}` : '',
          angle.needs_own ? `## 待补个人真实素材\n- ${angle.needs_own}` : '',
          det.structured?.universal_truth ? `## 底层真相\n${det.structured.universal_truth}` : '',
          det.url ? `参考对标：${det.url}` : '',
        ].filter(Boolean).join('\n\n');
        try {
          const created = await PS.api('POST', '/api/topics', {
            title,
            source_ref: `7 角度拆解 · ${angle.lens} · ${det.author}`,
            body,
          });
          PS.S.topics.unshift(created);
          PS.selectTopicForWrite(created.id);
          PS.toast(`已用「${angle.lens}」角度新建草稿，正在进入写稿台 ✓`, 'good');
          location.hash = `#write/${created.id}`;
        } catch (err) {
          PS.toast(err.message || '建稿失败', 'warn');
        }
      });
      main.querySelector('#bmReTearBtn')?.addEventListener('click', async e => {
        if (!det) return;
        const btn = e.currentTarget;
        const old = btn.innerHTML;
        btn.disabled = true; btn.textContent = 'AI 拆解中…';
        try {
          const r = await PS.api('POST', '/api/benchmarks/teardown', {
            title: det.title,
            author: det.author,
            url: det.url,
            transcript: (det.body || '').slice(0, 5500),
            mode: tdMode,
            modules: tdMode === 'custom' ? tdModules : null,
            custom_prompt: tdMode === 'custom' ? tdCustom : '',
          });
          PS.S.benchmarks = r.benchmarks;
          bmSelId = r.id;
          bmDetailCache.set(r.id, {
            id: r.id, kind: 'db', title: det.title, author: det.author || 'AI 拆解', platform: det.platform || 'douyin',
            url: det.url || '', published: new Date().toISOString().slice(0, 10), likes: det.likes || 0, multiple: det.multiple || 0,
            mainline: r.mainline, whyHit: r.whyHit, body: r.body, structured: r.structured,
          });
          PS.toast(`已由 ${r.backend}/${r.model} 按「${r.mode}」模式生成拆解报告 ✓`, 'good');
          PS.pages.feed();
        } catch (err) {
          PS.toast(err.message || '拆解失败', 'warn');
          btn.disabled = false; btn.innerHTML = old;
        }
      });
    };

    const openBm = async id => {
      bmSelId = id;
      const basic = items.find(x => x.id === id);
      if (!basic) return;
      listBox.querySelectorAll('.src-row.on').forEach(el => el.classList.remove('on'));
      listBox.querySelector(`.src-row[data-bmid="${CSS.escape(id)}"]`)?.classList.add('on');
      if (bmDetailCache.has(id)) {
        curDetail = bmDetailCache.get(id);
        readBox.innerHTML = renderBmReader(curDetail, false);
        readBox.scrollTop = 0;
        bindReaderBtns(curDetail);
        return;
      }
      readBox.innerHTML = renderBmReader(basic, true);
      try {
        const det = await PS.api('GET', `/api/benchmarks/detail?id=${encodeURIComponent(id)}`);
        bmDetailCache.set(id, det);
        curDetail = det;
        readBox.innerHTML = renderBmReader(det, false);
        bindReaderBtns(det);
      } catch (e) {
        readBox.innerHTML = renderBmReader(basic, false);
        bindReaderBtns(basic);
      }
    };

    listBox.addEventListener('click', e => {
      if (e.target.closest('[data-ext]')) return;
      const row = e.target.closest('[data-bmid]');
      if (row) openBm(row.dataset.bmid);
    });
    main.querySelector('#bmAuthorSel')?.addEventListener('change', e => { bmAuthor = e.target.value; bmSelId = ''; PS.pages.feed(); });
    main.querySelectorAll('[data-bms]').forEach(b => b.onclick = () => { bmSort = b.dataset.bms; PS.pages.feed(); });
    main.querySelectorAll('[data-bm-fetch]').forEach(b => b.onclick = async () => {
      const id = b.dataset.bmFetch;
      b.textContent = '抓取中…';
      try {
        const r = await PS.api('POST', `/api/benchmarks/accounts/${id}/fetch`, {});
        PS.S.benchmarks = r.benchmarks;
        PS.toast(`已从「${r.name}」抓取 ${r.fetched} 条作品并算好倍数`, r.fetched ? 'good' : 'warn');
        PS.pages.feed();
      } catch (err) { PS.toast(err.message || '抓取失败', 'warn'); b.textContent = '抓最新'; }
    });
    main.querySelectorAll('[data-bm-del]').forEach(b => b.onclick = async () => {
      const r = await PS.api('DELETE', `/api/benchmarks/accounts/${b.dataset.bmDel}`);
      PS.S.benchmarks = r.benchmarks;
      PS.pages.feed();
    });

    main.querySelector('#bmAddAccBtn').onclick = () => {
      PS.modal({
        title: '添加对标账号（支持专用 Chrome 抓取最新作品）',
        body: `<div class="stack">
          <div><label class="sub" style="display:block;margin-bottom:4px">博主昵称</label><input type="text" id="baName" placeholder="如 dontbesilent / 某科技博主"></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">平台</label><select id="baPlat"><option value="douyin">抖音</option><option value="bilibili">B 站</option><option value="youtube">YouTube</option><option value="xhs">小红书</option><option value="tiktok">TikTok</option></select></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">博主主页链接</label><input type="url" id="baUrl" placeholder="https://www.douyin.com/user/... 或 https://space.bilibili.com/..."></div>
        </div>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="baSave">添加并保存</button>`,
        onOpen(mb, close) {
          mb.querySelector('#baSave').onclick = async () => {
            const name = mb.querySelector('#baName').value.trim();
            const platform = mb.querySelector('#baPlat').value;
            const url = mb.querySelector('#baUrl').value.trim();
            if (!name || !url) return PS.toast('请填博主昵称和主页链接', 'warn');
            const r = await PS.api('POST', '/api/benchmarks/accounts', { name, platform, url });
            PS.S.benchmarks = r.benchmarks;
            close();
            PS.toast(`已添加对标账号「${name}」，点击「抓最新」即可抓取`, 'good');
            PS.pages.feed();
          };
        },
      });
    };

    main.querySelector('#bmNewTearBtn').onclick = () => {
      PS.modal({
        title: '用本机 Agent / API 拆解一条新爆款视频',
        wide: true,
        body: `<div class="stack">
          <div><label class="sub" style="display:block;margin-bottom:4px">视频标题</label><input type="text" id="ntTitle" placeholder="输入爆款视频标题"></div>
          <div class="sys-2col">
            <div><label class="sub" style="display:block;margin-bottom:4px">作者</label><input type="text" id="ntAuthor" placeholder="博主名称"></div>
            <div><label class="sub" style="display:block;margin-bottom:4px">拆解模式</label>
              <select id="ntMode">${TEARDOWN_MODES.map(m => `<option value="${m.id}" ${m.id === tdMode ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
            </div>
          </div>
          <div><label class="sub" style="display:block;margin-bottom:4px">原视频链接（可选）</label><input type="url" id="ntUrl" placeholder="https://..."></div>
          <div><label class="sub" style="display:block;margin-bottom:4px">逐字稿或内容摘录（贴得越全拆得越准）</label><textarea id="ntBody" rows="7" placeholder="把口播逐字稿或视频内容粘贴到这里…"></textarea></div>
        </div>`,
        foot: `<button class="btn" data-close>取消</button><button class="btn primary" id="ntRun">开始 AI 拆解</button>`,
        onOpen(mb, close) {
          mb.querySelector('#ntRun').onclick = async e => {
            const title = mb.querySelector('#ntTitle').value.trim();
            if (!title) return PS.toast('先填视频标题', 'warn');
            const pickedMode = mb.querySelector('#ntMode').value;
            e.currentTarget.disabled = true; e.currentTarget.textContent = 'AI 拆解中…';
            try {
              const r = await PS.api('POST', '/api/benchmarks/teardown', {
                title,
                author: mb.querySelector('#ntAuthor').value.trim(),
                url: mb.querySelector('#ntUrl').value.trim(),
                transcript: mb.querySelector('#ntBody').value.trim(),
                mode: pickedMode,
                modules: pickedMode === 'custom' ? tdModules : null,
                custom_prompt: pickedMode === 'custom' ? tdCustom : '',
              });
              PS.S.benchmarks = r.benchmarks;
              bmSelId = r.id;
              bmDetailCache.set(r.id, {
                id: r.id, kind: 'db', title, author: mb.querySelector('#ntAuthor').value.trim() || 'AI 拆解',
                platform: 'douyin', url: mb.querySelector('#ntUrl').value.trim(), published: new Date().toISOString().slice(0, 10),
                likes: 0, multiple: 0, mainline: r.mainline, whyHit: r.whyHit, body: r.body, structured: r.structured,
              });
              close();
              PS.toast(`拆解完成（${r.backend}/${r.model} · ${r.mode}）✓`, 'good');
              PS.pages.feed();
            } catch (err) {
              PS.toast(err.message || '拆解失败', 'warn');
              e.currentTarget.disabled = false; e.currentTarget.textContent = '开始 AI 拆解';
            }
          };
        },
      });
    };

    if (activeBasic && !cached) openBm(activeBasic.id);
    else bindReaderBtns(curDetail);
  };

  PS.pages.chai = function () { return PS.pages.feed(); };

  // ==================== 视觉素材库（三大类：图片 / 视频动效 / 做视频） ====================
  let matKind = 'image';
  let matCat = '';
  let matQ = '';
  let matTopic = '';
  let matOffset = 0;

  PS.pages.materials = async function (sub) {
    if (['image', 'motion', 'video', 'cases'].includes(sub)) {
      if (matKind !== sub) { matKind = sub; matCat = ''; matOffset = 0; }
    }
    let data = PS.S.materials;
    try {
      data = await PS.api('GET', `/api/materials?kind=${encodeURIComponent(matKind)}&cat=${encodeURIComponent(matCat)}&q=${encodeURIComponent(matQ)}&offset=${matOffset}&limit=48`);
      PS.S.materials = data;
    } catch (e) {}
    data = data || { kind: matKind, counts: { image: 0, motion: 0, video: 0, cases: 0, all: 0 }, total: 0, offset: 0, limit: 48, hasMore: false, categories: [], items: [] };
    const counts = data.counts || { image: 0, motion: 0, video: 0, cases: 0, all: 0 };
    const totalAll = counts.all || (counts.image + counts.motion + counts.video + (counts.cases || 0));
    const fillVar = txt => {
      if (!matTopic.trim()) return txt || '';
      return String(txt || '').replace(/\{topic\}|\{script\}/g, matTopic.trim());
    };

    const main = PS.shell('materials', [['剪辑工作台', '#cut'], ['视觉素材库', '#materials']], `
      <div class="ph">
        <div>
          <h1>视觉素材库（共 ${totalAll.toLocaleString()} 款）</h1>
          <p>四大类全量即拿即用：图片风格（${counts.image}）、视频动效与场景卡（${counts.motion}）、做视频方法（${counts.video}）、真实爆款视频案例（${(counts.cases || 0).toLocaleString()}）。</p>
        </div>
        <div class="acts">
          <div class="seg" style="flex-wrap:wrap">
            <button class="${matKind === 'image' ? 'on' : ''}" data-mk="image">图片 (${counts.image})</button>
            <button class="${matKind === 'motion' ? 'on' : ''}" data-mk="motion">视频动效 (${counts.motion})</button>
            <button class="${matKind === 'video' ? 'on' : ''}" data-mk="video">做视频 (${counts.video})</button>
            <button class="${matKind === 'cases' ? 'on' : ''}" data-mk="cases">视频案例 (${(counts.cases || 0).toLocaleString()})</button>
          </div>
        </div>
      </div>

      <div class="card row" style="padding:10px 14px;flex-wrap:wrap;gap:10px">
        <input type="search" id="matSearch" value="${PS.esc(matQ)}" placeholder="搜索风格名、作者、模型或关键词…" style="max-width:240px">
        <input type="text" id="matTopicIn" value="${PS.esc(matTopic)}" placeholder="填入你的主题（自动替换提示词里的 {topic} / {script}）" class="grow" style="min-width:220px">
        <span class="sub" style="font-size:12px">命中 ${data.total.toLocaleString()} 款 · 第 ${Math.floor((data.offset || 0) / 48) + 1} / ${Math.max(1, Math.ceil(data.total / 48))} 页</span>
      </div>

      <div class="row" style="flex-wrap:wrap;gap:6px">
        <button class="pill ${!matCat ? 'accent' : ''}" data-mc="" style="cursor:pointer;border:0">全部</button>
        ${(data.categories || []).slice(0, 22).map(c => `<button class="pill ${matCat === c.name ? 'accent' : ''}" data-mc="${PS.esc(c.name)}" style="cursor:pointer;border:0">${PS.esc(c.name)} ${c.count}</button>`).join('')}
      </div>

      <div class="grid-3">
        ${(data.items || []).map((it, idx) => `<div class="card stack tight" style="padding:12px">
          ${it.video ? `<video src="${PS.esc(it.video)}" poster="${PS.esc(it.preview || '')}" muted loop playsinline preload="none" onmouseover="this.play()" onmouseout="this.pause()" style="width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:9px;background:#141619"></video>`
            : it.preview ? `<img src="${PS.esc(it.preview)}" alt="${PS.esc(it.name)}" loading="lazy" style="width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:9px;background:var(--sunk)">`
            : ''}
          <div class="row" style="gap:6px">
            <span class="pill" style="font-size:11px">${PS.esc(it.cat)}</span>
            ${it.by ? `<span class="sub clip1" style="font-size:11px">${PS.esc(it.by)}</span>` : ''}
          </div>
          <b style="font-size:14.5px">${PS.esc(it.name)}</b>
          ${it.en ? `<span class="sub mono clip1" style="font-size:11px">${PS.esc(it.en)}</span>` : ''}
          <p class="sub m0" style="font-size:12.5px;line-height:1.5">${PS.esc(it.sum || it.fit || '')}</p>
          <div class="row" style="margin-top:auto;padding-top:6px;gap:6px">
            <button class="btn primary s" data-mcopy="${idx}">${PS.icon('copy', 'sm')}复制提示词</button>
            <button class="btn s" data-mview="${idx}">看详情</button>
            ${it.url ? `<a class="btn s" href="${PS.esc(it.url)}" target="_blank" rel="noopener">原帖 ↗</a>` : ''}
          </div>
        </div>`).join('') || '<div class="card sub">没有匹配的素材，换个关键词试试。</div>'}
      </div>

      ${data.total > 48 ? `<div class="row" style="justify-content:center;gap:10px;padding:12px 0">
        <button class="btn s" id="matPrev" ${matOffset <= 0 ? 'disabled' : ''}>‹ 上一页</button>
        <span class="sub">第 ${Math.floor(matOffset / 48) + 1} / ${Math.max(1, Math.ceil(data.total / 48))} 页（共 ${data.total.toLocaleString()} 款）</span>
        <button class="btn s" id="matNext" ${!data.hasMore ? 'disabled' : ''}>下一页 ›</button>
      </div>` : ''}
    `);

    main.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { matKind = b.dataset.mk; matCat = ''; matOffset = 0; PS.pages.materials(matKind); });
    main.querySelectorAll('[data-mc]').forEach(b => b.onclick = () => { matCat = b.dataset.mc; matOffset = 0; PS.pages.materials(matKind); });
    main.querySelector('#matSearch').onkeydown = e => { if (e.key === 'Enter') { matQ = e.target.value; matOffset = 0; PS.pages.materials(matKind); } };
    main.querySelector('#matPrev')?.addEventListener('click', () => { matOffset = Math.max(0, matOffset - 48); PS.pages.materials(matKind); });
    main.querySelector('#matNext')?.addEventListener('click', () => { if (data.hasMore) { matOffset += 48; PS.pages.materials(matKind); } });
    main.querySelector('#matTopicIn').oninput = e => { matTopic = e.target.value; };
    main.querySelectorAll('[data-mcopy]').forEach(b => b.onclick = () => {
      const it = (data.items || [])[+b.dataset.mcopy];
      if (!it) return;
      navigator.clipboard?.writeText(fillVar(it.prompt || it.sum));
      PS.toast(`已复制「${it.name}」提示词 ✓`, 'good');
    });
    main.querySelectorAll('[data-mview]').forEach(b => b.onclick = () => {
      const it = (data.items || [])[+b.dataset.mview];
      if (!it) return;
      PS.modal({
        title: `${it.name}${it.en ? ' · ' + it.en : ''}`,
        wide: true,
        body: `<div class="stack">
          ${it.video ? `<video src="${PS.esc(it.video)}" controls autoplay loop muted style="width:100%;max-height:320px;border-radius:10px;background:#111"></video>`
            : it.preview ? `<img src="${PS.esc(it.preview)}" style="width:100%;max-height:360px;object-fit:contain;border-radius:10px;background:var(--sunk)">` : ''}
          <p class="m0">${PS.esc(it.sum || '')}</p>
          ${it.fit ? `<div class="callout-warm"><b>适用场景：</b>${PS.esc(it.fit)}</div>` : ''}
          <div><label class="sub" style="display:block;margin-bottom:4px">提示词 / 导演规范</label><pre class="codebox">${PS.esc(fillVar(it.prompt || it.sum))}</pre></div>
        </div>`,
        foot: `<button class="btn primary" id="mCopyModal">复制提示词</button><button class="btn" data-close>关闭</button>`,
        onOpen(mb) {
          mb.querySelector('#mCopyModal').onclick = () => {
            navigator.clipboard?.writeText(fillVar(it.prompt || it.sum));
            PS.toast('已复制到剪贴板 ✓', 'good');
          };
        },
      });
    });
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
          <button class="btn primary s" data-open-topic="${t.id}">写骨架 / 出稿 ›</button>
          <button class="btn ghost s" data-trash="${t.id}">${PS.icon('trash', 'sm')}</button>
        </div>`).join('')}
      </div>

      ${trashed.length ? `<details class="sub"><summary>回收站（${trashed.length} 条，保留 30 天）</summary>
        <div class="stack tight" style="margin-top:8px">${trashed.map(t => `<div class="row card" style="padding:10px 14px"><span class="grow">${PS.esc(t.title)}</span><button class="btn s" data-res="${t.id}">恢复</button></div>`).join('')}</div>
      </details>` : ''}
    `, 'narrow');

    main.querySelector('#quickAdd').onsubmit = async e => {
      e.preventDefault();
      const v = main.querySelector('#qaInput').value.trim();
      if (!v) return;
      try {
        const created = await PS.api('POST', '/api/topics', { title: v, source_ref: '手动添加' });
        PS.S.topics.unshift(created);
      } catch {
        PS.S.topics.unshift({ id: Date.now(), title: v, stage: '写', score: 13, updated: '刚刚', trash: false });
      }
      PS.save();
      PS.toast('已写入选题池（SQLite）', 'good');
      PS.pages.pool();
    };
    main.querySelectorAll('[data-open-topic]').forEach(b => b.onclick = () => {
      const id = +b.dataset.openTopic;
      PS.selectTopicForWrite(id);
      location.hash = `#write/${id}`;
    });
    main.querySelectorAll('[data-trash]').forEach(b => b.onclick = async () => {
      const id = +b.dataset.trash;
      const h = PS.S.topics.find(x => x.id === id);
      if (h) h.trash = true;
      PS.api('PATCH', `/api/topics/${id}`, { trash: true }).catch(() => {});
      PS.save(); PS.pages.pool();
    });
    main.querySelectorAll('[data-res]').forEach(b => b.onclick = async () => {
      const id = +b.dataset.res;
      const h = PS.S.topics.find(x => x.id === id);
      if (h) h.trash = false;
      PS.api('PATCH', `/api/topics/${id}`, { trash: false }).catch(() => {});
      PS.save(); PS.pages.pool();
    });
  };

  PS.selectTopicForWrite = function (id) {
    const t = PS.S.topics.find(x => x.id === +id);
    if (!t) return null;
    PS.S.activeTopicId = t.id;
    PS.S.script.id = t.id;
    PS.S.script.title = t.title || '';
    PS.S.script.body = t.body || '';
    PS.S.script.audit = t.audit?.revised ? t.audit : { value: '', resonate: '', pace: '', revised: '' };
    PS.S.cutProject.hooks = Array.isArray(t.hooks) ? [...t.hooks] : [];
    PS.S.cutProject.pickedHook = Number(t.picked_hook || 0);
    PS.save();
    return t;
  };

  PS.pages.write = function (subId) {
    if (subId && +subId !== PS.S.activeTopicId) {
      PS.selectTopicForWrite(+subId);
    } else if (PS.S.activeTopicId) {
      const t = PS.S.topics.find(x => x.id === PS.S.activeTopicId);
      if (t && PS.S.script.id !== t.id) PS.selectTopicForWrite(t.id);
    }
    const sc = PS.S.script;
    const cp = PS.S.cutProject;
    const chars = (sc.body || '').replace(/\s/g, '').length;

    const main = PS.shell('write', [['选题工作台', '#source'], ['选题池', '#pool'], ['骨架与写稿', '#write']], `
      <div class="ph">
        <div>
          <h1>骨架与口播稿</h1>
          <p>${chars} 字 · 预计口播 ${Math.max(1, Math.round(chars / 250))} 分钟 · 本机 AI：<b>${PS.esc(PS.S.settings.aiBackend)} / ${PS.esc(PS.S.settings.aiModel || 'default')}</b></p>
        </div>
        <div class="acts">
          <button class="btn" id="aiHooksBtn">${PS.icon('spark', 'sm')}用本机 AI 重写钩子</button>
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
    main.querySelector('#saveSc').onclick = async () => {
      sc.title = main.querySelector('#scTitle').value.trim();
      sc.body = main.querySelector('#scBody').value;
      if (PS.S.activeTopicId) {
        const curT = PS.S.topics.find(x => x.id === PS.S.activeTopicId);
        if (curT) { curT.title = sc.title; curT.body = sc.body; curT.picked_hook = cp.pickedHook; curT.hooks = [...(cp.hooks || [])]; }
        await PS.api('PATCH', `/api/topics/${PS.S.activeTopicId}`, { title: sc.title, body: sc.body, picked_hook: cp.pickedHook }).catch(() => {});
      }
      PS.save();
      PS.toast('草稿已写入本地 SQLite', 'good');
    };
    main.querySelector('#aiHooksBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.textContent = '本机 AI 生成中…';
      try {
        const curTitle = main.querySelector('#scTitle').value;
        const curBody = main.querySelector('#scBody').value;
        sc.title = curTitle; sc.body = curBody;
        const res = await PS.api('POST', '/api/ai/hooks', { topic_id: PS.S.activeTopicId, title: curTitle, body: curBody });
        if (res.hooks?.length) {
          cp.hooks = res.hooks; cp.pickedHook = 0;
          const curT = PS.S.topics.find(x => x.id === PS.S.activeTopicId);
          if (curT) { curT.title = curTitle; curT.body = curBody; curT.hooks = [...res.hooks]; curT.picked_hook = 0; }
          PS.save(); PS.toast(`本机 ${res.backend}/${res.model} 已生成 ${res.hooks.length} 条钩子`, 'good'); PS.pages.write(PS.S.activeTopicId);
        }
      } catch (err) {
        PS.toast(err.message, 'warn');
        btn.disabled = false; btn.textContent = '用本机 AI 重写钩子';
      }
    });
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
          <button class="btn" id="runAiAudit">${PS.icon('spark', 'sm')}本机 AI 重审</button>
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

    main.querySelector('#runAiAudit')?.addEventListener('click', async e => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = '三路诊断中…';
      try {
        const res = await PS.api('POST', '/api/ai/audit', { topic_id: PS.S.activeTopicId, title: PS.S.script.title, body: PS.S.script.body });
        if (res.audit) { PS.S.script.audit = res.audit; PS.save(); PS.toast(`本机 ${res.backend}/${res.model} 三路审稿完成`, 'good'); PS.pages.audit(); }
      } catch (err) { PS.toast(err.message, 'warn'); btn.disabled = false; btn.textContent = '本机 AI 重审'; }
    });
    main.querySelector('#acceptAll').onclick = async () => {
      PS.S.script.body = au.revised.map(p => p.text).join('\n\n');
      if (PS.S.activeTopicId) await PS.api('PATCH', `/api/topics/${PS.S.activeTopicId}`, { body: PS.S.script.body }).catch(() => {});
      PS.save();
      PS.toast('已采用改写版本并写入 SQLite', 'good');
    };
    main.querySelector('#finalizeBtn').onclick = async () => {
      const ep42 = PS.S.episodes.find(e => e.episode === 42);
      if (ep42) ep42.finalAt = '今天';
      if (PS.S.activeTopicId) await PS.api('PATCH', `/api/topics/${PS.S.activeTopicId}`, { body: PS.S.script.body, finalize: true }).catch(() => {});
      PS.save();
      PS.toast('稿子已定稿并落盘！正在进入剪辑台', 'good');
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

  // ==================== 剪辑工作台：双模式（一键粗剪 xuanti-cut + 高级动效 park-video-v2）+ 后台实时任务日志 ====================
  let cutStep = 'import'; // import | plan | render
  let cutActiveJob = null;
  let cutPollTimer = null;

  function stopCutPoll() {
    if (cutPollTimer) { clearInterval(cutPollTimer); cutPollTimer = null; }
  }

  PS.pages['cut-todo'] = function () {
    const finalized = PS.S.topics.filter(t => !t.trash && t.final_at);
    PS.shell('cut-todo', [['剪辑工作台', '#cut'], ['待剪', '#cut-todo']], `
      <div class="ph"><div><h1>待剪</h1><p>已定稿待剪辑的稿件，或直接进入剪辑台导入本地原片 / SRT。</p></div><div class="acts"><a class="btn primary" href="#cut">打开剪辑台 ›</a></div></div>
      <div class="stack tight">
        ${finalized.map(t => `<div class="card row" style="padding:13px 16px">
          <div class="min0 grow"><b>${PS.esc(t.title)}</b><div class="sub">定稿于 ${PS.esc((t.final_at || '').slice(0, 16).replace('T', ' '))}</div></div>
          <a class="btn primary s" href="#cut">去剪这条 ›</a>
        </div>`).join('') || `<div class="card row"><div class="min0 grow"><b>${PS.esc(PS.S.cutProject.title)}</b><div class="sub">原片：${PS.esc(PS.S.cutProject.sourceFile || '未导入')} · ${PS.esc(PS.S.cutProject.duration || '–')}</div></div><a class="btn primary s" href="#cut">进入剪辑台 ›</a></div>`}
      </div>
    `, 'mid');
  };

  PS.pages.cut = function (sub) {
    if (['import', 'plan', 'render'].includes(sub)) cutStep = sub;
    if (sub === 'hook') cutStep = 'plan';
    if (sub === 'motion') cutStep = 'plan';
    if (sub === 'hand') cutStep = 'render';

    const cp = PS.S.cutProject;
    const cutId = cp.id || 1;
    const mode = cp.mode || 'rough';
    const dropIdx = Array.isArray(cp.dropIdx) ? cp.dropIdx : [];
    const hookIdx = Array.isArray(cp.hookIdx) ? cp.hookIdx : [];
    const pauseS = Number(cp.pauseS || 0.8);
    const env = PS.S.cutEnv || {};
    const cutAg = PS.S.settings.cutAgentBackend && PS.S.settings.cutAgentBackend !== 'inherit'
      ? `${PS.S.settings.cutAgentBackend}${PS.S.settings.cutAgentModel ? ' / ' + PS.S.settings.cutAgentModel : ''}`
      : `跟随全局 (${PS.S.settings.aiBackend || 'gemini'})`;

    const jobBoxHtml = cutActiveJob ? `
      <div class="card stack tight" id="cutJobBox" style="border-color:${cutActiveJob.state === 'failed' ? 'var(--hot)' : cutActiveJob.state === 'done' ? 'var(--good)' : 'var(--accent)'}">
        <div class="row">
          <span class="pill ${cutActiveJob.state === 'done' ? 'good' : cutActiveJob.state === 'failed' ? 'warn' : 'accent'}">${cutActiveJob.state === 'running' ? '● 执行中…' : cutActiveJob.state === 'done' ? '✓ 已完成' : '✕ 失败'}</span>
          <b>${PS.esc(cutActiveJob.title)}</b>
          <span class="grow"></span>
          ${cutActiveJob.state !== 'running' ? '<button class="btn s" id="clearCutJob">收起日志</button>' : ''}
        </div>
        <pre class="codebox" id="cutJobLog" style="max-height:200px">${PS.esc((cutActiveJob.logs || []).join('\n'))}</pre>
        ${cutActiveJob.state === 'done' && cutActiveJob.result?.publishEpisode ? `
          <div class="row" style="padding:10px 12px;background:var(--good-soft);border-radius:10px">
            <div class="min0 grow"><b style="color:var(--good)">成片已自动落盘到统一工程目录！</b><div class="sub mono" style="font-size:11.5px">${PS.esc(cutActiveJob.result.videoPath)}</div></div>
            <a class="btn primary s" href="#pub-confirm">一键去发布工作台填表 ›</a>
          </div>
        ` : ''}
        ${cutActiveJob.state === 'done' && cutActiveJob.result?.agentReply ? `
          <details open><summary style="font-size:12.5px;font-weight:600;cursor:pointer">独立剪辑 Agent 执行回执（${PS.esc(cutActiveJob.result.backend)}/${PS.esc(cutActiveJob.result.model)}）</summary>
            <div class="md-body" style="margin-top:8px;padding:10px 12px;background:var(--sunk);border-radius:9px">${PS.md(cutActiveJob.result.agentReply)}</div>
          </details>
        ` : ''}
      </div>` : '';

    let body = '';
    if (cutStep === 'import') {
      const readyProjs = (PS.S.projects?.projects || []).filter(p => p.videoPath).slice(0, 6);
      body = `<div class="stack">
        <div class="card stack">
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <b>导入本机原片 / 剪映 SRT（100% 本地处理，绝不上传云端）</b>
            <span class="grow"></span>
            <span class="pill ${env.ffmpeg ? 'good' : 'warn'}">ffmpeg ${env.ffmpeg ? '✓' : '缺失'}</span>
            <span class="pill ${env.transcribe ? 'good' : 'warn'}">转写：${PS.esc(env.transcribe || '未安装')}</span>
          </div>
          <div class="sys-2col">
            <div><label class="sub" style="display:block;margin-bottom:4px">视频标题（将用于生成统一工程目录名）</label><input type="text" id="ciTitle" value="${PS.esc(cp.title || '')}" placeholder="如：AI 时代怎么搭本地内容生产线"></div>
            <div><label class="sub" style="display:block;margin-bottom:4px">本机原片路径（.mp4 / .mov）</label><input type="text" id="ciVideo" class="mono" value="${PS.esc(cp.sourceFile || '')}" placeholder="/Volumes/.../raw.mov 或 ~/Movies/.../raw.mp4"></div>
          </div>
          <div>
            <label class="sub" style="display:block;margin-bottom:4px">可选：剪映导出的 .srt 字幕路径（高级动效模式可直接毫秒级导入，免重新转写）</label>
            <input type="text" id="ciSrt" class="mono" value="${PS.esc(cp.srtPath || '')}" placeholder="留空则在下方点「本机 mlx-whisper 离线转写」">
          </div>
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <button class="btn" id="ciLoadBtn">1. 校验并载入媒体</button>
            <button class="btn primary" id="ciTranscribeBtn">${PS.icon('mic', 'sm')}2. 本机 ${PS.esc(env.transcribe || 'mlx-whisper')} 离线转写 + 标口误</button>
            ${cp.hasRealTranscript || (cp.lines || []).length ? '<button class="btn" id="toPlanBtn">已有逐字稿 → 下一步 ›</button>' : ''}
          </div>
          ${cp.videoInfo ? `<div class="sub mono" style="font-size:12px">已识别视频：${cp.videoInfo.width}×${cp.videoInfo.height} · ${cp.videoInfo.fps}fps · ${cp.videoInfo.durationText} · ${cp.videoInfo.sizeMb} MB</div>` : ''}
        </div>

        ${readyProjs.length ? `<div class="card stack tight">
          <div class="row"><b style="font-size:13.5px">快速从本地工程目录选一条视频试剪</b><span class="sub">扫描自 ${PS.esc(PS.S.projects?.root || '')}</span></div>
          ${readyProjs.map((p, idx) => `<div class="row" style="padding:7px 0;border-top:1px solid var(--line-soft)">
            <div class="min0 grow"><b style="font-size:13px">${PS.esc(p.name)}</b><div class="sub mono clip1" style="font-size:11px">${PS.esc(p.videoPath)}</div></div>
            <button class="btn s" data-pick-proj="${idx}">填入路径</button>
          </div>`).join('')}
        </div>` : ''}
      </div>`;
    } else if (cutStep === 'plan') {
      const lines = cp.lines || [];
      const keptCount = lines.filter(l => !dropIdx.includes(l.i)).length;
      if (mode === 'rough') {
        body = `<div class="stack">
          <div class="card row" style="padding:12px 16px;flex-wrap:wrap;gap:10px">
            <span class="pill accent">一键粗剪模式</span>
            <span class="sub">共 ${lines.length} 句 · 保留 <b>${keptCount}</b> 句 · 剪掉 <b>${dropIdx.length}</b> 句 · Hook <b>${hookIdx.length}</b> 句</span>
            <span class="grow"></span>
            <span class="sub">停顿缩短阈值：</span>
            <div class="seg">
              ${[0.5, 0.8, 1.2].map(v => `<button class="${pauseS === v ? 'on' : ''}" data-pause="${v}">${v}s</button>`).join('')}
            </div>
            <button class="btn s" id="aiPlanBtn">${PS.icon('spark', 'sm')}独立剪辑 Agent 挑 Hook</button>
            <button class="btn primary s" id="toRenderBtn">下一步：一键渲染成片 ›</button>
          </div>

          <div class="card stack tight" style="max-height:62vh;overflow-y:auto">
            <div class="row" style="padding-bottom:8px;border-bottom:1px solid var(--line-soft)">
              <b>逐字稿审阅（点右侧「剪/留」控制是否剪掉，点「Hook」把原话放到成片最前）</b>
              <span class="grow"></span>
              <span class="sub" style="font-size:12px">已自动标出说错重来 / 语气词</span>
            </div>
            ${lines.map(l => {
              const dropped = dropIdx.includes(l.i);
              const hooked = hookIdx.includes(l.i);
              return `<div class="row" style="padding:7px 10px;border-radius:8px;background:${hooked ? 'var(--accent-soft)' : dropped ? 'var(--sunk)' : 'transparent'};opacity:${dropped ? '.52' : '1'};gap:8px;align-items:flex-start">
                <span class="mono sub" style="font-size:11.5px;min-width:44px;margin-top:2px">${PS.esc(l.ts || '')}</span>
                <div class="min0 grow" style="font-size:13.5px;line-height:1.55;${dropped ? 'text-decoration:line-through' : ''}">
                  ${l.cutReason ? `<span class="pill warn" style="padding:0 6px;font-size:10.5px;margin-right:5px">自动标剪：${PS.esc(l.cutReason)}</span>` : ''}
                  ${hooked ? '<span class="pill accent" style="padding:0 6px;font-size:10.5px;margin-right:5px">Hook</span>' : ''}
                  ${PS.esc(l.text)}
                </div>
                <button class="btn s ${hooked ? 'primary' : ''}" data-hk="${l.i}" ${dropped ? 'disabled' : ''}>Hook</button>
                <button class="btn s" data-drop="${l.i}">${dropped ? '恢复保留' : '剪掉'}</button>
              </div>`;
            }).join('') || '<div style="padding:20px" class="sub">暂无逐字稿，请先回第 1 步导入原片并转写。</div>'}
          </div>
        </div>`;
      } else {
        body = `<div class="stack">
          <div class="card row" style="padding:12px 16px;flex-wrap:wrap;gap:10px">
            <span class="pill info">高级动效模式（Spec Table）</span>
            <span class="mono sub" style="font-size:12px">${PS.esc(cp.sourceFile || '未绑定原片')}</span>
            <span class="grow"></span>
            <span class="sub">动效密度：</span>
            <div class="seg">
              ${['低', '中', '高'].map(lv => `<button class="${cp.density === lv ? 'on' : ''}" data-den="${lv}">${lv}</button>`).join('')}
            </div>
            <button class="btn primary s" id="aiPlanBtn">${PS.icon('spark', 'sm')}独立剪辑 Agent 自动排镜头表</button>
            <a class="btn s" href="#materials/motion">挑动效素材 ›</a>
          </div>

          <div class="cut-split">
            <div class="card stack tight" style="max-height:60vh;overflow-y:auto">
              <div class="card-h"><h3>口播逐字稿（点「Hook」标开头 · 点行定位镜头）</h3></div>
              ${lines.map(l => `<div class="tx-line ${hookIdx.includes(l.i) ? 'hook' : ''} ${cp.selectedShot && cp.selectedShot === l.shot ? 'sel' : ''}" data-pick-shot="${l.shot || 0}">
                ${l.shot ? `<span class="shot-chip ${cp.selectedShot === l.shot ? 'on' : ''}">${l.shot}</span>` : ''}
                <span class="mono sub" style="margin-right:6px">${PS.esc(l.ts || '')}</span>
                ${hookIdx.includes(l.i) ? '<span class="pill accent" style="margin-right:5px;padding:0 6px;font-size:10.5px">Hook</span>' : ''}
                <span>${PS.esc(l.text)}</span>
                <button type="button" class="link-muted" data-hk="${l.i}" style="float:right;font-size:11px">${hookIdx.includes(l.i) ? '取消Hook' : '+Hook'}</button>
              </div>`).join('') || '<div class="sub">请先在第 1 步导入原片或 .srt 字幕</div>'}
            </div>

            <div class="stack tight">
              ${(cp.shots || []).map(s => `<div class="spec-card ${cp.selectedShot === s.id ? 'on' : ''}" data-pick-shot="${s.id}">
                <div class="row">
                  <span class="shot-chip ${cp.selectedShot === s.id ? 'on' : ''}">${s.id}</span>
                  <b>${PS.esc(s.style)}</b>
                  <span class="sub mono">${PS.esc(s.ts || '')}</span>
                  <span class="grow"></span>
                  <button class="btn s" data-swap="${s.id}">换动效</button>
                </div>
                <div class="spec-prev"><span>${PS.esc(s.preview)}</span><span style="opacity:.55;font-size:11px">SPEC #${s.id}</span></div>
                <textarea rows="2" data-reason="${s.id}" style="font-size:12.5px">${PS.esc(s.reason)}</textarea>
              </div>`).join('')}
              <div class="row" style="margin-top:6px"><span class="grow"></span><button class="btn primary" id="toRenderBtn">下一步：渲染与落盘 ›</button></div>
            </div>
          </div>
        </div>`;
      }
    } else {
      const promptTxt = `按 ~/.park-studio/projects/EP${cp.episode}/worktable.json 里的 Hook（第 ${hookIdx.join('、') || '无'} 句）和 ${(cp.shots || []).length} 个动效镜头表，用 park-video-v2 剪辑 ${cp.sourceFile}（${cp.burnSubs ? '烧字幕' : '不烧字幕'}），成片输出到统一工程目录 final/上传/。`;
      body = `<div class="stack" style="max-width:780px;margin:0 auto">
        <div class="card stack">
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <b>${mode === 'rough' ? '一键粗剪渲染（ffmpeg 两遍 -16 LUFS 响度 + faststart 自动落盘）' : '高级动效渲染（导出 worktable.json + 一键后台触发独立剪辑 Agent）'}</b>
            <span class="grow"></span>
            <div class="seg">
              <button class="${cp.burnSubs ? 'on' : ''}" data-sub="1">烧字幕</button>
              <button class="${!cp.burnSubs ? 'on' : ''}" data-sub="0">不烧字幕</button>
            </div>
          </div>
          <ul class="m0 sub" style="padding-left:18px;line-height:1.8;font-size:13px">
            <li>原片：<code class="mono">${PS.esc(cp.sourceFile || '未导入')}</code></li>
            <li>前置 Hook：已选 <b>${hookIdx.length}</b> 句原话 · 剪掉 <b>${dropIdx.length}</b> 句口误/语气词 · 停顿阈值 <b>${pauseS}s</b></li>
            <li>落盘目标：自动写入统一目录 <code class="mono">&lt;projectRoot&gt;/YYYY-MM-DD_${PS.esc((cp.title || '').slice(0, 20))}/final/上传/</code> 并载入发布工作台</li>
          </ul>
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <button class="btn primary" id="runRenderBtn">${PS.icon('film', 'sm')}${mode === 'rough' ? '一键开始粗剪渲染并落盘' : '一键触发独立剪辑 Agent 执行'}</button>
            <button class="btn" id="dlSpec">导出 / 查看 worktable.json</button>
            <button class="btn" id="copyPrompt">${PS.icon('copy', 'sm')}复制指令备用</button>
          </div>
          <details><summary class="sub" style="font-size:12px;cursor:pointer">查看备用终端指令</summary><pre class="codebox" style="margin-top:8px">${PS.esc(promptTxt)}</pre></details>
        </div>

        ${cp.outputPath ? `<div class="card row" style="border-color:var(--good)">
          <div class="min0 grow"><b style="color:var(--good)">最新渲染成片已落盘</b><div class="sub mono clip1" style="font-size:12px">${PS.esc(cp.outputPath)}</div></div>
          <a class="btn primary s" href="#pub-confirm">去发布工作台填表 ›</a>
        </div>` : ''}
      </div>`;
    }

    const main = PS.shell('cut', [['剪辑工作台', '#cut'], [`EP${cp.episode} · 剪辑`, '#cut']], `
      <div class="ph">
        <div>
          <h1>剪辑 · ${PS.esc(cp.title || '新建剪辑工程')}</h1>
          <p>双模式本地剪辑：一键粗剪（mlx-whisper + ffmpeg）或高级动效（SRT + 镜头表）· <a href="#settings" class="pill" style="padding:1px 8px;font-size:11.5px">独立剪辑 Agent：${PS.esc(cutAg)} ⚙</a></p>
        </div>
        <div class="acts" style="flex-wrap:wrap;gap:8px">
          <div class="seg">
            <button class="${mode === 'rough' ? 'on' : ''}" data-cmode="rough">一键粗剪</button>
            <button class="${mode === 'motion' ? 'on' : ''}" data-cmode="motion">高级动效</button>
          </div>
          <div class="stepper">
            <button class="step-btn ${cutStep === 'import' ? 'on' : ''}" data-cs="import"><i>1</i>导入转写</button>
            <button class="step-btn ${cutStep === 'plan' ? 'on' : ''}" data-cs="plan"><i>2</i>${mode === 'rough' ? '删口误 · Hook' : '镜头表'}</button>
            <button class="step-btn ${cutStep === 'render' ? 'on' : ''}" data-cs="render"><i>3</i>渲染落盘</button>
          </div>
        </div>
      </div>
      ${jobBoxHtml}
      ${body}
    `);

    const syncCutPatch = async patch => {
      try {
        const updated = await PS.api('PATCH', `/api/cut/${cutId}`, patch);
        PS.S.cutProject = { ...PS.S.cutProject, ...updated };
        PS.save();
      } catch (e) {}
    };

    const watchJob = (job, onDone) => {
      cutActiveJob = job;
      stopCutPoll();
      PS.pages.cut();
      cutPollTimer = setInterval(async () => {
        try {
          const j = await PS.api('GET', `/api/cut/jobs/${job.id}`);
          cutActiveJob = j;
          const logEl = document.getElementById('cutJobLog');
          if (logEl) { logEl.textContent = (j.logs || []).join('\n'); logEl.scrollTop = logEl.scrollHeight; }
          if (j.state !== 'running') {
            stopCutPoll();
            try {
              const fresh = await PS.api('GET', `/api/cut/${cutId}`);
              PS.S.cutProject = { ...PS.S.cutProject, ...fresh };
              if (j.result?.publishEpisode) await PS.syncFromBackend();
              PS.save();
            } catch (e) {}
            if (j.state === 'done') {
              PS.toast(`${j.title} 完成 ✓`, 'good');
              if (onDone) onDone(j);
            } else {
              PS.toast(j.error || '剪辑任务失败', 'warn');
            }
            PS.pages.cut();
          }
        } catch (e) { stopCutPoll(); }
      }, 900);
    };

    main.querySelector('#clearCutJob')?.addEventListener('click', () => { cutActiveJob = null; PS.pages.cut(); });
    main.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { cutStep = b.dataset.cs; PS.pages.cut(); });
    main.querySelectorAll('[data-cmode]').forEach(b => b.onclick = async () => {
      cp.mode = b.dataset.cmode;
      await syncCutPatch({ mode: cp.mode });
      PS.pages.cut();
    });

    // Step 1: 导入原片/SRT + 后台离线转写
    const readyProjs = (PS.S.projects?.projects || []).filter(p => p.videoPath).slice(0, 6);
    main.querySelectorAll('[data-pick-proj]').forEach(b => b.onclick = () => {
      const p = readyProjs[+b.dataset.pickProj];
      if (!p) return;
      main.querySelector('#ciTitle').value = p.title || p.name;
      main.querySelector('#ciVideo').value = p.videoPath;
    });
    main.querySelector('#ciLoadBtn')?.addEventListener('click', async e => {
      const video_path = main.querySelector('#ciVideo').value.trim();
      const srt_path = main.querySelector('#ciSrt').value.trim();
      const title = main.querySelector('#ciTitle').value.trim();
      e.currentTarget.disabled = true;
      try {
        const res = await PS.api('POST', `/api/cut/${cutId}/import-media`, { video_path, srt_path, title, mode });
        PS.S.cutProject = { ...PS.S.cutProject, ...res.cutProject };
        PS.save();
        PS.toast(srt_path ? '已载入视频与 SRT 字幕，直接进入第 2 步 ✓' : '原片校验通过！点击「2. 本机离线转写」生成逐字稿', 'good');
        if (srt_path) cutStep = 'plan';
        PS.pages.cut();
      } catch (err) {
        PS.toast(err.message || '导入失败', 'warn');
        e.currentTarget.disabled = false;
      }
    });
    main.querySelector('#ciTranscribeBtn')?.addEventListener('click', async e => {
      const video_path = main.querySelector('#ciVideo').value.trim();
      if (!video_path) return PS.toast('请先填好本机原片 .mp4 / .mov 路径', 'warn');
      e.currentTarget.disabled = true;
      try {
        await PS.api('POST', `/api/cut/${cutId}/import-media`, {
          video_path, srt_path: '', title: main.querySelector('#ciTitle').value.trim(), mode,
        });
        const res = await PS.api('POST', `/api/cut/${cutId}/transcribe`, { video_path, lang: 'zh' });
        watchJob(res.job, () => { cutStep = 'plan'; });
      } catch (err) {
        PS.toast(err.message || '启动转写失败', 'warn');
        e.currentTarget.disabled = false;
      }
    });
    main.querySelector('#toPlanBtn')?.addEventListener('click', () => { cutStep = 'plan'; PS.pages.cut(); });
    main.querySelector('#toRenderBtn')?.addEventListener('click', () => { cutStep = 'render'; PS.pages.cut(); });

    // Step 2: 删口误 / 勾 Hook / 停顿阈值 / 独立剪辑 Agent 排镜头
    main.querySelectorAll('[data-hk]').forEach(el => el.onclick = async e => {
      e.stopPropagation();
      const i = +el.dataset.hk;
      cp.hookIdx = hookIdx.includes(i) ? hookIdx.filter(x => x !== i) : [...hookIdx, i].slice(0, 3).sort((a, b) => a - b);
      await syncCutPatch({ hook_idx: cp.hookIdx });
      PS.pages.cut();
    });
    main.querySelectorAll('[data-drop]').forEach(el => el.onclick = async () => {
      const i = +el.dataset.drop;
      cp.dropIdx = dropIdx.includes(i) ? dropIdx.filter(x => x !== i) : [...dropIdx, i].sort((a, b) => a - b);
      if (cp.dropIdx.includes(i) && (cp.hookIdx || []).includes(i)) {
        cp.hookIdx = cp.hookIdx.filter(x => x !== i);
      }
      await syncCutPatch({ drop_idx: cp.dropIdx, hook_idx: cp.hookIdx });
      PS.pages.cut();
    });
    main.querySelectorAll('[data-pause]').forEach(b => b.onclick = async () => {
      cp.pauseS = Number(b.dataset.pause);
      await syncCutPatch({ pause_s: cp.pauseS });
      PS.pages.cut();
    });
    main.querySelectorAll('[data-den]').forEach(b => b.onclick = async () => {
      cp.density = b.dataset.den;
      await syncCutPatch({ density: cp.density });
      PS.pages.cut();
    });
    main.querySelector('#aiPlanBtn')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      try {
        const res = await PS.api('POST', `/api/cut/${cutId}/ai-plan`, {});
        watchJob(res.job);
      } catch (err) {
        PS.toast(err.message || '独立剪辑 Agent 规划失败', 'warn');
        e.currentTarget.disabled = false;
      }
    });
    main.querySelectorAll('[data-pick-shot]').forEach(el => el.onclick = e => {
      if (e.target.closest('button,textarea')) return;
      const sid = +el.dataset.pickShot;
      if (sid) { cp.selectedShot = sid; PS.pages.cut(); }
    });
    main.querySelectorAll('[data-swap]').forEach(b => b.onclick = async () => {
      const s = (cp.shots || []).find(x => x.id === +b.dataset.swap);
      if (!s) return;
      const styles = ['画中画 · 居中大字弹出', '数据高亮卡（焦橙冲击）', '左右分屏对比动效', '关键词阶梯浮现', '录屏特写放大'];
      s.style = styles[(styles.indexOf(s.style) + 1) % styles.length];
      await syncCutPatch({ shots: cp.shots });
      PS.pages.cut();
    });

    // Step 3: 渲染与落盘
    main.querySelectorAll('[data-sub]').forEach(b => b.onclick = async () => {
      cp.burnSubs = b.dataset.sub === '1';
      await syncCutPatch({ burn_subs: cp.burnSubs });
      PS.pages.cut();
    });
    main.querySelector('#runRenderBtn')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      try {
        const res = await PS.api('POST', `/api/cut/${cutId}/render`, {
          mode, drop_idx: cp.dropIdx || [], hook_idx: cp.hookIdx || [], pause_s: cp.pauseS || 0.8, burn_subs: !!cp.burnSubs,
        });
        watchJob(res.job);
      } catch (err) {
        PS.toast(err.message || '渲染启动失败', 'warn');
        e.currentTarget.disabled = false;
      }
    });
    main.querySelector('#copyPrompt')?.addEventListener('click', () => {
      const pTxt = `按 ~/.park-studio/projects/EP${cp.episode}/worktable.json 里的 Hook（第 ${hookIdx.join('、') || '无'} 句）和 ${(cp.shots || []).length} 个动效镜头表，用 park-video-v2 剪辑 ${cp.sourceFile}（${cp.burnSubs ? '烧字幕' : '不烧字幕'}），成片输出到统一工程目录 final/上传/。`;
      navigator.clipboard?.writeText(pTxt);
      PS.toast('已复制备用渲染指令 ✓', 'good');
    });
    main.querySelector('#dlSpec')?.addEventListener('click', async () => {
      const res = await PS.api('POST', `/api/cut/${cutId}/export-worktable`);
      PS.toast(`已导出到：${res.path}`, 'good');
      PS.modal({
        title: `worktable.json 已落盘：${res.path}`, wide: true,
        body: `<pre class="codebox">${PS.esc(JSON.stringify(res.payload, null, 2))}</pre>`,
        foot: `<button class="btn primary" data-close>关闭</button>`,
      });
    });
  };

  PS.pages['cut-done'] = function () {
    const readyProjs = (PS.S.projects?.projects || []).filter(p => p.videoPath);
    PS.shell('cut-done', [['剪辑工作台', '#cut'], ['剪好了', '#cut-done']], `
      <div class="ph"><div><h1>剪好了（统一工程目录成片）</h1><p>扫描自 <code class="mono">${PS.esc(PS.S.projects?.root || '')}</code>，共 ${readyProjs.length} 个可直接载入发布工作台的成片工程。</p></div></div>
      <div class="stack tight">
        ${readyProjs.map(p => `<div class="card row" style="padding:13px 16px">
          <div class="min0 grow"><b>${PS.esc(p.name)}</b><div class="sub mono clip1" style="font-size:12px">${PS.esc(p.videoPath)}</div></div>
          <a class="btn primary s" href="#pub-pack">载入发布打包 ›</a>
        </div>`).join('') || '<div class="card sub">暂无已剪好的成片，去「剪辑中」一键粗剪即可自动落盘到这里。</div>'}
      </div>
    `, 'mid');
  };
})();
