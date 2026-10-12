/* Commissioning checklist */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h, C = SV.C;
  const itemDialog = (rec) => {
    const isNew = !rec; rec = rec ? Object.assign({}, rec) : { id: SV.uid(), projectId: SV.defaultProjectId(), status: 'Open', category: C.CHECK_CATS[0], assignee: '' };
    const cats = [...new Set(C.CHECK_CATS.concat(SV.data.checklist.map((c) => c.category)))];
    SV.editDialog({ title: isNew ? 'New checklist item' : 'Edit checklist item', size: 'md', values: rec, fields: [{ name: 'projectId', label: 'Project', type: 'select', options: SV.projectOptions(), required: true }, { name: 'category', label: 'Category', required: true, list: cats, help: 'Pick a standard category or type your own.' }, { name: 'title', label: 'Checklist item', required: true, full: true }, { name: 'assignee', label: 'Assigned to' }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'status', label: 'Status', type: 'select', options: C.CHECK_STATUS }, { name: 'evidence', label: 'Evidence reference' }, { name: 'comments', label: 'Comments', type: 'textarea', full: true }],
      check: (v) => (v.status === 'Blocked' && !v.comments ? 'Explain in Comments why the item is blocked.' : ''),
      onSave: async (v) => { const nv = Object.assign({}, rec, v); if (v.status === 'Complete' && rec.status !== 'Complete') { nv.completedBy = SV.engineer() || v.assignee; nv.completedAt = SV.today(); } if (v.status !== 'Complete') { nv.completedBy = ''; nv.completedAt = ''; } await SV.save('checklist', SV.stamp(nv)); SV.toast('Item saved.', 'ok'); SV.refresh(); } });
  };
  const setStatus = async (r, status) => {
    const nv = Object.assign({}, r, { status, completedBy: status === 'Complete' ? SV.engineer() || r.assignee || '' : '', completedAt: status === 'Complete' ? SV.today() : '' });
    if (status === 'Blocked' && !r.comments) { SV.toast('Add a comment explaining the blocker (Edit).', 'warn'); itemDialog(Object.assign({}, nv)); return; }
    await SV.save('checklist', nv); SV.refresh();
  };
  SV.views.checklist = () => {
    const need = SV.needProject(); if (need) return h('div', null, SV.pageHeader('Commissioning Checklist'), need);
    const host = h('div'), top = h('div'), fs = SV.filterBar([{ name: 'q', label: 'Search', placeholder: 'Item, assignee, comment' }, { name: 'cat', type: 'select', label: 'Category', all: 'All categories', options: [...new Set(C.CHECK_CATS.concat(SV.data.checklist.map((c) => c.category)))] }, { name: 'status', type: 'select', label: 'Status', all: 'All statuses', options: C.CHECK_STATUS }, { name: 'who', type: 'select', label: 'Assignee', all: 'Anyone', options: [...new Set(SV.scoped('checklist').map((c) => c.assignee).filter(Boolean))].sort() }, { name: 'od', type: 'checkbox', label: 'Overdue only' }], 'checklist', () => draw());
    function draw() {
      const f = fs.values(), all = SV.scoped('checklist'), m = SV.metrics(SV.scopeIds()).check;
      top.replaceChildren(h('div', { class: 'annun' }, [['Items', m.total, ''], ['Complete', m.complete, m.pct + '% of applicable', 'ok'], ['Overdue', m.overdue, '', m.overdue ? 'bad' : 'ok'], ['Blocked', m.blocked, '', m.blocked ? 'warn' : '']].map((t) => h('div', { class: 'tile ' + (t[3] || '') }, h('div', { class: 'legend' }, t[0]), h('div', { class: 'val' }, t[1]), h('div', { class: 'sub' }, t[2])))), h('div', { class: 'banner info' }, SV.icon('info'), h('div', { class: 'grow' }, 'A fully ticked checklist is a record of tasks done — it does not by itself show that the system is safe, correct or compliant.')));
      const rows = all.filter((r) => (!f.cat || r.category === f.cat) && (!f.status || r.status === f.status) && (!f.who || r.assignee === f.who) && (!f.od || SV.isOverdueCheck(r)) && SV.matchText(f.q, r.title, r.assignee, r.comments, r.category, r.evidence));
      const cats = [...new Set(rows.map((r) => r.category))].sort((a, b) => { const ia = C.CHECK_CATS.indexOf(a), ib = C.CHECK_CATS.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
      host.replaceChildren(...(cats.length ? cats.map((c) => { const l = rows.filter((r) => r.category === c), app = l.filter((r) => r.status !== 'N/A'), done = l.filter((r) => r.status === 'Complete').length, od = l.filter(SV.isOverdueCheck).length;
        return h('details', { class: 'card', open: true }, h('summary', { style: 'cursor:pointer;display:flex;gap:12px;align-items:center;flex-wrap:wrap' }, h('b', null, c), h('span', { class: 'pill' }, done + ' / ' + app.length + ' complete'), od ? SV.badge(od + ' overdue', 'bad') : null, h('span', { style: 'min-width:120px;flex:0 0 140px' }, SV.charts.progress(SV.pct(done, app.length)))),
          h('div', { style: 'margin-top:10px' }, SV.table({ rows: l, pageSize: 100, defaultSort: { key: 'dueDate', dir: 1 }, rowClass: (r) => (SV.isOverdueCheck(r) ? 'row-bad' : r.status === 'Blocked' ? 'row-warn' : ''), columns: [{ key: 'title', label: 'Item', render: (r) => h('span', { class: 'wrap' }, [r.title, SV.sampleTag(r), r.comments ? h('div', { class: 'small muted' }, r.comments) : null]) }, { key: 'assignee', label: 'Assigned to' }, { key: 'dueDate', label: 'Due', render: (r) => [SV.fmtDate(r.dueDate) === '—' ? '' : r.dueDate, SV.isOverdueCheck(r) ? [' ', SV.badge('Overdue', 'bad')] : null] },
              { key: 'status', label: 'Status', render: (r) => h('select', { 'aria-label': 'Status of ' + r.title, onchange: (e) => setStatus(r, e.target.value), value: r.status }, C.CHECK_STATUS.map((s) => h('option', { value: s }, s))) }, { key: 'evidence', label: 'Evidence', render: (r) => (r.status === 'Complete' && !r.evidence ? SV.badge('No evidence', 'warn') : r.evidence) }].concat(SV.projectCol()),
            actions: (r) => [SV.iconBtn('edit', 'Edit ' + r.title, () => itemDialog(r)), SV.iconBtn('history', 'History of ' + r.title, () => SV.showHistory(r.id, r.title)), SV.iconBtn('trash', 'Delete ' + r.title, async () => { if (await SV.confirm({ title: 'Delete item', danger: true, confirmLabel: 'Delete', message: 'Delete “' + r.title + '”?' })) { await SV.remove('checklist', r.id); SV.refresh(); } })] })));
      }) : [SV.empty(all.length ? 'No items match the filters.' : 'No checklist items yet. Add items or generate a starter checklist.')]));
    }
    const starter = async () => {
      const pid = SV.scope() === 'all' ? SV.defaultProjectId() : SV.scope();
      if (!(await SV.confirm({ title: 'Generate starter checklist', confirmLabel: 'Add items', message: 'Add generic starter items for all ten categories to project ' + SV.projCode(pid) + '? They are task outlines only — tailor them to the approved project specifications. Existing items with the same title are skipped.' }))) return;
      const have = new Set(SV.data.checklist.filter((c) => c.projectId === pid).map((c) => c.category + '|' + c.title)), recs = [];
      Object.keys(SV.builtin.checklistStarter).forEach((cat) => SV.builtin.checklistStarter[cat].forEach((t) => { if (!have.has(cat + '|' + t)) recs.push(SV.stamp({ id: SV.uid(), projectId: pid, category: cat, title: t, assignee: '', dueDate: '', status: 'Open', comments: '', evidence: '', completedBy: '', completedAt: '' })); }));
      if (!recs.length) { SV.toast('All starter items already exist.', 'info'); return; } await SV.bulkSave('checklist', recs, 'Starter checklist', pid); SV.toast(recs.length + ' items added.', 'ok'); SV.refresh();
    };
    draw();
    return h('div', null, SV.pageHeader('Commissioning Checklist', 'Track the ten commissioning areas: assign items, set due dates, record comments and evidence, and follow what is still outstanding.', [SV.btn('Add item', { kind: 'primary', icon: 'plus', onClick: () => itemDialog() }), SV.btn('Generate starter checklist', { onClick: starter }), SV.btn('Export CSV', { icon: 'download', onClick: () => SV.exports.csv('checklist') })]), top, fs.el, host);
  };
})();
