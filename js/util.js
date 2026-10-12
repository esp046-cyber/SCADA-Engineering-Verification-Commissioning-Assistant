/* Core utilities — namespace SV */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  SV.version = '1.0.0';
  SV.schema = 1;
  SV.views = SV.views || {};

  const pad = (n) => String(n).padStart(2, '0');
  SV.uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  SV.nowISO = () => new Date().toISOString();
  SV.today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  SV.addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  SV.fmtDate = (s) => (s ? String(s).slice(0, 10) : '—');
  SV.fmtDT = (s) => {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return String(s);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  SV.localDT = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  SV.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SV.isNum = (v) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));
  SV.num = (v) => (SV.isNum(v) ? Number(v) : null);
  SV.norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
  SV.str = (s) => String(s == null ? '' : s).trim();
  SV.clone = (o) => JSON.parse(JSON.stringify(o));
  SV.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  SV.pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  SV.cmp = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null || a === '') return 1;
    if (b == null || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  };
  SV.fmtNum = (v) => (SV.isNum(v) ? String(Number(v)) : '—');
  SV.sizeText = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  /* DOM builder — never uses innerHTML for user data */
  SV.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    let deferredValue;
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'for') el.htmlFor = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value') deferredValue = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'list' || k === 'form' || k.indexOf('-') > -1 || k === 'role') el.setAttribute(k, v === true ? '' : v);
        else if (k in el) { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    const add = (c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    };
    kids.forEach(add);
    if (deferredValue !== undefined) el.value = deferredValue;
    return el;
  };

  const ICONS = {
    menu: 'M4 6h16M4 12h16M4 18h16', plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6 6 18', check: 'M5 13l4 4L19 7',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z', trash: 'M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6',
    download: 'M12 3v12m0 0-4-4m4 4 4-4M4 21h16', upload: 'M12 21V9m0 0-4 4m4-4 4 4M4 3h16',
    warning: 'M12 3 2 21h20L12 3ZM12 10v5M12 18v.01', info: 'M12 11v6M12 7v.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2', eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z', play: 'M6 4l14 8-14 8z', star: 'M12 2l3 7 7 .5-5.5 4.8 1.7 7.2L12 17.8 5.8 21.5l1.7-7.2L2 9.5 9 9z',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4', dashboard: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
    project: 'M3 6h6l2 2h10v12H3z', io: 'M4 7h10m0 0-3-3m3 3-3 3M20 17H10m0 0 3-3m-3 3 3 3', tags: 'M3 12V3h9l9 9-9 9-9-9ZM7.5 7.5v.01',
    alarm: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0', comms: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20v.01',
    fat: 'M9 3h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4', checklist: 'M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2',
    defect: 'M5 21V4m0 0h12l-2 4 2 4H5', report: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
    data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    clip: 'M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8', camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', copy: 'M8 8h12v12H8zM4 16V4h12'
  };
  SV.icon = (name, size = 18) => {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', name === 'star-fill' ? 'currentColor' : 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[name === 'star-fill' ? 'star' : name] || ICONS.info);
    s.appendChild(p);
    return s;
  };

  SV.download = (filename, data, mime) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  SV.slug = (s) => String(s || 'export').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export';
  SV.readFile = (file) => new Promise((res, rej) => {
    if (file.text) { file.text().then(res, rej); return; }
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file);
  });
})();
