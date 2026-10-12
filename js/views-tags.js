/* SCADA tag database checker */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h;
  const ALIAS = { tag: ['tag name', 'tagname', 'name', 'point', 'point name', 'item'], description: ['desc', 'descriptor', 'comment'], dataType: ['data type', 'type', 'datatype'], units: ['unit', 'eu', 'engunits', 'engineering units'], rangeLow: ['low', 'range low', 'eu low', 'min', 'eumin', 'engmin', 'lo'], rangeHigh: ['high', 'range high', 'eu high', 'max', 'eumax', 'engmax', 'hi'] };
  const HDR = ['tag', 'description', 'data_type', 'units', 'range_low', 'range_high'];

  const parseTags = (text, pid) => {
    const p = SV.csv.parseObjects(text, ALIAS); if (p.error) return { fatal: p.error, valid: [], invalid: [], warnings: [] };
    if (p.map.tag === undefined) return { fatal: 'No tag-name column found. Accepted headers include: tag, tag name, name, point.', valid: [], invalid: [], warnings: [] };
    const valid = [], invalid = [], warnings = [];
    if (p.unterminatedQuote) warnings.push('The file ends inside a quoted field; the last row may be incomplete.');
    ['description', 'dataType', 'units', 'rangeLow', 'rangeHigh'].forEach((k) => { if (p.map[k] === undefined) warnings.push('Column for “' + k + '” not found — that comparison will be skipped or reported as differences.'); });
    p.objects.forEach((o) => {
      const bad = [];
      if (!SV.str(o.tag)) bad.push('Missing tag name'); ['rangeLow', 'rangeHigh'].forEach((k) => { if (o[k] !== undefined && o[k] !== '' && !SV.isNum(o[k])) bad.push(k + ' is not numeric (“' + o[k] + '”)'); });
      if (SV.isNum(o.rangeLow) && SV.isNum(o.rangeHigh) && Number(o.rangeLow) > Number(o.rangeHigh)) bad.push('range low is greater than range high');
      if (o.__cols > p.headers.length) bad.push('More fields than headers (check for unquoted commas)');
      if (bad.length) { invalid.push({ row: o.__row, reason: bad.join('; ') }); return; }
      valid.push({ id: SV.uid(), projectId: pid, tag: o.tag, description: o.description || '', dataType: o.dataType || '', units: o.units || '', rangeLow: SV.num(o.rangeLow), rangeHigh: SV.num(o.rangeHigh), source: '' });
    });
    return { valid, invalid, warnings };
  };
  const importList = (kind) => {
    const store = kind === 'approved' ? 'tagsApproved' : 'tagsExport', label = kind === 'approved' ? 'approved tag list' : 'SCADA tag export';
    SV.csvImportDialog({ title: 'Import ' + label + ' (CSV)', help: 'Columns: tag (required), description, data_type, units, range_low, range_high. Header names are matched flexibly. Importing never contacts any system — it only reads the file you choose.', templateName: kind + '-tags-template.csv', templateRows: [HDR, ['P101_RUN', 'Pump P-101 running', 'BOOL', '', '', ''], ['LT401_PV', 'Clearwell level', 'REAL', 'm', '0', '6']],
      modes: [['replace', 'Replace this project’s current ' + label], ['append', 'Add to the current list']], parse: parseTags,
      commit: async (valid, v) => { if (v.mode === 'replace') await SV.removeWhere(store, (r) => r.projectId === v.projectId, 'Replaced by import', v.projectId); await SV.bulkSave(store, valid.map((r) => SV.stamp(Object.assign(r, { projectId: v.projectId, source: 'CSV import ' + SV.today() }))), 'CSV import (' + label + ')', v.projectId); } });
  };

  SV.views.tags = () => {
    const tab = SV.tabState.tags || 'compare', setTab = (k) => { SV.tabState.tags = k; SV.refresh(); };
    const ids = SV.scopeIds(), host = h('div'), key = 'tags:' + tab;
    const need = SV.needProject(); if (need) return h('div', null, SV.pageHeader('Tag Database Checker'), need);
    const cs = !!SV.prefs.tagCase;
    const rows = SV.tagcheck.compare(ids, { caseSensitive: cs }), A = SV.scoped('tagsApproved'), E = SV.scoped('tagsExport');
    let body;
    if (tab === 'compare') {
      const fs = SV.filterBar([{ name: 'q', label: 'Search', placeholder: 'Tag or value' }, { name: 'cat', type: 'select', label: 'Discrepancy type', all: 'All types', options: SV.tagcheck.CATS }, { name: 'sev', type: 'select', label: 'Severity', all: 'All', options: [['bad', 'Needs correction'], ['warn', 'Review']] }], key, () => draw());
      let shown = rows;
      const counts = {}; SV.tagcheck.CATS.forEach((c) => (counts[c] = rows.filter((r) => r.category === c).length));
      const draw = () => { const f = fs.values(); shown = rows.filter((r) => (!f.cat || r.category === f.cat) && (!f.sev || r.severity === f.sev) && SV.matchText(f.q, r.tag, r.approved, r.scada, r.field));
        host.replaceChildren(SV.table({ rows: shown, pageSize: 100, defaultSort: { key: 'category', dir: 1 }, empty: !A.length || !E.length ? 'Import both an approved tag list and a SCADA export to compare them.' : 'No discrepancies match the filters.' , columns: [{ key: 'category', label: 'Discrepancy', render: (r) => SV.badge(r.category, r.severity) }, { key: 'tag', label: 'Tag', cls: 'tag' }, { key: 'field', label: 'Field' }, { key: 'approved', label: 'Approved list', render: (r) => h('span', { class: 'wrap' }, r.approved) }, { key: 'scada', label: 'SCADA export', render: (r) => h('span', { class: 'wrap' }, r.scada) }].concat(SV.projectCol()) })); };
      draw();
      body = h('div', null, !A.length || !E.length ? h('div', { class: 'banner warn' }, SV.icon('warning'), h('div', { class: 'grow' }, 'Approved list: ' + A.length + ' tags · SCADA export: ' + E.length + ' tags. A comparison needs both lists in the same project. Missing tags cannot be detected without the approved list.')) : null,
        h('div', { class: 'annun' }, SV.tagcheck.CATS.map((c) => h('div', { class: 'tile ' + (counts[c] ? (c === 'Description mismatch' || c === 'Units mismatch' || c === 'Unexpected in SCADA' || c === 'Tag name case differs' ? 'warn' : 'bad') : (A.length && E.length ? 'ok' : '')) }, h('div', { class: 'legend' }, c), h('div', { class: 'val' }, counts[c]), h('div', { class: 'sub' }, '')))),
        h('div', { class: 'filters' }, h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: cs, onchange: async (e) => { await SV.setPref('tagCase', e.target.checked); SV.refresh(); } }), 'Case-sensitive tag matching'), h('span', { class: 'small faint' }, 'Data types are compared after normalising equivalent names (BOOL=BOOLEAN, REAL=FLOAT=FLOAT32, INT=INT16, DINT=INT32, …). Descriptions ignore case and extra spaces.')), fs.el, host);
      SV.tagcheck.last = () => shown;
    } else {
      const store = tab === 'approved' ? 'tagsApproved' : 'tagsExport', list = tab === 'approved' ? A : E;
      const fs = SV.filterBar([{ name: 'q', label: 'Search', placeholder: 'Tag or description' }], key, () => draw());
      const dupes = SV.tagcheck.compare(ids, { caseSensitive: cs }).filter((r) => r.category === 'Duplicate tag' && r.field === (tab === 'approved' ? 'Approved list' : 'SCADA export')).map((r) => SV.norm(r.tag));
      const draw = () => { const f = fs.values(); host.replaceChildren(SV.table({ rows: list.filter((r) => SV.matchText(f.q, r.tag, r.description, r.dataType)), pageSize: 100, defaultSort: { key: 'tag', dir: 1 }, empty: 'This list is empty. Use the import button above.', columns: [{ key: 'tag', label: 'Tag', cls: 'tag', render: (r) => [r.tag, dupes.includes(SV.norm(r.tag)) ? [' ', SV.badge('Duplicate', 'bad')] : null, SV.sampleTag(r)] }, { key: 'description', label: 'Description', render: (r) => h('span', { class: 'wrap' }, r.description) }, { key: 'dataType', label: 'Data type' }, { key: 'units', label: 'Units' }, { key: 'rangeLow', label: 'Low', render: (r) => SV.fmtNum(r.rangeLow) }, { key: 'rangeHigh', label: 'High', render: (r) => SV.fmtNum(r.rangeHigh) }].concat(SV.projectCol()),
        actions: (r) => [SV.iconBtn('trash', 'Delete tag ' + r.tag, async () => { await SV.remove(store, r.id); SV.refresh(); })] })); };
      draw();
      body = h('div', null, h('div', { class: 'btn-row', style: 'margin-bottom:10px' }, SV.btn('Clear this list for selected project(s)', { kind: 'danger', sm: true, disabled: !list.length, onClick: async () => { if (await SV.confirm({ title: 'Clear list', danger: true, confirmLabel: 'Clear list', message: 'Remove all ' + list.length + ' tags from this list' + (SV.scope() === 'all' ? ' in ALL projects' : '') + '?' })) { await SV.removeWhere(store, (r) => ids.includes(r.projectId), 'List cleared'); SV.toast('List cleared.', 'ok'); SV.refresh(); } } })), fs.el, host);
    }
    return h('div', null, SV.pageHeader('Tag Database Checker', 'Compare the approved tag list with a SCADA tag export. The approved list is the source of truth — nothing is inferred when it is missing.', [SV.btn('Import approved list', { kind: 'primary', icon: 'upload', onClick: () => importList('approved') }), SV.btn('Import SCADA export', { icon: 'upload', onClick: () => importList('export') }),
      SV.btn('Export discrepancy report (CSV)', { icon: 'download', disabled: !rows.length, onClick: () => SV.exports.csv('tagDiscrepancies', null, { caseSensitive: cs }) })]),
      SV.tabs([['compare', 'Comparison report (' + rows.length + ')'], ['approved', 'Approved list (' + A.length + ')'], ['export', 'SCADA export (' + E.length + ')']], tab, setTab), body);
  };
})();
