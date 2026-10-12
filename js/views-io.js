/* I/O verification */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h, C = SV.C;
  const HDR = ['tag', 'description', 'equipment', 'type', 'units', 'range_low', 'range_high', 'raw_low', 'raw_high', 'scada_low', 'scada_high', 'tolerance_pct_span', 'expected'];
  const ALIAS = { tag: ['tag name', 'tagname', 'point'], description: ['desc'], equipment: ['equip', 'asset'], type: ['signal type', 'io type', 'signaltype'], units: ['unit', 'eu', 'engineering units'], rangeLow: ['range_low', 'low', 'eu low', 'min'], rangeHigh: ['range_high', 'high', 'eu high', 'max'], rawLow: ['raw_low'], rawHigh: ['raw_high'], scadaLow: ['scada_low'], scadaHigh: ['scada_high'], tolerance: ['tolerance_pct_span', 'tol'], expected: ['expected state', 'expected value'] };

  const parseIO = (text, pid) => {
    const p = SV.csv.parseObjects(text, ALIAS); if (p.error) return { fatal: p.error, valid: [], invalid: [], warnings: [] };
    if (p.map.tag === undefined) return { fatal: 'No “tag” column found. Required header: tag. Download the template to see all columns.', valid: [], invalid: [], warnings: [] };
    const valid = [], invalid = [], warnings = [], seen = new Map(); SV.data.io.filter((r) => r.projectId === pid).forEach((r) => seen.set(SV.norm(r.tag), 1));
    if (p.unterminatedQuote) warnings.push('The file ends inside a quoted field; the last row may be incomplete.');
    p.objects.forEach((o) => {
      const type = SV.str(o.type).toUpperCase(), bad = [];
      if (!SV.str(o.tag)) bad.push('Missing tag name'); if (!['DI', 'DO', 'AI', 'AO'].includes(type)) bad.push('Type must be DI, DO, AI or AO (found “' + (o.type || '') + '”)');
      ['rangeLow', 'rangeHigh', 'rawLow', 'rawHigh', 'scadaLow', 'scadaHigh', 'tolerance'].forEach((k) => { if (o[k] !== undefined && o[k] !== '' && !SV.isNum(o[k])) bad.push(k + ' is not a number (“' + o[k] + '”)'); });
      if (!bad.length && (type === 'AI' || type === 'AO')) { const lo = SV.num(o.rangeLow), hi = SV.num(o.rangeHigh); if (lo === null || hi === null || lo >= hi) bad.push('Analog signals need numeric range_low < range_high'); }
      if (bad.length) { invalid.push({ row: o.__row, reason: bad.join('; ') }); return; }
      const k = SV.norm(o.tag); if (seen.has(k)) warnings.push('Row ' + o.__row + ': tag “' + o.tag + '” is duplicated (it will be imported and flagged).'); seen.set(k, 1);
      valid.push({ id: SV.uid(), projectId: pid, tag: o.tag, description: o.description || '', equipment: o.equipment || '', type, units: o.units || '', rangeLow: SV.num(o.rangeLow), rangeHigh: SV.num(o.rangeHigh), rawLow: SV.num(o.rawLow), rawHigh: SV.num(o.rawHigh), rawUnits: '', scadaLow: SV.num(o.scadaLow), scadaHigh: SV.num(o.scadaHigh), tolerance: SV.num(o.tolerance), expected: o.expected || '', actual: '', status: 'Not tested', testDate: '', engineer: '', comments: '', evidence: '' });
    });
    return { valid, invalid, warnings };
  };

  const scaleDialog = (r) => {
    r = r || {};
    const fm = SV.form([{ name: 'rawLow', label: 'Raw low (e.g. 4)', type: 'number', default: r.rawLow }, { name: 'rawHigh', label: 'Raw high (e.g. 20)', type: 'number', default: r.rawHigh }, { name: 'engLow', label: 'Engineering low', type: 'number', default: r.rangeLow }, { name: 'engHigh', label: 'Engineering high', type: 'number', default: r.rangeHigh }, { name: 'raw', label: 'Raw test input', type: 'number' }], { rawLow: r.rawLow, rawHigh: r.rawHigh, engLow: r.rangeLow, engHigh: r.rangeHigh });
    const out = h('div', { 'aria-live': 'polite' });
    const calc = () => { const v = fm.get(); const rows = [0, 25, 50, 75, 100].map((p) => { const raw = v.rawLow !== null && v.rawHigh !== null ? v.rawLow + ((v.rawHigh - v.rawLow) * p) / 100 : null; return [p + '%', raw === null ? '—' : +raw.toPrecision(6), raw === null ? '—' : fmt(SV.io.scale(v.rawLow, v.rawHigh, v.engLow, v.engHigh, raw))]; }); const one = SV.io.scale(v.rawLow, v.rawHigh, v.engLow, v.engHigh, v.raw);
      out.replaceChildren(h('p', null, 'Engineering value for the raw test input: ', h('b', { class: 'mono' }, v.raw === null ? '—' : fmt(one))), h('div', { class: 'tscroll' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['Span', 'Raw', 'Engineering'].map((x) => h('th', null, x)))), h('tbody', null, rows.map((rw) => h('tr', null, rw.map((c) => h('td', null, String(c)))))))),
        h('p', { class: 'small faint' }, 'Linear scaling from the values entered above. Use the approved scaling from the project documents; this tool does not supply values.')); };
    const fmt = (x) => (x === null ? 'Invalid input (raw span cannot be zero)' : +x.toPrecision(7)); fm.el.addEventListener('input', calc); calc();
    SV.dialog({ title: 'Scaling calculator' + (r.tag ? ' — ' + r.tag : ''), body: h('div', null, fm.el, h('div', { style: 'margin-top:12px' }, out)), actions: [{ label: 'Close', kind: 'primary' }] });
  };

  const ioDialog = (rec) => {
    const isNew = !rec; rec = rec ? Object.assign({}, rec) : { id: SV.uid(), projectId: SV.defaultProjectId(), type: 'DI', status: 'Not tested', engineer: '', tolerance: null };
    const dupe = (tag, pid) => SV.data.io.some((x) => x.id !== rec.id && x.projectId === pid && SV.norm(x.tag) === SV.norm(tag));
    const an = (all) => SV.io.isAnalog(all.type);
    SV.editDialog({ title: isNew ? 'Add I/O point' : 'Edit I/O point ' + rec.tag, size: 'lg', values: rec, notice: rec.isSample ? h('div', { class: 'banner info' }, 'This is a demonstration record.') : null, fields: [
      { section: 'Identification' }, { name: 'projectId', label: 'Project', type: 'select', options: SV.projectOptions(), required: true }, { name: 'tag', label: 'Tag name', required: true, maxlength: 80, validate: (v, a) => (dupe(v, a.projectId) ? 'This tag already exists in the selected project.' : '') },
      { name: 'description', label: 'Description', full: true }, { name: 'equipment', label: 'Equipment' }, { name: 'type', label: 'Signal type', type: 'select', options: C.IO_TYPES, required: true },
      { section: 'Range and scaling (analog signals)' }, { name: 'units', label: 'Engineering units' }, { name: 'rangeLow', label: 'Approved range low', type: 'number', validate: (v, a) => (an(a) && v === null ? 'Range low is required for analog signals.' : '') },
      { name: 'rangeHigh', label: 'Approved range high', type: 'number', validate: (v, a) => (an(a) && (v === null ? 'Range high is required for analog signals.' : a.rangeLow !== null && v <= a.rangeLow ? 'Range high must be greater than range low.' : '')) },
      { name: 'rawLow', label: 'Raw signal low', type: 'number', help: 'e.g. 4 for 4–20 mA' }, { name: 'rawHigh', label: 'Raw signal high', type: 'number', validate: (v, a) => (v !== null && a.rawLow !== null && v === a.rawLow ? 'Raw span cannot be zero.' : '') },
      { name: 'rawUnits', label: 'Raw units', placeholder: 'mA, V, counts' }, { name: 'tolerance', label: 'Tolerance (% of span)', type: 'number', min: 0, help: 'Comes from the approved test procedure. Blank means exact match.' },
      { name: 'scadaLow', label: 'SCADA configured low', type: 'number', help: 'As configured in SCADA; compared with the approved range.' }, { name: 'scadaHigh', label: 'SCADA configured high', type: 'number' },
      { section: 'Verification' }, { name: 'expected', label: 'Expected state / value', help: 'From the approved I/O list. Never guess.', validate: (v, a) => (an(a) && v !== '' && !SV.isNum(v) ? 'Analog expected value must be numeric.' : '') },
      { name: 'actual', label: 'Actual state / value', validate: (v, a) => (an(a) && v !== '' && !SV.isNum(v) ? 'Analog actual value must be numeric.' : '') },
      { name: 'status', label: 'Test status', type: 'select', options: C.IO_STATUS, required: true }, { name: 'testDate', label: 'Test date', type: 'date' }, { name: 'engineer', label: 'Engineer', default: SV.engineer() },
      { name: 'evidence', label: 'Evidence reference', placeholder: 'Loop sheet, photo or document ID' }, { name: 'comments', label: 'Comments', type: 'textarea', full: true }],
    check: (v) => {
      if ((v.status === 'Pass' || v.status === 'Fail') && (!v.testDate || !v.engineer)) return 'A ' + v.status + ' result needs the test date and the engineer who performed it.';
      const cmp = SV.io.compare(v); if (v.status === 'Pass' && cmp.state === 'deviation') return 'Expected and actual values differ (' + cmp.text + '). Record Fail, or correct the values if they were entered wrongly.';
      if (v.status === 'Pass' && cmp.state === 'incomplete') return 'Enter both expected and actual values before recording Pass.'; return '';
    },
    onSave: async (v) => { await SV.save('io', SV.stamp(Object.assign({}, rec, v))); SV.toast('I/O point saved.', 'ok'); SV.refresh(); } });
  };

  SV.views.io = () => {
    const host = h('div'), sum = h('div'), spec = [{ name: 'q', label: 'Search', placeholder: 'Tag, description, equipment' }, { name: 'type', type: 'select', label: 'Signal type', all: 'All types', options: C.IO_TYPES }, { name: 'status', type: 'select', label: 'Status', all: 'All statuses', options: C.IO_STATUS },
      { name: 'flag', type: 'select', label: 'Issue', all: 'All records', options: [['any', 'Any flagged issue'], ['missing', 'Missing tag'], ['duplicate', 'Duplicate tag'], ['range', 'Invalid range'], ['scaling', 'Scaling mismatch'], ['dev', 'Expected ≠ actual'], ['evidence', 'No evidence']] }, { name: 'from', type: 'date', label: 'Tested from' }, { name: 'to', type: 'date', label: 'Tested to' }];
    const fs = SV.filterBar(spec, 'io', () => draw()); let shown = [];
    function draw() {
      const all = SV.scoped('io'), dups = SV.io.dupMap(SV.data.io), f = fs.values();
      const fl = new Map(all.map((r) => [r.id, SV.io.flags(r, dups)])), cmp = new Map(all.map((r) => [r.id, SV.io.compare(r)]));
      const m = SV.metrics(SV.scopeIds()).io;
      sum.replaceChildren(h('div', { class: 'annun' }, tile('Total points', m.total, ''), tile('Passed', m.pass, m.pct + '% of applicable', 'ok'), tile('Failed', m.fail, '', m.fail ? 'bad' : ''), tile('Not tested', m.notTested, '', m.notTested ? 'warn' : ''), tile('Not applicable', m.na, ''), tile('Records with flags', m.flagged, 'duplicate, range, scaling…', m.flagged ? 'bad' : 'ok')));
      shown = all.filter((r) => (!f.type || r.type === f.type) && (!f.status || r.status === f.status) && SV.matchText(f.q, r.tag, r.description, r.equipment, r.comments) && SV.inRange(r.testDate, f.from, f.to) && (!f.flag || (f.flag === 'any' ? fl.get(r.id).some((x) => x.kind !== 'info') : f.flag === 'dev' ? cmp.get(r.id).state === 'deviation' : fl.get(r.id).some((x) => x.code === f.flag))));
      host.replaceChildren(SV.table({ rows: shown, defaultSort: { key: 'tag', dir: 1 }, empty: all.length ? 'No I/O points match the filters.' : 'No I/O points yet. Add one or import a CSV list.', rowClass: (r) => (fl.get(r.id).some((x) => x.kind === 'bad') ? 'row-bad' : fl.get(r.id).some((x) => x.kind === 'warn') ? 'row-warn' : ''), columns: [
        { key: 'tag', label: 'Tag', cls: 'tag', render: (r) => [r.tag || h('em', null, '(missing)'), SV.sampleTag(r)] }, { key: 'description', label: 'Description', render: (r) => h('span', { class: 'wrap' }, r.description) }, { key: 'equipment', label: 'Equipment' }, { key: 'type', label: 'Type' },
        { key: 'range', label: 'Range', nosort: true, render: (r) => (SV.io.isAnalog(r.type) ? SV.fmtNum(r.rangeLow) + ' – ' + SV.fmtNum(r.rangeHigh) + ' ' + (r.units || '') : '') }, { key: 'expected', label: 'Expected' }, { key: 'actual', label: 'Actual' },
        { key: 'cmp', label: 'Comparison', value: (r) => cmp.get(r.id).state, render: (r) => h('span', { title: cmp.get(r.id).text }, SV.badge(cmp.get(r.id).state === 'match' ? 'Match' : cmp.get(r.id).state === 'deviation' ? 'Deviation' : 'Incomplete', cmp.get(r.id).state === 'match' ? 'ok' : cmp.get(r.id).state === 'deviation' ? 'bad' : 'mute')) },
        { key: 'status', label: 'Status', render: (r) => SV.badge(r.status) }, { key: 'testDate', label: 'Tested', render: (r) => (r.testDate ? r.testDate + (r.engineer ? ' · ' + r.engineer : '') : '') }, { key: 'flags', label: 'Flags', nosort: true, render: (r) => SV.flagList(fl.get(r.id)) }].concat(SV.projectCol()),
      actions: (r) => [SV.iconBtn('edit', 'Edit ' + r.tag, () => ioDialog(r)), SV.io.isAnalog(r.type) ? SV.iconBtn('play', 'Scaling check for ' + r.tag, () => scaleDialog(r)) : null, SV.iconBtn('history', 'History of ' + r.tag, () => SV.showHistory(r.id, r.tag)),
        SV.iconBtn('trash', 'Delete ' + r.tag, async () => { if (await SV.confirm({ title: 'Delete I/O point', danger: true, confirmLabel: 'Delete', message: 'Delete “' + r.tag + '” and its test record?' })) { await SV.remove('io', r.id); SV.toast('I/O point deleted.', 'ok'); SV.refresh(); } })] }));
    }
    const tile = (l, v, s, k) => h('div', { class: 'tile ' + (k || '') }, h('div', { class: 'legend' }, l), h('div', { class: 'val' }, v), h('div', { class: 'sub' }, s));
    draw();
    const need = SV.data.projects.length ? null : SV.needProject();
    return h('div', null, SV.pageHeader('I/O Verification', 'Record digital and analog point checks, compare expected with actual values and catch missing tags, duplicates, invalid ranges and scaling mismatches. Status is always set by the engineer — the comparison is a prompt, not an approval.', need ? [] : [
      SV.btn('Add I/O point', { kind: 'primary', icon: 'plus', onClick: () => ioDialog() }), SV.btn('Import CSV', { icon: 'upload', onClick: () => SV.csvImportDialog({ title: 'Import I/O list (CSV)', help: 'Required columns: tag, type (DI/DO/AI/AO). Analog rows also need range_low and range_high. Rows with problems are listed and skipped.', templateName: 'io-list-template.csv', templateRows: [HDR, ['P101_RUN', 'Pump P-101 running', 'P-101', 'DI', '', '', '', '', '', '', '', '', 'Running'], ['LT401_PV', 'Clearwell level', 'LT-401', 'AI', 'm', '0', '6', '4', '20', '0', '6', '0.5', '3']], parse: parseIO, commit: (valid, v) => SV.bulkSave('io', valid.map((r) => SV.stamp(Object.assign(r, { projectId: v.projectId }))), 'CSV import', v.projectId) }) }),
      SV.btn('Export CSV', { icon: 'download', onClick: () => SV.exports.csv('io', shown.map((r) => r.id)) }), SV.btn('Scaling calculator', { onClick: () => scaleDialog() })]), need, need ? null : [sum, fs.el, host]);
  };
})();
