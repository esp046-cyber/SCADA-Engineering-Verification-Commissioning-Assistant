/* Minimal PDF 1.4 writer (Helvetica base-14 fonts, no external libraries) */
(function () {
  'use strict';
  const SV = window.SV;
  const REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const BLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  const MAP = { '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"', '\u2022': '*', '\u2265': '>=', '\u2264': '<=', '\u2192': '->', '\u2026': '...', '\u03a9': 'ohm', '\u2713': 'OK', '\u00a0': ' ', '\u2605': '*', '\u2212': '-', '\u00d7': 'x' };
  const clean = (s) => String(s == null ? '' : s).replace(/[^\x00-\xff]/g, (c) => (MAP[c] !== undefined ? MAP[c] : '?')).replace(/[\u0080-\u009f]/g, '?').replace(/[\r\t]/g, ' ');
  const tw = (s, size, bold) => { let w = 0; const t = bold ? BLD : REG; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); w += c >= 32 && c <= 126 ? t[c - 32] : 556; } return (w * size) / 1000; };
  const pesc = (s) => { let o = ''; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i), ch = s[i]; if (ch === '(' || ch === ')' || ch === '\\') o += '\\' + ch; else if (c < 32) o += ' '; else if (c > 126) o += '\\' + c.toString(8).padStart(3, '0'); else o += ch; } return o; };
  const rgb = (hex) => { const h = (hex || '#000000').replace('#', ''); return [0, 2, 4].map((i) => (parseInt(h.substr(i, 2), 16) / 255).toFixed(3)).join(' '); };
  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  const STC = { pass: '#0b7a3b', fail: '#c21b1b', warn: '#b35a00', mute: '#5a6672', info: '#1d5fa8' };

  class PDF {
    constructor(o) { this.o = o || {}; this.W = 842; this.H = 595; this.M = 34; this.pages = []; this.page = null; this.y = 0; }
    get usable() { return this.W - 2 * this.M; }
    get bottom() { return this.H - this.M - 14; }
    addPage() {
      this.page = { ops: [] }; this.pages.push(this.page);
      if (this.o.watermark) {
        const size = 110, w = tw(this.o.watermark, size, true), a = (28 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        const tx = this.W / 2 - (w / 2) * c + size * 0.3 * s, ty = this.H / 2 - (w / 2) * s - size * 0.3 * c;
        this.page.ops.push('BT /F2 ' + size + ' Tf 0.96 0.86 0.86 rg ' + [f2(c), f2(s), f2(-s), f2(c), f2(tx), f2(ty)].join(' ') + ' Tm (' + pesc(clean(this.o.watermark)) + ') Tj ET');
      }
      this.y = this.M;
      if (this.pages.length > 1) {
        this.text(this.M, this.M - 6, this.o.headerLeft || '', { size: 8, color: '#5a6672' });
        const r = clean(this.o.headerRight || ''); this.text(this.W - this.M - tw(r, 8, false), this.M - 6, r, { size: 8, color: '#5a6672' });
        this.line(this.M, this.M + 8, this.W - this.M, this.M + 8, { color: '#aab4be', lw: 0.6 }); this.y = this.M + 18;
      }
    }
    ensure(h) { if (!this.page || this.y + h > this.bottom) this.addPage(); }
    text(x, yTop, str, o) {
      o = o || {}; const size = o.size || 10; str = clean(str);
      if (!str) return;
      this.page.ops.push('BT /' + (o.bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + rgb(o.color || '#1a1f24') + ' rg ' + f2(x) + ' ' + f2(this.H - yTop - size * 0.82) + ' Td (' + pesc(str) + ') Tj ET');
    }
    rect(x, yTop, w, h, o) {
      o = o || {}; let s = '';
      if (o.fill) s += rgb(o.fill) + ' rg ';
      if (o.stroke) s += rgb(o.stroke) + ' RG ' + (o.lw || 0.8) + ' w ';
      s += f2(x) + ' ' + f2(this.H - yTop - h) + ' ' + f2(w) + ' ' + f2(h) + ' re ' + (o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S');
      this.page.ops.push(s);
    }
    line(x1, y1, x2, y2, o) { o = o || {}; this.page.ops.push(rgb(o.color || '#000000') + ' RG ' + (o.lw || 0.8) + ' w ' + f2(x1) + ' ' + f2(this.H - y1) + ' m ' + f2(x2) + ' ' + f2(this.H - y2) + ' l S'); }
    wrap(str, maxW, size, bold) {
      const out = [];
      String(str == null ? '' : str).split(/\n/).forEach((para) => {
        para = clean(para); if (para === '') { out.push(''); return; }
        let line = '';
        para.split(/ +/).forEach((word) => {
          while (tw(word, size, bold) > maxW) {
            let cut = word.length; while (cut > 1 && tw(word.slice(0, cut), size, bold) > maxW) cut--;
            if (line) { out.push(line); line = ''; }
            out.push(word.slice(0, cut)); word = word.slice(cut);
          }
          const t = line ? line + ' ' + word : word;
          if (tw(t, size, bold) <= maxW) line = t; else { out.push(line); line = word; }
        });
        out.push(line);
      });
      return out;
    }
    spacer(h) { this.y += h; }
    heading(str, level) {
      const size = level === 2 ? 11.5 : 15; this.ensure(size + 34);
      this.y += level === 2 ? 6 : 8; this.text(this.M, this.y, str, { size, bold: true, color: '#0f1a24' }); this.y += size + 4;
      if (level !== 2) { this.line(this.M, this.y, this.W - this.M, this.y, { color: '#0f1a24', lw: 1.4 }); this.y += 8; } else this.y += 2;
    }
    para(str, o) {
      o = o || {}; const size = o.size || 9.5, lh = size * 1.35, x = o.x == null ? this.M : o.x, w = o.w || this.usable - (x - this.M);
      this.wrap(str, w, size, o.bold).forEach((l) => { this.ensure(lh); this.text(x, this.y, l, { size, bold: o.bold, color: o.color }); this.y += lh; });
      this.y += o.gap == null ? 4 : o.gap;
    }
    bullets(items, o) { (items || []).forEach((t) => { this.ensure(14); this.text(this.M + 4, this.y, '*', { size: 9.5 }); this.para(t, Object.assign({}, o, { x: this.M + 16, gap: 2 })); }); this.y += 4; }
    kv(pairs, o) {
      o = o || {}; const kw = o.kw || 130, size = 9.5, lh = 13;
      pairs.forEach(([k, v]) => {
        const lines = this.wrap(v === '' || v == null ? '-' : v, this.usable - kw - 6, size, false);
        this.ensure(lh * lines.length + 2);
        this.text(this.M, this.y, k, { size: 8.5, bold: true, color: '#44525f' });
        lines.forEach((l, i) => this.text(this.M + kw, this.y + i * lh, l, { size }));
        this.y += lines.length * lh + 2;
      });
      this.y += 4;
    }
    box(str, color, o) {
      o = o || {}; const size = o.size || 10, pad = 7, lines = this.wrap(str, this.usable - pad * 2, size, !!o.bold), lh = size * 1.35;
      const h = lines.length * lh + pad * 2; this.ensure(h + 4);
      this.rect(this.M, this.y, this.usable, h, { stroke: color, lw: 1.4, fill: o.fill });
      lines.forEach((l, i) => this.text(this.M + pad, this.y + pad + i * lh, l, { size, bold: !!o.bold, color }));
      this.y += h + 8;
    }
    signatures(labels) {
      this.ensure(90); this.y += 26; const n = labels.length, gap = 24, w = (this.usable - gap * (n - 1)) / n;
      labels.forEach((l, i) => { const x = this.M + i * (w + gap); this.line(x, this.y + 24, x + w, this.y + 24, { color: '#333333', lw: 0.8 }); this.text(x, this.y + 28, l, { size: 8.5, color: '#44525f' }); this.text(x, this.y + 40, 'Name / Signature / Date', { size: 7.5, color: '#7b8794' }); });
      this.y += 62;
    }
    /* cols: [{label,w}], rows: [[cell...]] cell = string | {t,st} */
    table(cols, rows, o) {
      o = o || {}; const size = 8, lh = 10.2, padX = 4, padY = 3;
      const tot = cols.reduce((a, c) => a + (c.w || 1), 0), ws = cols.map((c) => ((c.w || 1) / tot) * this.usable);
      const drawHead = () => {
        const lines = cols.map((c, i) => this.wrap(c.label, ws[i] - padX * 2, size, true)), n = Math.max(...lines.map((l) => l.length)), h = n * lh + padY * 2;
        this.ensure(h + lh * 2 + 6);
        this.rect(this.M, this.y, this.usable, h, { fill: '#24323f' });
        let x = this.M; cols.forEach((c, i) => { lines[i].forEach((l, k) => this.text(x + padX, this.y + padY + k * lh, l, { size, bold: true, color: '#ffffff' })); x += ws[i]; });
        this.y += h;
      };
      if (!rows.length) { this.para(o.empty || 'No records match the selected filters.', { size: 9, color: '#5a6672' }); return; }
      drawHead();
      rows.forEach((r, ri) => {
        const cells = r.map((c, i) => { const t = c && typeof c === 'object' ? c.t : c; let ls = this.wrap(t == null || t === '' ? '-' : t, ws[i] - padX * 2, size, !!(c && c.st)); if (ls.length > 14) { ls = ls.slice(0, 14); ls[13] = ls[13].slice(0, -3) + '...'; } return ls; });
        const h = Math.max(...cells.map((l) => l.length)) * lh + padY * 2;
        if (this.y + h > this.bottom) { this.addPage(); drawHead(); }
        if (ri % 2 === 1) this.rect(this.M, this.y, this.usable, h, { fill: '#f1f4f7' });
        let x = this.M;
        cells.forEach((ls, i) => { const c = r[i], st = c && typeof c === 'object' ? c.st : null; ls.forEach((l, k) => this.text(x + padX, this.y + padY + k * lh, l, { size, bold: !!st, color: st ? STC[st] || '#1a1f24' : '#1a1f24' })); x += ws[i]; });
        this.line(this.M, this.y + h, this.W - this.M, this.y + h, { color: '#d3dae0', lw: 0.4 });
        this.y += h;
      });
      this.y += 10;
    }
    finish() {
      const N = this.pages.length;
      this.pages.forEach((p, i) => {
        this.page = p;
        this.line(this.M, this.H - this.M + 2, this.W - this.M, this.H - this.M + 2, { color: '#aab4be', lw: 0.6 });
        this.text(this.M, this.H - this.M + 6, this.o.footerLeft || '', { size: 7.5, color: '#5a6672' });
        const mid = clean(this.o.footerMid || ''); this.text(this.W / 2 - tw(mid, 7.5, true) / 2, this.H - this.M + 6, mid, { size: 7.5, bold: true, color: '#9a2a2a' });
        const r = 'Page ' + (i + 1) + ' of ' + N; this.text(this.W - this.M - tw(r, 7.5, false), this.H - this.M + 6, r, { size: 7.5, color: '#5a6672' });
      });
      const objs = [];
      objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
      const kids = this.pages.map((p, i) => 6 + i * 2 + ' 0 R').join(' ');
      objs[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + N + ' >>';
      objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      objs[5] = '<< /Title (' + pesc(clean(this.o.title || 'Report')) + ') /Producer (SCADA Engineering Verification & Commissioning Assistant) /Creator (SCADA-EVC) >>';
      this.pages.forEach((p, i) => {
        const pn = 6 + i * 2, cn = pn + 1, stream = p.ops.join('\n');
        objs[pn] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + this.W + ' ' + this.H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cn + ' 0 R >>';
        objs[cn] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
      });
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offs = [];
      for (let i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
      const xr = out.length;
      out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
      for (let i = 1; i < objs.length; i++) out += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
      out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xr + '\n%%EOF';
      const u8 = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
      return u8;
    }
  }
  SV.PDF = PDF;
  SV.pdfWidth = tw;
})();
