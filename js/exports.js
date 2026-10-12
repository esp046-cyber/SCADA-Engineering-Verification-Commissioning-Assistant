/* CSV / Excel / JSON exports */
(function () {
  'use strict';
  const SV = window.SV;
  const P = (r) => SV.projCode(r.projectId), smp = (r) => (r.isSample ? 'SAMPLE' : '');
  const steps = (r) => (r.steps || []).map((s, i) => i + 1 + '. ' + s.text + ' [' + s.result + ']').join(' | ');
  const DS = {
    io: { sheet: 'I-O Verification', store: 'io', ctx: () => ({ d: SV.io.dupMap(SV.data.io) }), head: ['Project', 'Tag', 'Description', 'Equipment', 'Type', 'Units', 'Range low', 'Range high', 'Raw low', 'Raw high', 'SCADA low', 'SCADA high', 'Tolerance % span', 'Expected', 'Actual', 'Comparison', 'Status', 'Test date', 'Engineer', 'Evidence', 'Comments', 'Flags', 'Sample data'],
      row: (r, c) => [P(r), r.tag, r.description, r.equipment, r.type, r.units, r.rangeLow, r.rangeHigh, r.rawLow, r.rawHigh, r.scadaLow, r.scadaHigh, r.tolerance, r.expected, r.actual, SV.io.compare(r).state, r.status, r.testDate, r.engineer, r.evidence, r.comments, SV.io.flags(r, c.d).map((f) => f.text).join('; '), smp(r)] },
    tagsApproved: { sheet: 'Approved tags', store: 'tagsApproved', head: ['Project', 'Tag', 'Description', 'Data type', 'Units', 'Range low', 'Range high', 'Sample data'], row: (r) => [P(r), r.tag, r.description, r.dataType, r.units, r.rangeLow, r.rangeHigh, smp(r)] },
    tagsExport: { sheet: 'SCADA export tags', store: 'tagsExport', head: ['Project', 'Tag', 'Description', 'Data type', 'Units', 'Range low', 'Range high', 'Sample data'], row: (r) => [P(r), r.tag, r.description, r.dataType, r.units, r.rangeLow, r.rangeHigh, smp(r)] },
    alarms: { sheet: 'Alarm & Trip tests', store: 'alarms', head: ['Project', 'Test ID', 'Type', 'Tag', 'Description', 'Requirement ref', 'Configured limit', 'Units', 'Expected priority', 'Expected ack', 'Expected reset', 'Expected trip response', 'Steps', 'Observed priority', 'Observed ack', 'Observed reset', 'Observed trip response', 'Observed result', 'Result', 'Test date', 'Engineer', 'Evidence', 'Approval', 'Approved by', 'Approved at', 'Issues', 'Sample data'],
      row: (r) => [P(r), r.testId, r.kind, r.tag, r.alarmDescription, r.requirementRef, r.configuredLimit, r.limitUnits, r.expectedPriority, r.ackBehavior, r.resetBehavior, r.expectedTripResponse, steps(r), r.observedPriority, r.observedAck, r.observedReset, r.observedTripResponse, r.observedResult, r.result, r.testDate, r.engineer, r.evidence, r.approvalStatus, r.approvedBy, r.approvedAt, SV.alarm.issues(r).map((i) => i.text).join('; '), smp(r)] },
    comms: { sheet: 'Communication issues', store: 'comms', head: ['Project', 'Device', 'Type', 'IP / host', 'Protocol', 'Port', 'First observed', 'Resolved', 'Status', 'Source', 'Symptoms', 'Error messages', 'Suspected cause', 'Troubleshooting', 'Resolution', 'Reported by', 'Sample data'], row: (r) => [P(r), r.deviceName, r.deviceType, r.ip, r.protocol, r.port, r.occurredAt, r.resolvedAt, r.status, r.source, r.symptoms, r.errorMessages, r.suspectedCause, r.troubleshootingSteps, r.resolution, r.reportedBy, smp(r)] },
    tests: { sheet: 'FAT-SAT tests', store: 'tests', head: ['Project', 'Test ID', 'Type', 'Plan', 'Title', 'Objective', 'Prerequisites', 'Requirement ref', 'Steps', 'Expected result', 'Actual result', 'Status', 'Engineer', 'Witness', 'Date', 'Evidence', 'Approval', 'Approved by', 'Approved at', 'Sample data'],
      row: (r) => [P(r), r.testId, r.type, r.plan, r.title, r.objective, r.prerequisites, r.requirementRef, (r.steps || []).map((s, i) => i + 1 + '. ' + s.text + ' | expected: ' + s.expected + ' | actual: ' + s.actual + ' [' + s.result + ']').join('\n'), r.expectedResult, r.actualResult, r.status, r.engineer, r.witness, r.date, r.evidence, r.approvalStatus, r.approvedBy, r.approvedAt, smp(r)] },
    checklist: { sheet: 'Commissioning checklist', store: 'checklist', head: ['Project', 'Category', 'Item', 'Assigned to', 'Due date', 'Status', 'Overdue', 'Comments', 'Evidence', 'Completed by', 'Completed on', 'Sample data'], row: (r) => [P(r), r.category, r.title, r.assignee, r.dueDate, r.status, SV.isOverdueCheck(r) ? 'Yes' : '', r.comments, r.evidence, r.completedBy, r.completedAt, smp(r)] },
    defects: { sheet: 'Defects', store: 'defects', head: ['Project', 'Defect ID', 'Title', 'Description', 'Equipment / tag', 'Severity', 'Category', 'Assigned', 'Status', 'Reported', 'Due', 'Overdue', 'Root cause', 'Corrective action', 'Retest result', 'Retest date', 'Closure approved by', 'Closure approved at', 'Evidence', 'Photos', 'Sample data'], row: (r) => [P(r), r.defectId, r.title, r.description, r.equipment, r.severity, r.category, r.assignee, r.status, r.reportedDate, r.dueDate, SV.isOverdueDefect(r) ? 'Yes' : '', r.rootCause, r.correctiveAction, r.retestResult, r.retestDate, r.closureApprovedBy, r.closureApprovedAt, r.evidence, SV.att.count(r.id), smp(r)] },
    tagDiscrepancies: { sheet: 'Tag discrepancies', head: ['Project', 'Discrepancy', 'Tag', 'Field', 'Approved list', 'SCADA export', 'Severity'], special: (ids, o) => SV.tagcheck.compare(ids, o).map((r) => [SV.projCode(r.projectId), r.category, r.tag, r.field, r.approved, r.scada, r.severity === 'bad' ? 'Needs correction' : 'Review']) },
    evidence: { sheet: 'Evidence register', head: ['Project', 'Module', 'Reference', 'Description', 'Status', 'Evidence reference', 'Photos', 'Approval', 'Evidence missing', 'Sample data'], special: (ids) => SV.evidenceRows(ids).map((r) => [SV.projCode(r.projectId), r.module, r.ref, r.title, r.status, r.evidence, r.photos, r.approval, r.missing ? 'YES' : '', r.isSample ? 'SAMPLE' : '']) }
  };
  const E = (SV.exports = { names: Object.keys(DS), DS });
  E.table = (name, projectIds, recIds, opts) => {
    const d = DS[name], ids = projectIds || SV.scopeIds(), set = new Set(ids);
    if (d.special) return { head: d.head, rows: d.special(ids, opts || {}) };
    const c = d.ctx ? d.ctx() : null, only = recIds ? new Set(recIds) : null;
    return { head: d.head, rows: SV.data[d.store].filter((r) => set.has(r.projectId) && (!only || only.has(r.id))).map((r) => d.row(r, c)) };
  };
  const stamp = () => { const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0'); };
  const scopeName = () => (SV.scope() === 'all' ? 'all-projects' : SV.slug(SV.projCode(SV.scope())));
  E.csv = (name, recIds, opts) => { const t = E.table(name, null, recIds, opts); SV.downloadCSV(name + '-' + scopeName() + '-' + stamp() + '.csv', [t.head].concat(t.rows)); SV.toast('Exported ' + t.rows.length + ' row(s) to CSV.', 'ok'); };
  E.xlsx = (projectIds, label) => {
    const sheets = [], anySample = projectIds.some((id) => (SV.proj(id) || {}).isSample);
    sheets.push({ name: 'About', rows: [['SCADA Engineering Verification & Commissioning Assistant — export'], ['Exported', new Date().toISOString()], ['Projects', projectIds.map(SV.projCode).join(', ')], ['Note', 'Exported records are as entered by engineers. This workbook does not certify safety or compliance.'], anySample ? ['WARNING', 'Contains SAMPLE (fictional demonstration) records — not valid project evidence.'] : ['', '']] });
    Object.keys(DS).forEach((n) => { const t = E.table(n, projectIds); sheets.push({ name: DS[n].sheet, rows: [t.head].concat(t.rows) }); });
    SV.download('SCADA-EVC-' + SV.slug(label || 'export') + '-' + stamp() + '.xlsx', new Blob([SV.xlsx.build(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    SV.toast('Excel workbook exported.', 'ok');
  };
  E.bundle = (projectIds) => {
    const set = projectIds ? new Set(projectIds) : null, stores = {};
    SV.BACKUP_STORES.forEach((s) => { if (s === 'projects') stores[s] = SV.data.projects.filter((p) => !set || set.has(p.id)); else if (SV.PROJECT_STORES.includes(s)) stores[s] = SV.data[s].filter((r) => !set || set.has(r.projectId)); else if (s !== 'history' && s !== 'attachments' && s !== 'diagRuns' || !set) { if (SV.data[s]) stores[s] = SV.data[s]; } });
    if (set) { stores.history = SV.data.history.filter((x) => set.has(x.projectId)); stores.kb = []; stores.templates = []; }
    return { app: 'SCADA-EVC', schema: SV.schema, version: SV.version, exportedAt: new Date().toISOString(), exportedBy: SV.engineer(), scope: set ? 'project' : 'all', stores };
  };
  E.projectJSON = async (p) => {
    const b = E.bundle([p.id]); b.stores.attachments = [];
    const owners = new Set([].concat(b.stores.defects, b.stores.tests, b.stores.alarms).map((r) => r.id));
    for (const id of owners) b.stores.attachments.push(...(await SV.att.list(id)));
    SV.download('SCADA-EVC-project-' + SV.slug(p.code) + '-' + stamp() + '.json', JSON.stringify(b), 'application/json'); SV.toast('Project JSON exported.', 'ok');
  };
  E.fullBackup = async () => {
    const b = E.bundle(null); b.stores.attachments = await SV.db.getAll('attachments'); b.stores.diagRuns = SV.data.diagRuns;
    SV.download('SCADA-EVC-backup-' + stamp() + '.json', JSON.stringify(b), 'application/json'); await SV.setPref('lastBackup', SV.nowISO());
    const n = Object.keys(b.stores).reduce((a, s) => a + b.stores[s].length, 0); SV.toast('Backup downloaded (' + n + ' records).', 'ok'); return n;
  };
})();
