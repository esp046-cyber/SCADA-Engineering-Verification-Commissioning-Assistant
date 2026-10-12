/* Projects & favorites */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h;

  const countFor = (id) => SV.PROJECT_STORES.reduce((a, s) => a + SV.data[s].filter((r) => r.projectId === id).length, 0);
  SV.projectDialog = (p) => {
    const isNew = !p; p = p || { id: SV.uid(), favorite: false };
    SV.editDialog({ title: isNew ? 'New project' : 'Edit project ' + p.code, values: p, fields: [
      { name: 'code', label: 'Project ID', required: true, maxlength: 40, help: 'Unique short identifier, e.g. a contract or job number.', validate: (v) => (SV.data.projects.some((x) => x.id !== p.id && SV.norm(x.code) === SV.norm(v)) ? 'Project ID “' + v + '” is already used.' : '') },
      { name: 'name', label: 'Project name', required: true, maxlength: 120 }, { name: 'customer', label: 'Customer' }, { name: 'facility', label: 'Facility / site' },
      { name: 'description', label: 'System description', type: 'textarea', full: true }, { name: 'revision', label: 'Revision', placeholder: 'e.g. Rev A' },
      { name: 'favorite', label: 'Favorite project', type: 'checkbox' },
      { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date', validate: (v, all) => (v && all.startDate && v < all.startDate ? 'End date cannot be before the start date.' : '') }],
    onSave: async (v) => { await SV.save('projects', Object.assign({}, p, v)); SV.renderScope(); SV.toast('Project saved.', 'ok'); SV.refresh(); } });
  };
  SV.views.projects = () => {
    const host = h('div'), fs = SV.filterBar([{ name: 'q', label: 'Search projects' }, { name: 'fav', type: 'checkbox', label: 'Favorites only' }], 'projects', () => draw());
    function draw() {
      const f = fs.values(); const rows = SV.data.projects.filter((p) => (!f.fav || p.favorite) && SV.matchText(f.q, p.code, p.name, p.customer, p.facility));
      host.replaceChildren(SV.table({ rows, defaultSort: { key: 'code', dir: 1 }, empty: SV.data.projects.length ? 'No projects match the filters.' : 'No projects yet. Use “New project”.', columns: [
        { key: 'favorite', label: 'Fav', value: (p) => (p.favorite ? 0 : 1), render: (p) => SV.iconBtn(p.favorite ? 'star-fill' : 'star', p.favorite ? 'Remove ' + p.code + ' from Favorites' : 'Add ' + p.code + ' to Favorites', async () => { await SV.toggleFavorite(p.id); SV.refresh(); }, { on: p.favorite }) },
        { key: 'code', label: 'Project ID', cls: 'tag', render: (p) => [p.code, SV.sampleTag(p)] }, { key: 'name', label: 'Name', render: (p) => h('span', { class: 'wrap' }, p.name) }, { key: 'customer', label: 'Customer' }, { key: 'facility', label: 'Facility' }, { key: 'revision', label: 'Rev' },
        { key: 'startDate', label: 'Dates', render: (p) => SV.fmtDate(p.startDate) + ' → ' + SV.fmtDate(p.endDate) }, { key: 'n', label: 'Records', value: (p) => countFor(p.id), render: (p) => countFor(p.id) }],
      actions: (p) => [SV.btn('Open', { sm: true, onClick: () => SV.setScope(p.id).then(() => SV.go('dashboard')) }), SV.iconBtn('edit', 'Edit ' + p.code, () => SV.projectDialog(p)), SV.iconBtn('download', 'Export data for ' + p.code, () => SV.exportProjectDialog(p)), SV.iconBtn('history', 'History of ' + p.code, () => SV.showHistory(p.id, p.code)),
        SV.iconBtn('trash', 'Delete ' + p.code, async () => { if (await SV.confirm({ title: 'Delete project ' + p.code, danger: true, confirmLabel: 'Delete project', requireText: p.code, message: 'This permanently deletes the project and its ' + countFor(p.id) + ' linked record(s), including photos. Take a JSON backup first if you may need them.' })) { await SV.deleteProject(p.id); SV.renderScope(); SV.toast('Project deleted.', 'ok'); SV.refresh(); } })] }));
    }
    draw();
    return h('div', null, SV.pageHeader('Projects', 'Every test record is linked to a project. Use the selector at the top to filter all pages by project, and star projects to keep them at the top of the selector.', [SV.btn('New project', { kind: 'primary', icon: 'plus', onClick: () => SV.projectDialog() })]), fs.el, host);
  };
  SV.exportProjectDialog = (p) => SV.dialog({ title: 'Export ' + p.code, size: 'sm', body: h('p', null, 'Choose a format. The JSON file can be restored with Data Management → Restore (merge). The Excel workbook contains one sheet per record type.'), actions: [
    { label: 'Close', kind: 'ghost' }, { label: 'Excel workbook (.xlsx)', icon: 'download', onClick: () => { SV.exports.xlsx([p.id], p.code); return false; } },
    { label: 'JSON backup', kind: 'primary', icon: 'download', onClick: () => { SV.exports.projectJSON(p); return false; } }] });
})();
