/* Shared helpers: CSV import dialog, steps editor, approval revocation */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h;

  SV.downloadCSV = (name, rows) => SV.download(name, SV.csv.stringify(rows), 'text/csv;charset=utf-8');

  /* parse(text, projectId) -> {valid:[], invalid:[{row,reason}], warnings:[], fatal?:string} */
  SV.csvImportDialog = (o) => {
    let result = null;
    const proj = SV.form([{ name: 'projectId', label: 'Import into project', type: 'select', options: SV.projectOptions(), default: SV.defaultProjectId(), required: true }].concat(o.modes ? [{ name: 'mode', label: 'Import mode', type: 'select', options: o.modes, default: o.modes[0][0] }] : []));
    const out = h('div', { 'aria-live': 'polite' }), file = h('input', { type: 'file', accept: '.csv,.txt,text/csv', id: 'imp-file' });
    const dlg = SV.dialog({ title: o.title, size: 'lg', body: h('div', null, h('p', { class: 'muted' }, o.help), proj.el, h('div', { class: 'field', style: 'margin-top:12px' }, h('label', { for: 'imp-file' }, 'CSV file'), file), out), actions: [
      { label: 'Cancel', kind: 'ghost' }, { label: 'Download CSV template', icon: 'download', onClick: () => { SV.downloadCSV(o.templateName, o.templateRows); return false; } },
      { label: 'Import valid rows', kind: 'primary', disabled: true, onClick: async () => { if (!result || !result.valid.length) return false; const v = proj.get(); await o.commit(result.valid, v); SV.toast(result.valid.length + ' row(s) imported.', 'ok'); SV.refresh(); } }] });
    const importBtn = dlg.el.querySelector('.dlg-foot .btn.primary');
    const run = async () => {
      result = null; importBtn.disabled = true; if (!file.files.length) return;
      try {
        const text = await SV.readFile(file.files[0]); result = o.parse(text, proj.get().projectId);
        if (result.fatal) { out.replaceChildren(h('div', { class: 'formerr' }, result.fatal)); result = null; return; }
        out.replaceChildren(h('div', null, h('div', { class: 'grid g3', style: 'margin:12px 0' }, h('div', { class: 'stat' }, h('b', null, result.valid.length), h('span', null, 'valid rows')), h('div', { class: 'stat' }, h('b', { style: 'color:' + (result.invalid.length ? 'var(--bad)' : 'inherit') }, result.invalid.length), h('span', null, 'invalid rows (will be skipped)')), h('div', { class: 'stat' }, h('b', null, result.warnings.length), h('span', null, 'warnings'))),
          result.warnings.length ? h('div', { class: 'banner warn' }, SV.icon('warning'), h('div', { class: 'grow' }, result.warnings.slice(0, 8).map((w) => h('div', null, w)))) : null,
          result.invalid.length ? [h('h3', { style: 'margin:10px 0 6px' }, 'Invalid rows'), SV.table({ pageSize: 10, rows: result.invalid, columns: [{ key: 'row', label: 'File row' }, { key: 'reason', label: 'Problem', render: (r) => h('span', { class: 'wrap' }, r.reason) }] })] : null));
        importBtn.disabled = !result.valid.length;
      } catch (e) { out.replaceChildren(h('div', { class: 'formerr' }, 'Could not read the file: ' + e.message)); }
    };
    file.addEventListener('change', run); proj.refs.projectId.input.addEventListener('change', run);
    return dlg;
  };

  /* cfg.cols: [{key,label,ro}] text columns; result column always last */
  SV.stepsEditor = (steps, cfg) => {
    const list = h('div', { class: 'steps-ed' }), wide = cfg.cols.length > 1; let rows = [];
    const addRow = (s) => {
      s = s || {}; const r = { cols: {} };
      const kids = [h('span', { class: 'no' }, String(rows.length + 1))];
      cfg.cols.forEach((c) => {
        const inp = c.ro ? h('div', { class: 'small', style: 'padding-top:8px;white-space:pre-wrap' }, s[c.key] || '') : h('textarea', { rows: 2, 'aria-label': c.label + ' for step ' + (rows.length + 1), placeholder: c.label }); if (!c.ro) inp.value = s[c.key] || '';
        r.cols[c.key] = { inp, ro: !!c.ro, val: s[c.key] || '' }; kids.push(inp);
      });
      r.res = h('select', { 'aria-label': 'Result for step ' + (rows.length + 1) }, SV.C.STEP_RESULT.map((x) => h('option', { value: x }, x))); r.res.value = s.result || 'Pending'; kids.push(r.res);
      if (cfg.readonlyStructure) kids.push(h('span')); else kids.push(SV.iconBtn('trash', 'Remove step', () => { rows = rows.filter((x) => x !== r); r.el.remove(); renumber(); }));
      r.el = h('div', { class: 'step-row' + (wide ? ' wide' : '') }, kids); rows.push(r); list.appendChild(r.el);
    };
    const renumber = () => rows.forEach((r, i) => (r.el.firstChild.textContent = String(i + 1)));
    (steps || []).forEach(addRow);
    const el = h('div', null, list, cfg.readonlyStructure ? null : h('div', { class: 'btn-row', style: 'margin-top:8px' }, SV.btn('Add step', { sm: true, icon: 'plus', onClick: () => addRow() }), cfg.starter ? SV.btn('Insert typical steps', { sm: true, onClick: () => { const s = cfg.starter(); s.forEach(addRow); } }) : null));
    return { el, add: addRow, get: () => rows.map((r) => { const o = {}; cfg.cols.forEach((c) => (o[c.key] = c.ro ? r.cols[c.key].val : r.cols[c.key].inp.value.trim())); o.result = r.res.value; return o; }).filter((s) => s[cfg.cols[0].key]), clear: () => { rows = []; list.replaceChildren(); } };
  };

  /* approvals are revoked if material content changes after sign-off */
  SV.revokeIfChanged = (old, next, fields, statusField) => {
    if (!old || old.approvalStatus !== 'Approved') return false;
    const changed = fields.some((f) => JSON.stringify(old[f]) !== JSON.stringify(next[f]));
    if (changed) { next.approvalStatus = 'Pending'; next.approvedBy = ''; next.approvedRole = ''; next.approvedAt = ''; next.approvalComment = ''; }
    return changed;
  };
  SV.approvalText = (r) => (r.approvalStatus === 'Approved' ? 'Approved by ' + r.approvedBy + (r.approvedRole ? ' (' + r.approvedRole + ')' : '') + ' on ' + SV.fmtDT(r.approvedAt) : r.approvalStatus || 'Pending');
  SV.projectCol = () => (SV.scope() === 'all' ? [{ key: 'projectId', label: 'Project', render: (r) => SV.projCode(r.projectId), value: (r) => SV.projCode(r.projectId) }] : []);
  SV.sampleTag = (r) => (r.isSample ? [' ', SV.sampleBadge()] : null);
  SV.inRange = (d, from, to) => (!from || (d && d.slice(0, 10) >= from)) && (!to || (d && d.slice(0, 10) <= to));
  SV.noProject = () => SV.needProject();
})();
