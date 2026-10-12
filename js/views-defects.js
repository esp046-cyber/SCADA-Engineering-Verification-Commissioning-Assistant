/* Defect and punch-list tracking */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h, C = SV.C;
  const sevBadge = (s) => SV.badge(s, s === 'Critical' ? 'crit' : s === 'Major' ? 'warn' : s === 'Minor' ? 'info' : 'mute');

  const dialog = (rec) => {
    const isNew = !rec; rec = rec ? Object.assign({}, rec) : { id: SV.uid(), projectId: SV.defaultProjectId(), status: 'Open', severity: 'Major', category: C.DEF_CATS[0], reportedDate: SV.today(), retestResult: 'Not retested', assignee: '' };
    if (isNew) rec.defectId = SV.nextDefectId(rec.projectId);
    const att = SV.attachWidget({ ownerType: 'defects', ownerId: rec.id, projectId: rec.projectId });
    const statusOpts = rec.status === 'Closed' ? C.DEF_STATUS : C.DEF_STATUS.filter((s) => s !== 'Closed');
    const fm = SV.form([{ name: 'projectId', label: 'Project', type: 'select', options: SV.projectOptions(), required: true }, { name: 'defectId', label: 'Defect ID', required: true, validate: (v, a) => (SV.data.defects.some((x) => x.id !== rec.id && x.projectId === a.projectId && SV.norm(x.defectId) === SV.norm(v)) ? 'Defect ID already used in this project.' : '') },
      { name: 'title', label: 'Title', required: true, full: true }, { name: 'description', label: 'Description', type: 'textarea', full: true }, { name: 'equipment', label: 'Equipment / tag' }, { name: 'category', label: 'Category', type: 'select', options: C.DEF_CATS }, { name: 'severity', label: 'Severity', type: 'select', options: C.SEVERITY, required: true }, { name: 'assignee', label: 'Assigned engineer' },
      { name: 'status', label: 'Status', type: 'select', options: statusOpts, required: true, help: 'Closing needs a passed retest and a named approver — use the Close action on the defect.' }, { name: 'reportedDate', label: 'Date reported', type: 'date', required: true }, { name: 'dueDate', label: 'Due date', type: 'date', validate: (v, a) => (v && a.reportedDate && v < a.reportedDate ? 'Due date is before the reported date.' : '') },
      { section: 'Resolution and retest' }, { name: 'rootCause', label: 'Root cause', type: 'textarea', full: true }, { name: 'correctiveAction', label: 'Corrective action', type: 'textarea', full: true }, { name: 'retestResult', label: 'Retest result', type: 'select', options: C.RETEST }, { name: 'retestDate', label: 'Retest date', type: 'date' }, { name: 'evidence', label: 'Evidence reference', full: true },
      { node: h('div', null, h('label', { class: 'small muted' }, 'Photo attachments'), att.el) }], rec);
    const dlg = SV.dialog({ title: isNew ? 'Report defect' : 'Edit ' + rec.defectId, size: 'lg', body: h('div', null, h('div', { class: 'formerr hidden', id: 'df-err', role: 'alert' }), fm.el), actions: [{ label: 'Cancel', kind: 'ghost', onClick: async () => { await att.discardNew(); } }, { label: 'Save defect', kind: 'primary', onClick: async () => {
      const eb = dlg.el.querySelector('#df-err'), errs = fm.validate(), v = fm.get(); let msg = errs.length ? 'Please fix: ' + errs.slice(0, 3).join(' ') : '';
      if (!msg && (v.status === 'Resolved' || v.status === 'Awaiting retest') && !v.correctiveAction) msg = 'Record the corrective action before setting the status to ' + v.status + '.';
      if (!msg && v.retestResult !== 'Not retested' && !v.retestDate) msg = 'Enter the retest date for the recorded retest result.';
      if (!msg && v.status === 'Resolved' && v.retestResult !== 'Pass') msg = 'Resolved requires a passed retest. Use “Awaiting retest” until the retest passes.';
      eb.classList.toggle('hidden', !msg); eb.textContent = msg; if (msg) return false;
      const nv = Object.assign({}, rec, v); if (rec.status === 'Closed' && v.status !== 'Closed') { nv.closureApprovedBy = ''; nv.closureApprovedRole = ''; nv.closureApprovedAt = ''; }
      if (v.retestResult === 'Fail' && (v.status === 'Resolved')) nv.status = 'In progress';
      await SV.save('defects', SV.stamp(nv), { note: rec.status !== v.status ? 'Status ' + rec.status + ' → ' + v.status : '' }); SV.toast('Defect saved.', 'ok'); SV.refresh(); } }] });
    fm.refs.projectId.input.addEventListener('change', () => { if (isNew && /^DEF-\d+$/.test(fm.get().defectId)) fm.set('defectId', SV.nextDefectId(fm.get().projectId)); });
  };

  const close = async (r) => {
    const miss = []; if (r.retestResult !== 'Pass') miss.push('The retest result must be Pass.'); if (!r.correctiveAction) miss.push('A corrective action must be recorded.'); if (!r.retestDate) miss.push('The retest date must be recorded.');
    if (miss.length) { SV.alertDialog('Cannot close ' + r.defectId, h('div', null, h('p', null, 'Closure requires:'), h('ul', null, miss.map((m) => h('li', null, m))))); return; }
    const res = await SV.approvalDialog({ title: 'Close ' + r.defectId, confirmLabel: 'Approve closure', summary: SV.dl([['Defect', r.title], ['Severity', r.severity], ['Corrective action', r.correctiveAction], ['Retest', r.retestResult + ' on ' + r.retestDate]]), statement: 'I am authorised to approve closure of this defect and I have reviewed the corrective action and retest evidence.' });
    if (!res) return; await SV.save('defects', Object.assign({}, r, { status: 'Closed', closureApprovedBy: res.name, closureApprovedRole: res.role, closureApprovedAt: SV.nowISO() }), { action: 'close', note: 'Closure approved by ' + res.name }); SV.toast(r.defectId + ' closed.', 'ok'); SV.refresh();
  };

  const view = (r) => {
    const hist = SV.data.history.filter((x) => x.recordId === r.id && (x.action === 'create' || (x.changes || []).some((c) => c.f === 'status') || x.action === 'close')).sort((a, b) => (a.ts < b.ts ? -1 : 1));
    const att = SV.attachWidget({ ownerType: 'defects', ownerId: r.id, projectId: r.projectId, readonly: true });
    SV.dialog({ title: r.defectId + ' — ' + r.title, size: 'lg', body: h('div', null, h('p', null, sevBadge(r.severity), ' ', SV.badge(r.status), SV.isOverdueDefect(r) ? [' ', SV.badge('Overdue', 'bad')] : null, SV.sampleTag(r)),
      SV.dl([['Equipment / tag', r.equipment], ['Category', r.category], ['Assigned to', r.assignee], ['Reported', r.reportedDate], ['Due', r.dueDate], ['Description', r.description], ['Root cause', r.rootCause], ['Corrective action', r.correctiveAction], ['Retest', r.retestResult + (r.retestDate ? ' on ' + r.retestDate : '')], ['Closure approval', r.closureApprovedBy ? r.closureApprovedBy + ' (' + r.closureApprovedRole + ') ' + SV.fmtDT(r.closureApprovedAt) : 'Not approved'], ['Evidence', r.evidence]]),
      h('h3', { style: 'margin:14px 0 6px' }, 'Status history'), hist.length ? h('ul', { class: 'timeline' }, hist.map((x) => h('li', null, h('time', null, SV.fmtDT(x.ts) + ' · ' + (x.user || '')), x.action === 'create' ? 'Reported' : (x.changes.find((c) => c.f === 'status') ? 'Status: ' + x.changes.find((c) => c.f === 'status').from + ' → ' + x.changes.find((c) => c.f === 'status').to : x.action === 'close' ? 'Closure approved' : '') + (x.note && x.action === 'close' ? ' — ' + x.note : '')))) : h('p', { class: 'muted small' }, 'No status changes recorded yet.'),
      h('h3', { style: 'margin:14px 0 6px' }, 'Photos'), att.el), actions: [{ label: 'Close window', kind: 'ghost' }, { label: 'All changes', onClick: () => { SV.showHistory(r.id, r.defectId); return false; } }, { label: 'Edit', onClick: () => { setTimeout(() => dialog(r), 0); } }, r.status !== 'Closed' ? { label: 'Close defect…', kind: 'primary', onClick: () => { setTimeout(() => close(r), 0); } } : null].filter(Boolean) });
  };

  SV.views.defects = () => {
    const need = SV.needProject(); if (need) return h('div', null, SV.pageHeader('Defects & Punch List'), need);
    const host = h('div'), top = h('div'), fs = SV.filterBar([{ name: 'q', label: 'Search', placeholder: 'ID, title, equipment' }, { name: 'status', type: 'select', label: 'Status', all: 'All statuses', options: C.DEF_STATUS }, { name: 'sev', type: 'select', label: 'Severity', all: 'All severities', options: C.SEVERITY }, { name: 'cat', type: 'select', label: 'Category', all: 'All categories', options: C.DEF_CATS }, { name: 'who', type: 'select', label: 'Assignee', all: 'Anyone', options: [...new Set(SV.scoped('defects').map((d) => d.assignee).filter(Boolean))].sort() }, { name: 'od', type: 'checkbox', label: 'Overdue only' }, { name: 'open', type: 'checkbox', label: 'Hide closed' }], 'defects', () => draw()); let shown = [];
    function draw() {
      const f = fs.values(), all = SV.scoped('defects'), m = SV.metrics(SV.scopeIds()).defects;
      top.replaceChildren(h('div', { class: 'annun' }, [['Open defects', m.open, 'not yet closed', m.open ? 'warn' : 'ok'], ['Critical open', m.critical, '', m.critical ? 'bad' : 'ok'], ['Overdue', m.overdue, '', m.overdue ? 'bad' : 'ok'], ['Awaiting retest', m.awaitingRetest, '', m.awaitingRetest ? 'warn' : ''], ['Awaiting closure approval', m.awaitingClosure, '', m.awaitingClosure ? 'warn' : ''], ['Closed', m.closed, '', 'ok']].map((t) => h('div', { class: 'tile ' + t[3] }, h('div', { class: 'legend' }, t[0]), h('div', { class: 'val' }, t[1]), h('div', { class: 'sub' }, t[2])))));
      shown = all.filter((r) => (!f.status || r.status === f.status) && (!f.sev || r.severity === f.sev) && (!f.cat || r.category === f.cat) && (!f.who || r.assignee === f.who) && (!f.od || SV.isOverdueDefect(r)) && (!f.open || r.status !== 'Closed') && SV.matchText(f.q, r.defectId, r.title, r.equipment, r.description, r.rootCause));
      const sevRank = { Critical: 0, Major: 1, Minor: 2, Observation: 3 };
      host.replaceChildren(SV.table({ rows: shown, defaultSort: { key: 'severity', dir: 1 }, empty: all.length ? 'No defects match the filters.' : 'No defects recorded.', rowClass: (r) => (r.status !== 'Closed' && r.severity === 'Critical' ? 'row-bad' : SV.isOverdueDefect(r) ? 'row-warn' : ''), columns: [
        { key: 'defectId', label: 'ID', cls: 'tag', render: (r) => [r.defectId, SV.sampleTag(r)] }, { key: 'title', label: 'Title', render: (r) => h('span', { class: 'wrap' }, r.title) }, { key: 'equipment', label: 'Equipment / tag' }, { key: 'severity', label: 'Severity', value: (r) => sevRank[r.severity], render: (r) => sevBadge(r.severity) },
        { key: 'status', label: 'Status', render: (r) => SV.badge(r.status) }, { key: 'assignee', label: 'Assigned' }, { key: 'dueDate', label: 'Due', render: (r) => [r.dueDate, SV.isOverdueDefect(r) ? [' ', SV.badge('Overdue', 'bad')] : null] }, { key: 'retestResult', label: 'Retest', render: (r) => (r.retestResult === 'Not retested' ? '' : SV.badge(r.retestResult)) },
        { key: 'att', label: 'Photos', value: (r) => SV.att.count(r.id), render: (r) => (SV.att.count(r.id) ? SV.att.count(r.id) + ' photo(s)' : '') }].concat(SV.projectCol()),
        actions: (r) => [SV.iconBtn('eye', 'View ' + r.defectId, () => view(r)), SV.iconBtn('edit', 'Edit ' + r.defectId, () => dialog(r)), r.status !== 'Closed' ? SV.iconBtn('check', 'Close ' + r.defectId, () => close(r)) : null, SV.iconBtn('history', 'History of ' + r.defectId, () => SV.showHistory(r.id, r.defectId)),
          SV.iconBtn('trash', 'Delete ' + r.defectId, async () => { if (await SV.confirm({ title: 'Delete defect', danger: true, confirmLabel: 'Delete', message: 'Delete ' + r.defectId + ' and its photos? Closed defects are normally kept for the record.' })) { await SV.remove('defects', r.id); SV.refresh(); } })] }));
    }
    draw();
    return h('div', null, SV.pageHeader('Defects & Punch List', 'Track defects from report to retest and approved closure. Critical and overdue items are highlighted; status changes are kept in the history.', [SV.btn('Report defect', { kind: 'primary', icon: 'plus', onClick: () => dialog() }), SV.btn('Export CSV', { icon: 'download', onClick: () => SV.exports.csv('defects', shown.map((r) => r.id)) })]), top, fs.el, host);
  };
})();
