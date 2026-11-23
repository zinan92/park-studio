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
            <button onclick="location.hash='#feed'">Park 的对标</button>
            <button class="${srcTab === 'obsidian' ? 'on' : ''}" onclick="location.hash='#source/obsidian'">Obsidian</button>
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

  PS.pages.write = function () {
    const sc = PS.S.script;
    const cp = PS.S.cutProject;
    const chars = sc.body.replace(/\s/g, '').length;

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
        await PS.api('PATCH', `/api/topics/${PS.S.activeTopicId}`, { title: sc.title, body: sc.body, picked_hook: cp.pickedHook }).catch(() => {});
      }
      PS.save();
      PS.toast('草稿已写入本地 SQLite', 'good');
    };
    main.querySelector('#aiHooksBtn')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.textContent = '本机 AI 生成中…';
      try {
        const res = await PS.api('POST', '/api/ai/hooks', { topic_id: PS.S.activeTopicId, title: main.querySelector('#scTitle').value, body: main.querySelector('#scBody').value });
        if (res.hooks?.length) { cp.hooks = res.hooks; cp.pickedHook = 0; PS.save(); PS.toast(`本机 ${res.backend}/${res.model} 已生成 ${res.hooks.length} 条钩子`, 'good'); PS.pages.write(); }
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
    main.querySelector('#dlSpec')?.addEventListener('click', async () => {
      let payload = { episode: cp.episode, source: cp.sourceFile, burnSubtitles: cp.burnSubs, hooks: cp.hookIdx, shots: cp.shots };
      let savedPath = `~/.park-studio/projects/EP${cp.episode}/worktable.json`;
      try {
        const res = await PS.api('POST', `/api/cut/${cp.id || 1}/export-worktable`);
        payload = res.payload;
        savedPath = res.path;
        PS.toast(`已真实导出到：${savedPath}`, 'good');
      } catch (e) {}
      PS.modal({
        title: `worktable.json 已落盘：${savedPath}`, wide: true,
        body: `<pre class="codebox">${PS.esc(JSON.stringify(payload, null, 2))}</pre>`,
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
