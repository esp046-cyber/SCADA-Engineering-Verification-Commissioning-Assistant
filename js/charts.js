/* SVG / CSS charts built from live data */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h, NS = 'http://www.w3.org/2000/svg';
  SV.COLORS = { pass: '#47d37f', fail: '#ff6464', none: '#6b7c8b', na: '#465663', prog: '#62b0ee', warn: '#ff9f43', crit: '#ff4d6d', accent: '#f2c230' };
  const el = (n, a) => { const e = document.createElementNS(NS, n); Object.keys(a || {}).forEach((k) => e.setAttribute(k, a[k])); return e; };
  SV.charts = {
    donut(data, o) {
      o = o || {}; const size = o.size || 150, R = size / 2 - 14, C = 2 * Math.PI * R, total = data.reduce((a, d) => a + d.value, 0);
      const svg = el('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img', 'aria-label': (o.title || 'Chart') + ': ' + data.map((d) => d.label + ' ' + d.value).join(', ') });
      svg.appendChild(el('circle', { cx: size / 2, cy: size / 2, r: R, fill: 'none', stroke: '#0c1116', 'stroke-width': 18 }));
      let off = 0;
      if (total > 0) data.forEach((d) => { if (d.value <= 0) return; const len = (d.value / total) * C; svg.appendChild(el('circle', { cx: size / 2, cy: size / 2, r: R, fill: 'none', stroke: d.color, 'stroke-width': 18, 'stroke-dasharray': len + ' ' + (C - len), 'stroke-dashoffset': -off, transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')' })); off += len; });
      const t1 = el('text', { x: size / 2, y: size / 2 + 2, 'text-anchor': 'middle', fill: '#e8eef3', 'font-size': 26, 'font-weight': 700, 'font-family': 'monospace' }); t1.textContent = o.big !== undefined ? o.big : total;
      const t2 = el('text', { x: size / 2, y: size / 2 + 20, 'text-anchor': 'middle', fill: '#a3b5c4', 'font-size': 11 }); t2.textContent = o.small || (total ? 'total' : 'no data');
      svg.append(t1, t2);
      return h('div', { class: 'chart' }, svg, h('ul', { class: 'legend-list' }, data.map((d) => h('li', null, h('span', { class: 'sw', style: 'background:' + d.color }), d.label + ': ', h('b', null, String(d.value)), total ? h('span', { class: 'faint' }, ' (' + SV.pct(d.value, total) + '%)') : null))));
    },
    /* rows: [{label, segs:[{value,color,label}], text}] — 100% stacked per row */
    stacked(rows, o) {
      return h('div', { role: 'img', 'aria-label': (o && o.title) || 'Stacked bars' }, rows.map((r) => {
        const tot = r.segs.reduce((a, s) => a + s.value, 0);
        return h('div', { class: 'bar-row' }, h('span', null, r.label), h('div', { class: 'bar-track', title: r.segs.map((s) => s.label + ' ' + s.value).join(', ') }, tot ? r.segs.filter((s) => s.value > 0).map((s) => h('div', { class: 'bar-seg', style: 'width:' + (s.value / tot) * 100 + '%;background:' + s.color })) : null), h('span', { class: 'mono' }, r.text !== undefined ? r.text : String(tot)));
      }));
    },
    bars(items, o) {
      const max = Math.max(1, ...items.map((i) => i.value));
      return h('div', { role: 'img', 'aria-label': (o && o.title) || 'Bars' }, items.map((i) => h('div', { class: 'bar-row' }, h('span', null, i.label), h('div', { class: 'bar-track' }, h('div', { class: 'bar-seg', style: 'width:' + (i.value / max) * 100 + '%;background:' + (i.color || SV.COLORS.prog) })), h('span', { class: 'mono' }, String(i.value)))));
    },
    progress(p, color, label) { return h('div', { class: 'progress', role: 'progressbar', 'aria-label': label || 'Progress', 'aria-valuenow': p, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: 'width:' + Math.max(0, Math.min(100, p)) + '%' + (color ? ';background:' + color : '') })); },
    legend(items) { return h('ul', { class: 'legend-list', style: 'display:flex;gap:14px;flex-wrap:wrap;margin-top:6px' }, items.map((d) => h('li', null, h('span', { class: 'sw', style: 'background:' + d.color }), d.label))); }
  };
})();
