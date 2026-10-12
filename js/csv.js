/* CSV parsing / writing */
(function () {
  'use strict';
  const SV = window.SV;
  const csv = (SV.csv = {});

  csv.detectDelimiter = (text) => {
    const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
    let best = ',', bestN = -1;
    for (const d of [',', ';', '\t']) {
      let n = 0, q = false;
      for (const c of first) { if (c === '"') q = !q; else if (c === d && !q) n++; }
      if (n > bestN) { bestN = n; best = d; }
    }
    return best;
  };

  csv.parse = (text) => {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const d = csv.detectDelimiter(text);
    const rows = []; let row = [], f = '', q = false, i = 0, sawAny = false;
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
        f += c; i++; continue;
      }
      if (c === '"' && f === '') { q = true; sawAny = true; i++; continue; }
      if (c === d) { row.push(f); f = ''; sawAny = true; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = []; sawAny = false; i++; continue;
      }
      f += c; sawAny = true; i++;
    }
    if (sawAny || f !== '' || row.length) { row.push(f); rows.push(row); }
    return { delimiter: d, rows: rows.filter((r) => r.some((x) => String(x).trim() !== '')), unterminatedQuote: q };
  };

  const normHeader = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  /* aliases: {field:[alias,...]} → returns {objects:[{__row,field...}], headers, missing, unmapped} */
  csv.parseObjects = (text, aliases) => {
    const p = csv.parse(text);
    if (!p.rows.length) return { error: 'The file is empty.', objects: [], headers: [] };
    const headers = p.rows[0].map((h) => String(h).trim());
    const map = {};
    headers.forEach((h, idx) => {
      const n = normHeader(h);
      for (const field of Object.keys(aliases)) {
        if (map[field] === undefined && (normHeader(field) === n || aliases[field].some((a) => normHeader(a) === n))) { map[field] = idx; break; }
      }
    });
    const objects = p.rows.slice(1).map((r, k) => {
      const o = { __row: k + 2 };
      for (const field of Object.keys(map)) o[field] = r[map[field]] === undefined ? '' : String(r[map[field]]).trim();
      o.__cols = r.length;
      return o;
    });
    return { objects, headers, map, unterminatedQuote: p.unterminatedQuote, delimiter: p.delimiter, unmapped: headers.filter((h, idx) => !Object.values(map).includes(idx)) };
  };

  const guard = (v) => {
    if (typeof v !== 'string') return v;
    if (/^[=+@\t\r]/.test(v) || (/^-/.test(v) && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v))) return "'" + v;
    return v;
  };
  csv.cell = (v) => {
    if (v === null || v === undefined) return '';
    v = guard(typeof v === 'object' ? JSON.stringify(v) : v);
    const s = String(v);
    return /[",\r\n;]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  csv.stringify = (rows, bom = true) => (bom ? '\ufeff' : '') + rows.map((r) => r.map(csv.cell).join(',')).join('\r\n') + '\r\n';
})();
