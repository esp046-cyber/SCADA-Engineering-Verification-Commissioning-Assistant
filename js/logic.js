/* Domain logic: constants, validation, comparison, metrics (pure, testable) */
(function () {
  'use strict';
  const SV = window.SV;
  const { norm, str, isNum, num } = SV;

  SV.C = {
    IO_TYPES: [['DI', 'DI — Digital input'], ['DO', 'DO — Digital output'], ['AI', 'AI — Analog input'], ['AO', 'AO — Analog output']],
    IO_STATUS: ['Not tested', 'Pass', 'Fail', 'N/A'],
    ALARM_KIND: ['Alarm', 'Trip'], ALARM_RESULT: ['Not tested', 'Pass', 'Fail', 'Blocked'], APPROVAL: ['Pending', 'Approved', 'Rejected'],
    TEST_STATUS: ['Not run', 'In progress', 'Pass', 'Fail', 'Blocked', 'N/A'], STEP_RESULT: ['Pending', 'Pass', 'Fail', 'N/A'],
    CHECK_STATUS: ['Open', 'In progress', 'Complete', 'Blocked', 'N/A'],
    CHECK_CATS: ['Design and document verification', 'Hardware installation and inspection', 'Power and grounding checks', 'I/O checks and loop checks', 'SCADA graphics and tag verification', 'Alarm and event testing', 'Communication verification', 'Functional testing', 'Startup readiness', 'Training and handover preparation'],
    DEF_STATUS: ['Open', 'In progress', 'Awaiting retest', 'Resolved', 'Closed'], SEVERITY: ['Critical', 'Major', 'Minor', 'Observation'],
    DEF_CATS: ['Hardware', 'Software / configuration', 'SCADA graphics', 'I/O / wiring', 'Communications', 'Alarm / trip logic', 'Documentation', 'Performance', 'Other'],
    RETEST: ['Not retested', 'Pass', 'Fail'],
    PROTOCOLS: ['Modbus TCP', 'Modbus RTU', 'OPC UA', 'OPC DA', 'DNP3', 'IEC 60870-5-104', 'IEC 61850', 'EtherNet/IP', 'PROFINET', 'PROFIBUS', 'Siemens S7', 'BACnet/IP', 'MQTT', 'Other'],
    DEVICE_TYPES: ['SCADA server', 'Historian / database server', 'PLC', 'RTU', 'HMI / operator station', 'Network switch / router', 'Gateway / protocol converter', 'Remote I/O', 'Other'],
    COMM_STATUS: ['Open', 'Investigating', 'Resolved', 'Closed'],
    SRC_MANUAL: 'Manual observation', SRC_AUTO: 'Automatic (browser-collected)'
  };

  const eq = (a, b) => Math.abs(a - b) < 1e-9;

  /* ---------------- I/O ---------------- */
  const io = (SV.io = {});
  io.isAnalog = (t) => t === 'AI' || t === 'AO';
  io.compare = (r) => {
    const e = str(r.expected), a = str(r.actual);
    if (e === '' || a === '') return { state: 'incomplete', text: 'Expected and/or actual value not recorded' };
    if (io.isAnalog(r.type)) {
      if (!isNum(e) || !isNum(a)) return { state: 'incomplete', text: 'Analog comparison needs numeric expected and actual values' };
      const delta = Number(a) - Number(e), lo = num(r.rangeLow), hi = num(r.rangeHigh), span = lo !== null && hi !== null ? hi - lo : null, tol = num(r.tolerance);
      const allowed = tol !== null && span > 0 ? (tol / 100) * span : 0;
      const ok = Math.abs(delta) <= allowed + 1e-9;
      return { state: ok ? 'match' : 'deviation', delta, allowed, text: (ok ? 'Within ' : 'Outside ') + (tol !== null ? '±' + +allowed.toPrecision(6) + ' (' + tol + '% of span)' : 'exact match (no tolerance specified)') + '; Δ = ' + +delta.toPrecision(6) };
    }
    return norm(e) === norm(a) ? { state: 'match', text: 'States match' } : { state: 'deviation', text: 'Actual state differs from expected' };
  };
  io.dupMap = (list) => { const m = new Map(); list.forEach((r) => { const k = r.projectId + '|' + norm(r.tag); if (norm(r.tag)) m.set(k, (m.get(k) || 0) + 1); }); return m; };
  io.flags = (r, dups) => {
    const f = [], add = (text, kind, code) => f.push({ text, kind, code });
    if (!str(r.tag)) add('Missing tag', 'bad', 'missing');
    else if (dups && dups.get(r.projectId + '|' + norm(r.tag)) > 1) add('Duplicate tag', 'bad', 'duplicate');
    if (io.isAnalog(r.type)) {
      const lo = num(r.rangeLow), hi = num(r.rangeHigh);
      if (lo === null || hi === null || lo >= hi) add('Invalid range', 'bad', 'range');
      else {
        const e = num(r.expected), a = num(r.actual), tol = num(r.tolerance), pad = tol !== null ? (tol / 100) * (hi - lo) : 0;
        if (e !== null && (e < lo - pad - 1e-9 || e > hi + pad + 1e-9)) add('Expected outside range', 'warn', 'exp-range');
        if (a !== null && (a < lo - pad - 1e-9 || a > hi + pad + 1e-9)) add('Actual outside range', 'warn', 'act-range');
      }
      const rl = num(r.rawLow), rh = num(r.rawHigh);
      if ((rl === null) !== (rh === null) || (rl !== null && rl === rh)) add('Invalid raw span', 'bad', 'raw');
      const sl = num(r.scadaLow), sh = num(r.scadaHigh);
      if ((sl !== null || sh !== null) && lo !== null && hi !== null && (sl === null || sh === null || !eq(sl, lo) || !eq(sh, hi))) add('Scaling mismatch', 'bad', 'scaling');
    }
    const cmp = io.compare(r);
    if (r.status === 'Pass') {
      if (cmp.state === 'deviation') add('Pass but values differ', 'bad', 'pass-dev');
      if (cmp.state === 'incomplete') add('Pass without comparison data', 'warn', 'pass-inc');
      if (!str(r.testDate) || !str(r.engineer)) add('Test date/engineer missing', 'warn', 'pass-meta');
    }
    if ((r.status === 'Pass' || r.status === 'Fail') && !SV.hasEvidence(r)) add('No evidence', 'info', 'evidence');
    return f;
  };
  /* linear scaling: raw → engineering */
  io.scale = (rawLow, rawHigh, engLow, engHigh, raw) => {
    if ([rawLow, rawHigh, engLow, engHigh, raw].some((v) => !isNum(v)) || Number(rawHigh) === Number(rawLow)) return null;
    return Number(engLow) + ((Number(raw) - Number(rawLow)) / (Number(rawHigh) - Number(rawLow))) * (Number(engHigh) - Number(engLow));
  };
  SV.hasEvidence = (r) => !!str(r.evidence) || SV.att.count(r.id) > 0;

  /* ---------------- tag database checker ---------------- */
  const tc = (SV.tagcheck = {});
  tc.CATS = ['Missing in SCADA', 'Unexpected in SCADA', 'Duplicate tag', 'Description mismatch', 'Data type mismatch', 'Range mismatch', 'Units mismatch', 'Tag name case differs'];
  const TYPE_SYN = { BOOLEAN: 'BOOL', FLOAT: 'REAL', FLOAT32: 'REAL', SINGLE: 'REAL', DOUBLE: 'LREAL', FLOAT64: 'LREAL', INTEGER: 'INT', INT16: 'INT', SHORT: 'INT', INT32: 'DINT', UINT16: 'UINT', UINT32: 'UDINT' };
  tc.normType = (s) => { const k = String(s || '').toUpperCase().replace(/[\s_\-]/g, ''); return TYPE_SYN[k] || k; };
  const nd = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  tc.compare = (ids, opt) => {
    opt = opt || {}; const rows = [], cs = !!opt.caseSensitive, key = (t) => (cs ? str(t) : norm(t));
    ids.forEach((pid) => {
      const A = SV.data.tagsApproved.filter((r) => r.projectId === pid), E = SV.data.tagsExport.filter((r) => r.projectId === pid);
      const mk = (list) => { const m = new Map(), dup = new Map(); list.forEach((r) => { const k = key(r.tag); if (!k) return; if (m.has(k)) { dup.set(k, (dup.get(k) || [m.get(k)]).concat(r)); } else m.set(k, r); }); return { m, dup }; };
      const a = mk(A), e = mk(E), push = (category, tag, field, av, ev, severity) => rows.push({ projectId: pid, category, tag, field: field || '', approved: av === undefined || av === null ? '' : String(av), scada: ev === undefined || ev === null ? '' : String(ev), severity: severity || 'bad' });
      a.dup.forEach((list) => push('Duplicate tag', list[0].tag, 'Approved list', list.length + ' entries', '', 'bad'));
      e.dup.forEach((list) => push('Duplicate tag', list[0].tag, 'SCADA export', '', list.length + ' entries', 'bad'));
      a.m.forEach((ar, k) => {
        const er = e.m.get(k);
        if (!er) { push('Missing in SCADA', ar.tag, '', ar.description, '', 'bad'); return; }
        if (!cs && ar.tag !== er.tag) push('Tag name case differs', ar.tag, 'Tag', ar.tag, er.tag, 'warn');
        if (nd(ar.description) !== nd(er.description)) push('Description mismatch', ar.tag, 'Description', ar.description, er.description, 'warn');
        if (tc.normType(ar.dataType) !== tc.normType(er.dataType)) push('Data type mismatch', ar.tag, 'Data type', ar.dataType, er.dataType, 'bad');
        if (nd(ar.units) !== nd(er.units)) push('Units mismatch', ar.tag, 'Units', ar.units, er.units, 'warn');
        ['rangeLow', 'rangeHigh'].forEach((f) => {
          const x = num(ar[f]), y = num(er[f]);
          if ((x === null) !== (y === null) || (x !== null && !eq(x, y))) push('Range mismatch', ar.tag, f === 'rangeLow' ? 'Range low' : 'Range high', ar[f], er[f], 'bad');
        });
      });
      e.m.forEach((er, k) => { if (!a.m.has(k)) push('Unexpected in SCADA', er.tag, '', '', er.description, 'warn'); });
    });
    return rows;
  };

  /* ---------------- alarms & trips ---------------- */
  const al = (SV.alarm = {});
  al.stepsDone = (r) => (r.steps || []).every((s) => s.result === 'Pass' || s.result === 'N/A');
  al.passBlockers = (r) => {
    const m = [];
    if (!str(r.requirementRef)) m.push('An approved requirement reference is required before a result can be recorded as Pass.');
    if (r.kind === 'Trip' && !str(r.expectedTripResponse)) m.push('The expected trip response from the approved requirement must be recorded before Pass.');
    if (!str(r.configuredLimit)) m.push('The configured limit must be recorded before Pass.');
    if (!(r.steps || []).length) m.push('Add at least one test step and record its result before Pass.');
    else if (!al.stepsDone(r)) m.push('Every test step must be Pass or N/A before the overall result can be Pass.');
    if (!str(r.engineer) || !str(r.testDate)) m.push('Engineer and test date are required for a Pass result.');
    if (!str(r.observedResult)) m.push('Record the observed result before Pass.');
    [['observedPriority', 'expectedPriority', 'priority'], ['observedAck', 'ackBehavior', 'acknowledgement behaviour'], ['observedReset', 'resetBehavior', 'reset behaviour']].forEach(([o, e, n]) => { if (str(r[o]) && str(r[e]) && norm(r[o]) !== norm(r[e])) m.push('Observed ' + n + ' differs from the expected value — a Pass cannot be recorded.'); });
    return m;
  };
  al.issues = (r) => {
    const f = [], add = (text, kind, block) => f.push({ text, kind, block: !!block });
    if (!str(r.requirementRef)) add('No requirement ref', 'bad', true);
    if (r.kind === 'Trip' && !str(r.expectedTripResponse)) add('No expected trip response', 'bad', true);
    if (r.result === 'Fail') add('Test failed', 'bad');
    if ((r.result === 'Pass' || r.result === 'Fail') && !SV.hasEvidence(r)) add('Evidence incomplete', 'warn', true);
    if (r.result === 'Pass') al.passBlockers(r).forEach((m) => { if (!/requirement reference|expected trip response/.test(m)) add(m.length > 44 ? 'Pass criteria not met' : m, 'bad', true); });
    return f.filter((x, i) => f.findIndex((y) => y.text === x.text) === i);
  };
  al.approvable = (r) => r.result === 'Pass' && r.approvalStatus !== 'Approved' && !al.issues(r).some((i) => i.block);
  al.defaultSteps = (kind) => {
    const s = ['Confirm the approved requirement, setpoint and priority against the project specification', 'Confirm the test is authorised and permits/isolations are in place', 'Apply the test condition using the approved procedure', 'Observe and record alarm annunciation, priority and message text', 'Verify acknowledgement behaviour', 'Verify reset / return-to-normal behaviour', 'Restore normal conditions and confirm the system is returned to its pre-test state'];
    if (kind === 'Trip') s.splice(4, 0, 'Observe and record the trip response in a permitted test mode (do not rely on assumed behaviour)');
    return s.map((t) => ({ text: t, result: 'Pending', note: '' }));
  };

  /* ---------------- FAT / SAT ---------------- */
  const ft = (SV.fatsat = {});
  ft.stepsDone = (r) => (r.steps || []).every((s) => s.result === 'Pass' || s.result === 'N/A');
  ft.passBlockers = (r) => {
    const m = [];
    if (!(r.steps || []).length) m.push('Add at least one procedure step and record its result before Pass.');
    else if (!ft.stepsDone(r)) m.push('Every step must be Pass or N/A before the overall status can be Pass.');
    if (!str(r.engineer) || !str(r.date)) m.push('Engineer and test date are required for a Pass result.');
    if (!str(r.actualResult)) m.push('Record the overall actual result before Pass.');
    return m;
  };
  ft.issues = (r) => {
    const f = [], add = (text, kind, block) => f.push({ text, kind, block: !!block });
    if (!str(r.requirementRef)) add('No requirement ref', 'warn', true);
    if (r.status === 'Fail') add('Test failed', 'bad');
    if ((r.status === 'Pass' || r.status === 'Fail') && !SV.hasEvidence(r)) add('Evidence incomplete', 'warn', true);
    if (r.status === 'Pass' && !str(r.witness)) add('No witness recorded', 'info');
    if (r.status === 'Pass' && ft.passBlockers(r).length) add('Pass criteria not met', 'bad', true);
    return f;
  };
  ft.approvable = (r) => r.status === 'Pass' && r.approvalStatus !== 'Approved' && !ft.issues(r).some((i) => i.block);

  /* ---------------- checklist & defects ---------------- */
  SV.isOverdueCheck = (r) => !!r.dueDate && r.dueDate < SV.today() && r.status !== 'Complete' && r.status !== 'N/A';
  SV.isOverdueDefect = (r) => !!r.dueDate && r.dueDate < SV.today() && r.status !== 'Resolved' && r.status !== 'Closed';
  SV.nextDefectId = (pid) => {
    const code = SV.projCode(pid); let max = 0;
    SV.data.defects.filter((d) => d.projectId === pid).forEach((d) => { const m = /(\d+)\s*$/.exec(d.defectId || ''); if (m) max = Math.max(max, Number(m[1])); });
    return 'DEF-' + String(max + 1).padStart(3, '0');
  };

  /* ---------------- metrics ---------------- */
  SV.metrics = (ids) => {
    const set = new Set(ids), f = (s) => SV.data[s].filter((r) => set.has(r.projectId)), m = {};
    const io_ = f('io'), dups = io.dupMap(io_), n = (a, fn) => a.filter(fn).length;
    const ioApplicable = io_.length - n(io_, (r) => r.status === 'N/A');
    m.io = { total: io_.length, pass: n(io_, (r) => r.status === 'Pass'), fail: n(io_, (r) => r.status === 'Fail'), notTested: n(io_, (r) => r.status === 'Not tested' || !r.status), na: n(io_, (r) => r.status === 'N/A'), applicable: ioApplicable, flagged: n(io_, (r) => io.flags(r, dups).some((x) => x.kind === 'bad')) };
    m.io.pct = SV.pct(m.io.pass, ioApplicable);
    const rows = tc.compare(ids), by = {}; tc.CATS.forEach((c) => (by[c] = 0)); rows.forEach((r) => by[r.category]++);
    m.tags = { approved: f('tagsApproved').length, exported: f('tagsExport').length, discrepancies: rows.length, by };
    const al_ = f('alarms');
    m.alarms = { total: al_.length, pass: n(al_, (r) => r.result === 'Pass'), fail: n(al_, (r) => r.result === 'Fail'), notTested: n(al_, (r) => r.result === 'Not tested' || !r.result), blocked: n(al_, (r) => r.result === 'Blocked'), pendingApproval: n(al_, (r) => r.result === 'Pass' && r.approvalStatus !== 'Approved'), approved: n(al_, (r) => r.approvalStatus === 'Approved'), evidenceGaps: n(al_, (r) => (r.result === 'Pass' || r.result === 'Fail') && !SV.hasEvidence(r)), trips: n(al_, (r) => r.kind === 'Trip'), noReq: n(al_, (r) => !str(r.requirementRef)) };
    const te = f('tests'); m.tests = {};
    ['FAT', 'SAT'].forEach((t) => {
      const l = te.filter((r) => r.type === t), na = n(l, (r) => r.status === 'N/A');
      m.tests[t] = { total: l.length, pass: n(l, (r) => r.status === 'Pass'), fail: n(l, (r) => r.status === 'Fail'), notRun: n(l, (r) => r.status === 'Not run' || !r.status), inProgress: n(l, (r) => r.status === 'In progress'), blocked: n(l, (r) => r.status === 'Blocked'), na, applicable: l.length - na, pendingApproval: n(l, (r) => r.status === 'Pass' && r.approvalStatus !== 'Approved') };
      m.tests[t].pct = SV.pct(m.tests[t].pass, m.tests[t].applicable);
    });
    const ck = f('checklist'), ckApp = ck.length - n(ck, (r) => r.status === 'N/A');
    m.check = { total: ck.length, complete: n(ck, (r) => r.status === 'Complete'), na: n(ck, (r) => r.status === 'N/A'), applicable: ckApp, overdue: n(ck, SV.isOverdueCheck), blocked: n(ck, (r) => r.status === 'Blocked'), byCat: {} };
    m.check.pct = SV.pct(m.check.complete, ckApp);
    SV.C.CHECK_CATS.concat([...new Set(ck.map((r) => r.category))].filter((c) => !SV.C.CHECK_CATS.includes(c))).forEach((c) => { const l = ck.filter((r) => r.category === c); if (l.length) { const a = l.length - n(l, (r) => r.status === 'N/A'); m.check.byCat[c] = { total: l.length, complete: n(l, (r) => r.status === 'Complete'), applicable: a, overdue: n(l, SV.isOverdueCheck) }; } });
    const de = f('defects'), open = de.filter((r) => r.status !== 'Closed');
    m.defects = { total: de.length, open: open.length, critical: n(open, (r) => r.severity === 'Critical'), overdue: n(de, SV.isOverdueDefect), awaitingRetest: n(de, (r) => r.status === 'Awaiting retest'), awaitingClosure: n(de, (r) => r.status === 'Resolved'), closed: n(de, (r) => r.status === 'Closed'), bySeverity: {}, byStatus: {} };
    SV.C.SEVERITY.forEach((s) => (m.defects.bySeverity[s] = n(open, (r) => r.severity === s))); SV.C.DEF_STATUS.forEach((s) => (m.defects.byStatus[s] = n(de, (r) => r.status === s)));
    const ev = SV.evidenceRows(ids), req = ev.length; m.evidence = { required: req, present: n(ev, (r) => !r.missing), missing: n(ev, (r) => r.missing), pct: SV.pct(n(ev, (r) => !r.missing), req) };
    m.approvals = { outstanding: m.alarms.pendingApproval + m.tests.FAT.pendingApproval + m.tests.SAT.pendingApproval + m.defects.awaitingClosure };
    m.comms = { open: n(f('comms'), (r) => r.status === 'Open' || r.status === 'Investigating'), total: f('comms').length };
    return m;
  };

  /* evidence register rows: records with a recorded result/completion that should have evidence */
  SV.evidenceRows = (ids) => {
    const set = new Set(ids), out = [], add = (module, route, r, ref, title, status, approval) => { const photos = SV.att.count(r.id), has = !!str(r.evidence) || photos > 0; out.push({ id: r.id, module, route, projectId: r.projectId, ref, title, status, evidence: r.evidence || '', photos, approval: approval || '', missing: !has, isSample: !!r.isSample }); };
    SV.data.io.forEach((r) => { if (set.has(r.projectId) && (r.status === 'Pass' || r.status === 'Fail')) add('I/O', 'io', r, r.tag, r.description, r.status, ''); });
    SV.data.alarms.forEach((r) => { if (set.has(r.projectId) && (r.result === 'Pass' || r.result === 'Fail')) add(r.kind === 'Trip' ? 'Trip test' : 'Alarm test', 'alarms', r, r.testId + ' ' + r.tag, r.alarmDescription, r.result, r.approvalStatus); });
    SV.data.tests.forEach((r) => { if (set.has(r.projectId) && (r.status === 'Pass' || r.status === 'Fail')) add(r.type, 'fatsat', r, r.testId, r.title, r.status, r.approvalStatus); });
    SV.data.checklist.forEach((r) => { if (set.has(r.projectId) && r.status === 'Complete') add('Checklist', 'checklist', r, r.category, r.title, r.status, ''); });
    SV.data.defects.forEach((r) => { if (set.has(r.projectId) && (r.status === 'Resolved' || r.status === 'Closed')) add('Defect', 'defects', r, r.defectId, r.title, r.status, r.closureApprovedBy ? 'Approved' : 'Pending'); });
    return out;
  };

  SV.attention = (ids) => {
    const set = new Set(ids), out = [], t = (kind, text, route, pid) => out.push({ kind, text, route, projectId: pid });
    SV.data.defects.forEach((d) => { if (!set.has(d.projectId)) return; if (d.status !== 'Closed' && d.severity === 'Critical') t('crit', d.defectId + ' · ' + d.title + ' (critical, ' + d.status + ')', 'defects', d.projectId); else if (SV.isOverdueDefect(d)) t('bad', d.defectId + ' · ' + d.title + ' (overdue ' + d.dueDate + ')', 'defects', d.projectId); });
    SV.data.alarms.forEach((a) => { if (set.has(a.projectId) && a.result === 'Fail') t('bad', 'Failed ' + a.kind.toLowerCase() + ' test: ' + a.testId + ' ' + a.tag, 'alarms', a.projectId); });
    SV.data.tests.forEach((a) => { if (set.has(a.projectId) && a.status === 'Fail') t('bad', 'Failed ' + a.type + ': ' + a.testId + ' ' + a.title, 'fatsat', a.projectId); });
    SV.data.checklist.forEach((c) => { if (set.has(c.projectId) && SV.isOverdueCheck(c)) t('warn', 'Overdue checklist item: ' + c.title + ' (due ' + c.dueDate + ')', 'checklist', c.projectId); });
    return out;
  };
})();
