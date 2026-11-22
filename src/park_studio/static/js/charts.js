/* 纯 SVG 交互图表库：按平台堆叠涨粉柱状图（带发布日标注与悬停提示）、Sparkline、抖音时长×播放散点图 */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});

  const niceMax = v => {
    const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 3 ? 3 : m <= 5 ? 5 : 10) * p;
  };

  PS.drawStackedFans = function (el, followers, activePlats, episodes) {
    if (!el) return;
    const anyPlat = activePlats[0] || 'douyin';
    const days = Object.keys(followers[anyPlat] || {}).sort().slice(-24);
    if (days.length < 2) { el.innerHTML = '<div class="sub">暂无足够历史数据</div>'; return; }

    const marks = {};
    for (const ep of episodes) {
      if (ep.schedule) marks[ep.schedule.slice(0, 10)] = `EP${ep.episode} ${ep.nick}`;
    }

    const W = Math.max(360, el.clientWidth || 540);
    const H = Math.max(175, el.clientHeight || 188);
    const L = 40, R = 8, T = 22, B = 22;
    const pw = W - L - R, ph = H - T - B;
    const band = pw / days.length;
    const bw = Math.min(20, Math.max(5, band - 5));

    const rows = days.map((d, idx) => {
      const prev = idx > 0 ? days[idx - 1] : null;
      const segs = [];
      for (const p of activePlats) {
        const cur = followers[p]?.[d];
        const pre = prev ? followers[p]?.[prev] : null;
        const v = (cur != null && pre != null) ? Math.max(0, cur - pre) : 0;
        if (v > 0) segs.push({ p, v });
      }
      return { d, segs, tot: segs.reduce((s, x) => s + x.v, 0) };
    });

    const top = niceMax(Math.max(...rows.map(r => r.tot), 10));
    const Y = v => T + ph - (v / top) * ph;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
    for (const tk of [0, top / 2, top]) {
      const y = Y(tk).toFixed(1);
      svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line-soft)" stroke-dasharray="${tk === 0 ? '' : '3 3'}"/>`;
      svg += `<text x="${L - 6}" y="${+y + 4}" text-anchor="end">${tk ? '+' : ''}${Math.round(tk)}</text>`;
    }

    let lastMarkX = -999;
    rows.forEach((r, i) => {
      const x = L + i * band + (band - bw) / 2;
      let acc = 0;
      r.segs.forEach((g, j) => {
        const y1 = Y(acc), y2 = Y(acc + g.v);
        const hh = Math.max(1.5, y1 - y2 - (j < r.segs.length - 1 ? 1 : 0));
        acc += g.v;
        const col = `var(--p-${g.p}, ${PS.PLATFORMS[g.p]?.color || '#C2480A'})`;
        svg += `<rect x="${x.toFixed(1)}" y="${y2.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="${j === r.segs.length - 1 ? 3 : 1}" fill="${col}" fill-opacity="0.88"/>`;
      });

      const mk = marks[r.d];
      const cx = x + bw / 2;
      if (mk) {
        svg += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${T - 6}" y2="${T + ph}" stroke="var(--accent)" stroke-opacity="0.55" stroke-dasharray="3 3"/>`;
        if (cx - lastMarkX > 48) {
          lastMarkX = cx;
          const shortMk = mk.split(' ')[0];
          svg += `<text x="${cx.toFixed(1)}" y="${T - 9}" text-anchor="${i > rows.length - 3 ? 'end' : 'middle'}" style="fill:var(--accent);font-weight:700;font-size:10.5px">${PS.esc(shortMk)}</text>`;
        }
      }
      if ((i % 5 === 0 && rows.length - 1 - i >= 4) || i === rows.length - 1) {
        svg += `<text x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="${i === rows.length - 1 ? 'end' : 'middle'}">${r.d.slice(5)}</text>`;
      }

      const tipLines = [
        `${r.d}${mk ? ' · ' + mk + ' 发布' : ''}`,
        ...r.segs.map(g => `${PS.PLATFORMS[g.p].name}  +${g.v}`),
        `当日合计  +${r.tot}`,
      ].join('\n');
      svg += `<rect x="${(L + i * band).toFixed(1)}" y="${T}" width="${band.toFixed(1)}" height="${ph}" fill="transparent" data-tip="${PS.esc(tipLines)}"/>`;
    });

    svg += '</svg>';
    el.innerHTML = svg;
  };

  PS.sparklineSVG = function (platId, seriesMap) {
    const days = Object.keys(seriesMap || {}).sort().slice(-30);
    if (days.length < 3) return '';
    const vals = days.map(d => seriesMap[d]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const W = 200, H = 38;
    const X = i => (i / (vals.length - 1)) * W;
    const Y = v => H - 3 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 8);
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const col = `var(--p-${platId}, ${PS.PLATFORMS[platId]?.color || '#C2480A'})`;
    const gid = `sp-${platId}`;
    const tip = `${PS.PLATFORMS[platId].name} 近 ${days.length} 天\n${PS.fmt(vals[0])} → ${PS.fmt(vals[vals.length - 1])} (+${PS.fmt(vals[vals.length - 1] - vals[0])})`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" data-tip="${PS.esc(tip)}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.24"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#${gid})"/>
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  };

  PS.drawDouyinScatter = function (el) {
    if (!el) return;
    const pts = [
      { t: 'EP41 本地 Agent 填 7 平台', sec: 462, views: 38420, mult: 2.4 },
      { t: 'EP40 AI 知识树内化', sec: 518, views: 62400, mult: 3.9 },
      { t: 'EP39 三路审稿拉高完播', sec: 395, views: 89100, mult: 5.5 },
      { t: 'EP38 Obsidian 接入工作台', sec: 310, views: 44800, mult: 2.8 },
      { t: 'EP37 别再用提示词模板了', sec: 185, views: 19200, mult: 1.2 },
      { t: 'EP36 独立开发者内容获客', sec: 440, views: 53600, mult: 3.3 },
      { t: 'EP35 选题打分 15 分法', sec: 260, views: 27400, mult: 1.7 },
      { t: 'EP34 口播去口水话实测', sec: 210, views: 16200, mult: 1.0 },
      { t: 'EP33 为什么 99% 人不复盘', sec: 360, views: 71800, mult: 4.5 },
    ];
    const W = Math.max(400, el.clientWidth || 620), H = 240;
    const L = 52, R = 18, T = 16, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const maxSec = 600, maxV = 100000;
    const X = s => L + (s / maxSec) * pw;
    const Y = v => T + ph - (v / maxV) * ph;

    let svg = `<svg viewBox="0 0 ${W} ${H}">`;
    for (const v of [0, 25000, 50000, 75000, 100000]) {
      const y = Y(v).toFixed(1);
      svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line-soft)" stroke-dasharray="${v ? '3 3' : ''}"/>`;
      svg += `<text x="${L - 8}" y="${+y + 4}" text-anchor="end">${v ? (v / 10000) + '万' : '0'}</text>`;
    }
    for (const s of [120, 240, 360, 480, 600]) {
      const x = X(s).toFixed(1);
      svg += `<text x="${x}" y="${H - 8}" text-anchor="middle">${s / 60}分钟</text>`;
    }
    // 中位数基线
    svg += `<line x1="${L}" x2="${W - R}" y1="${Y(16000).toFixed(1)}" y2="${Y(16000).toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="5 4" stroke-opacity="0.5"/>`;
    svg += `<text x="${W - R - 4}" y="${Y(16000) - 5}" text-anchor="end" style="fill:var(--ink-3)">账号中位数 1.6万</text>`;

    for (const p of pts) {
      const cx = X(p.sec).toFixed(1), cy = Y(p.views).toFixed(1);
      const gold = p.mult >= 3;
      const r = gold ? 8 : 5.5;
      const tip = `${p.t}\n时长：${Math.floor(p.sec / 60)}分${p.sec % 60}秒\n播放：${PS.fmt(p.views)}（${p.mult}× 平时）`;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${gold ? '#E2A21B' : 'var(--accent)'}" fill-opacity="${gold ? 0.92 : 0.65}" stroke="var(--surface)" stroke-width="2" data-tip="${PS.esc(tip)}" style="cursor:pointer"/>`;
    }
    svg += '</svg>';
    el.innerHTML = svg;
  };
})();
