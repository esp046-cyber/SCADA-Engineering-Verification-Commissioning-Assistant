/* Alarm and trip test matrix */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h, C = SV.C;
  const MATERIAL = ['tag', 'kind', 'result', 'steps', 'observedResult', 'observedPriority', 'observedAck', 'observedReset', 'observedTripResponse', 'evidence', 'requirementRef', 'configuredLimit', 'expectedPriority', 'ackBehavior', 'resetBehavior', 'expectedTripResponse'];
  const nextId = (pid, kind) => { const pre = kind === 'Trip' ? 'TRP-' : 'ALM-'; let max = 0; SV.data.alarms.filter((a) => a.projectId === pid && (a.testId || '').startsWith(pre)).forEach((a) => { const m = /(\d+)$/.exec(a.testId); if (m) max = Math.max(max, +m[1]); }); return pre + String(max + 1).padStart(3, '0'); };

  const dialog = (rec) => {
    const isNew = !rec; rec = rec ? Object.assign({}, rec) : { id: SV.uid(), projectId: SV.defaultProjectId(), kind: 'Alarm', result: 'Not tested', approvalStatus: 'Pending', steps: [], engineer: '' };
    if (isNew) rec.testId = nextId(rec.projectId, rec.kind);
    const ed = SV.stepsEditor(rec.steps, { cols: [{ key: 'text', label: 'Test step' }], starter: () => SV.alarm.defaultSteps(fm.get().kind) });
    const att = SV.attachWidget({ ownerType: 'alarms', ownerId: rec.id, projectId: rec.projectId });
    const fm = SV.form([
      { section: 'Approved requirement' }, { name: 'projectId', label: 'Project', type: 'select', options: SV.projectOptions(), required: true }, { name: 'testId', label: 'Test ID', required: true, validate: (v, a) => (SV.data.alarms.some((x) => x.id !== rec.id && x.projectId === a.projectId && SV.norm(x.testId) === SV.norm(v)) ? 'Test ID already used in this project.' : '') },
      { name: 'kind', label: 'Type', type: 'select', options: C.ALARM_KIND, required: true }, { name: 'tag', label: 'Tag', required: true }, { name: 'alarmDescription', label: 'Alarm / trip description', required: true, full: true },
      { name: 'requirementRef', label: 'Approved requirement reference', help: 'Document and clause (e.g. FDS / cause-and-effect row). Without it a Pass cannot be recorded.', full: true },
      { name: 'configuredLimit', label: 'Configured limit', help: 'Value from the approved requirement.' }, { name: 'limitUnits', label: 'Limit units' },
      { name: 'expectedPriority', label: 'Expected priority', list: ['Low', 'Medium', 'High', 'Critical'] }, { name: 'ackBehavior', label: 'Expected acknowledgement behaviour', list: ['Latched — operator acknowledgement required', 'Auto-clears — no acknowledgement', 'Not applicable'] },
      { name: 'resetBehavior', label: 'Expected reset behaviour', list: ['Clears after return to normal and acknowledgement', 'Manual reset required', 'Auto-reset on return to normal', 'Not applicable'] }, { name: 'expectedTripResponse', label: 'Expected trip response', type: 'textarea', full: true, help: 'Required for trips; copy from the approved requirement.' },
      { section: 'Test steps' }, { node: ed.el },
      { section: 'Observed results' }, { name: 'observedPriority', label: 'Observed priority' }, { name: 'observedAck', label: 'Observed acknowledgement behaviour' }, { name: 'observedReset', label: 'Observed reset behaviour' }, { name: 'observedTripResponse', label: 'Observed trip response' },
      { name: 'observedResult', label: 'Observed result / notes', type: 'textarea', full: true },
      { name: 'result', label: 'Test result', type: 'select', options: C.ALARM_RESULT, required: true }, { name: 'testDate', label: 'Test date', type: 'date' }, { name: 'engineer', label: 'Test engineer', default: SV.engineer() }, { name: 'evidence', label: 'Evidence reference', placeholder: 'Test record, trend capture, photo ID' },
      { node: h('div', null, h('label', { class: 'small muted' }, 'Photo evidence'), att.el) }], rec);
    const dlg = SV.dialog({ title: isNew ? 'New alarm / trip test' : 'Edit ' + rec.testId + ' — ' + rec.tag, size: 'lg', body: h('div', null, rec.isSample ? h('div', { class: 'banner info' }, 'Demonstration record.') : null, rec.approvalStatus === 'Approved' ? h('div', { class: 'banner warn' }, SV.icon('warning'), 'This test is approved. Changing results, steps or evidence will revoke the approval and require sign-off again.') : null, h('div', { class: 'formerr hidden', id: 'al-err', role: 'alert' }), fm.el),
      onClose: () => {}, actions: [{ label: 'Cancel', kind: 'ghost', onClick: async () => { await att.discardNew(); } }, { label: 'Save test', kind: 'primary', onClick: async () => {
        const eb = dlg.el.querySelector('#al-err'), errs = fm.validate(); let msg = errs.length ? 'Please fix: ' + errs.slice(0, 3).join(' ') : '';
        const v = fm.get(); v.steps = ed.get(); const nv = Object.assign({}, rec, v);
        if (!msg && v.result === 'Pass') { const b = SV.alarm.passBlockers(nv); if (b.length) msg = 'Cannot record Pass: ' + b.join(' '); }
        eb.classList.toggle('hidden', !msg); eb.textContent = msg; if (msg) return false;
        const revoked = SV.revokeIfChanged(rec, nv, MATERIAL); await SV.save('alarms', SV.stamp(nv), { note: revoked ? 'Approval revoked because the test record changed' : '' });
        SV.toast(revoked ? 'Saved. Approval was revoked — sign-off is required again.' : 'Test saved.', revoked ? 'warn' : 'ok'); SV.refresh(); } }] });
    fm.refs.kind.input.addEventListener('change', () => { if (isNew && /^(ALM|TRP)-\d+$/.test(fm.get().testId)) fm.set('testId', nextId(fm.get().projectId, fm.get().kind)); });
  };

  const approve = async (r) => {
    const iss = SV.alarm.issues(r).filter((i) => i.block); if (iss.length || r.result !== 'Pass') { SV.alertDialog('Not ready for approval', h('div', null, h('p', null, 'This test cannot be approved yet:'), h('ul', null, (r.result !== 'Pass' ? [h('li', null, 'Result is not Pass.')] : []).concat(SV.alarm.passBlockers(r).map((m) => h('li', null, m)), (SV.hasEvidence(r) ? [] : [h('li', null, 'No evidence is recorded.')]))))); return; }
    const res = await SV.approvalDialog({ title: 'Approve ' + r.testId + ' — ' + r.tag, summary: SV.dl([['Requirement', r.requirementRef], ['Configured limit', r.configuredLimit + ' ' + (r.limitUnits || '')], ['Observed result', r.observedResult], ['Evidence', r.evidence + (SV.att.count(r.id) ? ' (+' + SV.att.count(r.id) + ' photo/s)' : '')], ['Tested by', r.engineer + ' on ' + r.testDate]]), statement: 'I am authorised to approve this ' + r.kind.toLowerCase() + ' test and I have compared the observed result with the approved requirement and reviewed the evidence.' });
    if (!res) return; await SV.save('alarms', Object.assign({}, r, { approvalStatus: 'Approved', approvedBy: res.name, approvedRole: res.role, approvedAt: SV.nowISO(), approvalComment: res.comment }), { action: 'approve', note: 'Approved by ' + res.name }); SV.toast('Approval recorded.', 'ok'); SV.refresh();
  };

  SV.views.alarms = () => {
    const need = SV.needProject(); if (need) return h('div', null, SV.pageHeader('Alarm & Trip Tests'), need);
    const host = h('div'), sum = h('div'), fs = SV.filterBar([{ name: 'q', label: 'Search', placeholder: 'Test ID, tag, description' }, { name: 'kind', type: 'select', label: 'Type', all: 'Alarms and trips', options: C.ALARM_KIND }, { name: 'result', type: 'select', label: 'Result', all: 'All results', options: C.ALARM_RESULT }, { name: 'appr', type: 'select', label: 'Approval', all: 'All', options: C.APPROVAL }, { name: 'iss', type: 'checkbox', label: 'Only items with issues' }], 'alarms', () => draw()); let shown = [];
    function draw() {
      const f = fs.values(), all = SV.scoped('alarms'), m = SV.metrics(SV.scopeIds()).alarms;
      sum.replaceChildren(h('div', { class: 'annun' }, [['Tests', m.total, m.trips + ' trips', ''], ['Passed', m.pass, '', 'ok'], ['Failed', m.fail, '', m.fail ? 'bad' : ''], ['Not tested / blocked', m.notTested + m.blocked, '', m.notTested + m.blocked ? 'warn' : ''], ['Awaiting approval', m.pendingApproval, 'passed, not signed off', m.pendingApproval ? 'warn' : ''], ['Evidence incomplete', m.evidenceGaps, '', m.evidenceGaps ? 'bad' : 'ok'], ['No requirement ref', m.noReq, 'cannot be passed', m.noReq ? 'bad' : 'ok']].map((t) => h('div', { class: 'tile ' + t[3] }, h('div', { class: 'legend' }, t[0]), h('div', { class: 'val' }, t[1]), h('div', { class: 'sub' }, t[2])))));
      shown = all.filter((r) => (!f.kind || r.kind === f.kind) && (!f.result || r.result === f.result) && (!f.appr || r.approvalStatus === f.appr) && SV.matchText(f.q, r.testId, r.tag, r.alarmDescription, r.requirementRef) && (!f.iss || SV.alarm.issues(r).length));
      host.replaceChildren(SV.table({ rows: shown, defaultSort: { key: 'testId', dir: 1 }, empty: all.length ? 'No tests match the filters.' : 'No alarm or trip tests yet. Create tests from the approved alarm and trip requirements.', rowClass: (r) => (r.result === 'Fail' ? 'row-bad' : SV.alarm.issues(r).some((i) => i.block) ? 'row-warn' : ''), columns: [
        { key: 'testId', label: 'Test ID', cls: 'tag', render: (r) => [r.testId, SV.sampleTag(r)] }, { key: 'kind', label: 'Type', render: (r) => SV.badge(r.kind, r.kind === 'Trip' ? 'crit' : 'info') }, { key: 'tag', label: 'Tag', cls: 'tag' }, { key: 'alarmDescription', label: 'Description', render: (r) => h('span', { class: 'wrap' }, r.alarmDescription) },
        { key: 'configuredLimit', label: 'Limit', render: (r) => (r.configuredLimit ? r.configuredLimit + ' ' + (r.limitUnits || '') : '') }, { key: 'expectedPriority', label: 'Priority' }, { key: 'steps', label: 'Steps', value: (r) => (r.steps || []).length, render: (r) => { const s = r.steps || []; return s.length ? s.filter((x) => x.result === 'Pass' || x.result === 'N/A').length + '/' + s.length + ' done' : ''; } },
        { key: 'result', label: 'Result', render: (r) => SV.badge(r.result) }, { key: 'approvalStatus', label: 'Approval', render: (r) => h('span', { title: SV.approvalText(r) }, SV.badge(r.approvalStatus || 'Pending')) }, { key: 'iss', label: 'Issues', nosort: true, render: (r) => SV.flagList(SV.alarm.issues(r)) }].concat(SV.projectCol()),
      actions: (r) => [SV.iconBtn('edit', 'Edit ' + r.testId, () => dialog(r)), r.approvalStatus === 'Approved' ? SV.iconBtn('x', 'Revoke approval of ' + r.testId, async () => { if (await SV.confirm({ title: 'Revoke approval', danger: true, confirmLabel: 'Revoke', message: 'Revoke the approval of ' + r.testId + '? It will return to Pending.' })) { await SV.save('alarms', Object.assign({}, r, { approvalStatus: 'Pending', approvedBy: '', approvedRole: '', approvedAt: '', approvalComment: '' }), { action: 'revoke', note: 'Approval revoked' }); SV.refresh(); } }) : SV.iconBtn('check', 'Review and approve ' + r.testId, () => approve(r), { disabled: r.result !== 'Pass' }), SV.iconBtn('history', 'History of ' + r.testId, () => SV.showHistory(r.id, r.testId)),
        SV.iconBtn('trash', 'Delete ' + r.testId, async () => { if (await SV.confirm({ title: 'Delete test', danger: true, confirmLabel: 'Delete', message: 'Delete test ' + r.testId + ' and its evidence photos?' })) { await SV.remove('alarms', r.id); SV.refresh(); } })] }));
    }
    draw();
    return h('div', null, SV.pageHeader('Alarm & Trip Test Matrix', 'Each test is built from an approved requirement. A trip is never treated as correct without the requirement reference, a documented result and evidence — and only a person can approve it.', [SV.btn('New test', { kind: 'primary', icon: 'plus', onClick: () => dialog() }), SV.btn('Export CSV', { icon: 'download', onClick: () => SV.exports.csv('alarms', shown.map((r) => r.id)) })]), sum, fs.el, host);
  };
})();
