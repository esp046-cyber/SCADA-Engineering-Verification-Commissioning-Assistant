/* Demonstration data for a FICTIONAL plant. Every record is flagged isSample:true. */
(function () {
  'use strict';
  const SV = window.SV;
  const S = (SV.sample = {});
  const D = (n) => SV.addDays(n);

  S.build = () => {
    const out = {}; SV.PROJECT_STORES.concat(['projects']).forEach((s) => (out[s] = []));
    let seq = 0; const mk = (store, pid, o) => { const r = Object.assign({ id: 'smp-' + store + '-' + ++seq, projectId: pid, isSample: true }, o); out[store].push(r); return r; };
    const P1 = 'smp-proj-1', P2 = 'smp-proj-2';
    out.projects.push(
      { id: P1, code: 'SAMPLE-RWTP-001', name: '[SAMPLE] Riverbend Water Treatment Plant — SCADA Upgrade', customer: 'Riverbend Municipal Water (fictional)', facility: 'Riverbend WTP, Building A control room', description: 'FICTIONAL demonstration project. Raw water intake, coagulant dosing, filtration, clearwell and booster pumping controlled by two PLCs and a redundant SCADA server pair. All data is invented for demonstration.', revision: 'Rev B', startDate: D(-60), endDate: D(45), favorite: true, isSample: true },
      { id: P2, code: 'SAMPLE-HPS-002', name: '[SAMPLE] Hilltop Pumping Station — RTU Integration', customer: 'Riverbend Municipal Water (fictional)', facility: 'Hilltop pumping station', description: 'FICTIONAL demonstration project: integration of a new RTU into the existing SCADA.', revision: 'Rev A', startDate: D(-20), endDate: D(70), favorite: false, isSample: true });

    const E1 = 'A. Mendoza', E2 = 'R. Okafor';
    const dig = (tag, desc, eq, type, exp, act, status, x) => mk('io', P1, Object.assign({ tag, description: desc, equipment: eq, type, units: '', rangeLow: null, rangeHigh: null, rawLow: null, rawHigh: null, rawUnits: '', scadaLow: null, scadaHigh: null, tolerance: null, expected: exp, actual: act, status, testDate: status === 'Pass' || status === 'Fail' ? D(-8) : '', engineer: status === 'Pass' || status === 'Fail' ? E1 : '', comments: '', evidence: '' }, x || {}));
    const ana = (tag, desc, eq, type, units, lo, hi, exp, act, status, x) => mk('io', P1, Object.assign({ tag, description: desc, equipment: eq, type, units, rangeLow: lo, rangeHigh: hi, rawLow: 4, rawHigh: 20, rawUnits: 'mA', scadaLow: lo, scadaHigh: hi, tolerance: 0.5, expected: String(exp), actual: act === '' ? '' : String(act), status, testDate: status === 'Pass' || status === 'Fail' ? D(-6) : '', engineer: status === 'Pass' || status === 'Fail' ? E2 : '', comments: '', evidence: '' }, x || {}));
    dig('P101_RUN', 'Raw water pump P-101 running status', 'P-101', 'DI', 'Running', 'Running', 'Pass', { evidence: 'LC-RWTP-001' });
    dig('P101_FLT', 'Raw water pump P-101 motor fault', 'P-101', 'DI', 'Healthy', 'Healthy', 'Pass', { evidence: 'LC-RWTP-002' });
    dig('P101_CMD', 'Raw water pump P-101 start command', 'P-101', 'DO', 'Start', 'Start', 'Pass', { evidence: 'LC-RWTP-003' });
    dig('P102_RUN', 'Raw water pump P-102 running status', 'P-102', 'DI', 'Running', 'Running', 'Pass', { evidence: 'LC-RWTP-004' });
    dig('P102_RUN', 'P-102 running status (second entry — duplicate tag in I/O list)', 'P-102', 'DI', 'Running', '', 'Not tested');
    dig('P102_CMD', 'Raw water pump P-102 start command', 'P-102', 'DO', 'Start', 'Stopped', 'Fail', { comments: 'Output did not energise the MCC contactor during test.', evidence: 'PHOTO-RWTP-014' });
    dig('DP201_RUN', 'Coagulant dosing pump DP-201 running status', 'DP-201', 'DI', 'Running', 'Running', 'Pass', { evidence: 'LC-RWTP-006' });
    dig('XV301_OPN', 'Filter 1 inlet valve open limit', 'XV-301', 'DI', 'Open', 'Open', 'Pass');
    dig('XV301_CLS', 'Filter 1 inlet valve closed limit', 'XV-301', 'DI', 'Closed', '', 'Not tested');
    dig('XV301_CMD', 'Filter 1 inlet valve open command', 'XV-301', 'DO', 'Open', '', 'Not tested');
    dig('F302_HLEV', 'Filter 2 high level switch', 'F-302', 'DI', '', '', 'N/A', { comments: 'Instrument removed from scope by sample change note DCN-07.' });
    dig('B601_RUN', 'Backwash blower B-601 running status', 'B-601', 'DI', 'Running', '', 'Not tested');
    dig('ESD_PB', 'Emergency stop pushbutton status (monitoring only)', 'ES-001', 'DI', 'Healthy', 'Healthy', 'Pass', { evidence: 'LC-RWTP-010' });
    ana('LT401_PV', 'Clearwell level', 'LT-401', 'AI', 'm', 0, 6, 3, 3.01, 'Pass', { evidence: 'LC-RWTP-011' });
    ana('FT201_PV', 'Coagulant dosing flow', 'FT-201', 'AI', 'L/h', 0, 200, 100, 100.4, 'Pass', { evidence: 'LC-RWTP-012' });
    ana('AIT501_PV', 'Free chlorine residual', 'AIT-501', 'AI', 'mg/L', 0, 5, 2.5, 5, 'Fail', { scadaLow: 0, scadaHigh: 10, comments: 'SCADA scaled 0–10 whereas approved range is 0–5.', evidence: 'PHOTO-RWTP-021' });
    ana('PT701_PV', 'Booster header pressure', 'PT-701', 'AI', 'bar', 0, 10, 5, 5.02, 'Pass', { evidence: 'LC-RWTP-014' });
    ana('TT601_PV', 'Blower discharge temperature', 'TT-601', 'AI', '°C', 100, 0, 50, '', 'Not tested', { comments: 'Range entered with low ≥ high in the I/O list — needs correction.' });
    ana('FT101_PV', 'Raw water flow', 'FT-101', 'AI', 'm³/h', 0, 500, 250, '', 'Not tested');
    ana('LT402_PV', 'Backwash tank level', 'LT-402', 'AI', 'm', 0, 4, 2, 2.5, 'Pass', { tolerance: 1, evidence: 'LC-RWTP-016', comments: 'Recorded as Pass although deviation exceeds tolerance — flagged for review.' });
    ana('FCV301_SP', 'Backwash flow control valve setpoint', 'FCV-301', 'AO', '%', 0, 100, 50, 50, 'Pass', { evidence: 'LC-RWTP-017' });
    ana('SP701_CMD', 'Booster speed reference', 'P-701', 'AO', '%', 0, 100, 75, 74.8, 'Pass', { evidence: 'LC-RWTP-018' });
    [['HPS_LT01', 'Wet well level', 'LT-H01', 'AI', 'm', 0, 8, 4, 4, 'Pass'], ['HPS_PT01', 'Discharge pressure', 'PT-H01', 'AI', 'bar', 0, 16, 8, '', 'Not tested']].forEach((a) => mk('io', P2, { tag: a[0], description: a[1], equipment: a[2], type: a[3], units: a[4], rangeLow: a[5], rangeHigh: a[6], rawLow: 4, rawHigh: 20, rawUnits: 'mA', scadaLow: a[5], scadaHigh: a[6], tolerance: 0.5, expected: String(a[7]), actual: a[8] === '' ? '' : String(a[8]), status: a[9], testDate: a[9] === 'Pass' ? D(-3) : '', engineer: a[9] === 'Pass' ? E2 : '', comments: '', evidence: a[9] === 'Pass' ? 'LC-HPS-001' : '' }));
    mk('io', P2, { tag: 'HPS_P01_RUN', description: 'Pump P-H01 running status', equipment: 'P-H01', type: 'DI', units: '', rangeLow: null, rangeHigh: null, rawLow: null, rawHigh: null, rawUnits: '', scadaLow: null, scadaHigh: null, tolerance: null, expected: 'Running', actual: 'Running', status: 'Pass', testDate: D(-3), engineer: E2, comments: '', evidence: 'LC-HPS-002' });

    /* tag lists (approved vs SCADA export) */
    const seen = new Set(), approved = [];
    out.io.filter((r) => r.projectId === P1).forEach((r) => { if (seen.has(r.tag)) return; seen.add(r.tag); const an = r.type === 'AI' || r.type === 'AO'; approved.push({ tag: r.tag, description: r.description, dataType: an ? 'REAL' : 'BOOL', units: r.units, rangeLow: an ? (r.tag === 'TT601_PV' ? 0 : r.rangeLow) : null, rangeHigh: an ? (r.tag === 'TT601_PV' ? 100 : r.rangeHigh) : null }); });
    approved.push({ tag: 'LT401_LL', description: 'Clearwell level low-low', dataType: 'BOOL', units: '', rangeLow: null, rangeHigh: null }, { tag: 'LT401_HI', description: 'Clearwell level high', dataType: 'BOOL', units: '', rangeLow: null, rangeHigh: null });
    approved.forEach((a) => mk('tagsApproved', P1, Object.assign({ source: 'sample-approved-tags.csv' }, a)));
    approved.forEach((a) => {
      if (a.tag === 'XV301_CLS' || a.tag === 'F302_HLEV') return;
      const e = Object.assign({ source: 'sample-scada-export.csv' }, a);
      if (a.tag === 'FT101_PV') e.description = 'Raw water flowrate';
      if (a.tag === 'DP201_RUN') e.dataType = 'INT16';
      if (a.tag === 'LT401_PV') e.rangeHigh = 5.5;
      if (a.tag === 'AIT501_PV') { e.rangeHigh = 10; e.units = 'ppm'; }
      if (a.tag === 'P102_CMD') e.tag = 'p102_cmd';
      if (a.tag === 'PT701_PV') e.description = '  booster header  PRESSURE ';
      mk('tagsExport', P1, e);
      if (a.tag === 'P101_FLT') mk('tagsExport', P1, Object.assign({}, e));
    });
    mk('tagsExport', P1, { tag: 'TEST_TAG_01', description: 'Leftover engineering test tag', dataType: 'REAL', units: '', rangeLow: 0, rangeHigh: 100, source: 'sample-scada-export.csv' });
    mk('tagsExport', P1, { tag: 'SYS_HEARTBEAT', description: 'System heartbeat', dataType: 'BOOL', units: '', rangeLow: null, rangeHigh: null, source: 'sample-scada-export.csv' });

    /* alarms & trips */
    const steps = (kind, res) => SV.alarm.defaultSteps(kind).map((s, i) => Object.assign(s, { result: res[i] || res[res.length - 1] }));
    const alarm = (testId, kind, tag, desc, ref, limit, units, prio, ack, reset, trip, o) => mk('alarms', P1, Object.assign({ testId, kind, tag, alarmDescription: desc, requirementRef: ref, configuredLimit: limit, limitUnits: units, expectedPriority: prio, ackBehavior: ack, resetBehavior: reset, expectedTripResponse: trip, steps: steps(kind, ['Pending']), observedPriority: '', observedAck: '', observedReset: '', observedTripResponse: '', observedResult: '', result: 'Not tested', testDate: '', engineer: '', evidence: '', approvalStatus: 'Pending', approvedBy: '', approvedRole: '', approvedAt: '', approvalComment: '' }, o));
    const ACK = 'Latched — operator acknowledgement required', RST = 'Clears after return to normal and acknowledgement';
    alarm('ALM-001', 'Alarm', 'LT401_LO', 'Clearwell level low', 'SAMPLE FDS-RWTP §5.2.1', '1.2', 'm', 'High', ACK, RST, '', { steps: steps('Alarm', ['Pass']), observedPriority: 'High', observedAck: ACK, observedReset: RST, observedResult: 'Alarm annunciated at 1.2 m with priority High; acknowledge and reset as expected (sample).', result: 'Pass', testDate: D(-9), engineer: E1, evidence: 'TR-ALM-001', approvalStatus: 'Approved', approvedBy: 'S. Whitfield', approvedRole: 'Commissioning lead (sample)', approvedAt: SV.nowISO(), approvalComment: 'Reviewed evidence (sample).' });
    alarm('ALM-002', 'Alarm', 'LT401_HI', 'Clearwell level high', 'SAMPLE FDS-RWTP §5.2.2', '5.2', 'm', 'High', ACK, RST, '', { steps: steps('Alarm', ['Pass']), observedPriority: 'High', observedAck: ACK, observedReset: RST, observedResult: 'Alarm annunciated at 5.2 m as specified (sample).', result: 'Pass', testDate: D(-9), engineer: E1, evidence: 'TR-ALM-002' });
    alarm('ALM-003', 'Alarm', 'AIT501_LO', 'Free chlorine low', 'SAMPLE FDS-RWTP §5.4.3', '0.8', 'mg/L', 'Medium', ACK, RST, '', { steps: steps('Alarm', ['Pass', 'Pass', 'Pass', 'Fail', 'Pending']), observedPriority: 'Low', observedAck: ACK, observedReset: RST, observedResult: 'Alarm annunciated but with priority Low instead of Medium (sample).', result: 'Fail', testDate: D(-7), engineer: E2, evidence: 'TR-ALM-003' });
    alarm('ALM-004', 'Alarm', 'PT701_LO', 'Booster header pressure low', 'SAMPLE FDS-RWTP §6.1.1', '2.0', 'bar', 'High', ACK, RST, '', {});
    alarm('ALM-005', 'Alarm', 'P101_FLT', 'Raw water pump P-101 motor fault', '', '', '', 'Medium', ACK, RST, '', {});
    alarm('ALM-006', 'Alarm', 'FT201_LO', 'Coagulant flow low', 'SAMPLE FDS-RWTP §5.3.2', '20', 'L/h', 'Medium', ACK, RST, '', { steps: steps('Alarm', ['Pass']), observedPriority: 'Medium', observedAck: ACK, observedReset: RST, observedResult: 'Alarm annunciated as specified (sample); evidence not yet filed.', result: 'Pass', testDate: D(-5), engineer: E2 });
    alarm('TRP-001', 'Trip', 'LT401_LL', 'Clearwell level low-low — booster pump trip', 'SAMPLE C&E-RWTP Rev B row 12', '0.6', 'm', 'Critical', 'Latched — operator acknowledgement required', 'Manual reset required after level restored', 'Booster pumps P-701 and P-702 stop; trip alarm annunciated; manual reset required before restart.', { steps: steps('Trip', ['Pending']) });
    alarm('TRP-002', 'Trip', 'TT601_HH', 'Blower discharge temperature high-high — blower trip', '', '', '', 'Critical', '', '', '', { steps: steps('Trip', ['Pending']), result: 'Blocked', observedResult: 'Not started: approved cause-and-effect row not available (sample).' });
    [['ALM-101', 'Wet well level high', 'HPS_LT01_HI', 'SAMPLE HPS-FDS §3.1', '6.5', 'm', 'Pass'], ['ALM-102', 'Discharge pressure high', 'HPS_PT01_HI', 'SAMPLE HPS-FDS §3.2', '14', 'bar', 'Not tested']].forEach((a) => mk('alarms', P2, { testId: a[0], kind: 'Alarm', tag: a[2], alarmDescription: a[1], requirementRef: a[3], configuredLimit: a[4], limitUnits: a[5], expectedPriority: 'High', ackBehavior: ACK, resetBehavior: RST, expectedTripResponse: '', steps: steps('Alarm', a[6] === 'Pass' ? ['Pass'] : ['Pending']), observedPriority: a[6] === 'Pass' ? 'High' : '', observedAck: a[6] === 'Pass' ? ACK : '', observedReset: a[6] === 'Pass' ? RST : '', observedTripResponse: '', observedResult: a[6] === 'Pass' ? 'As specified (sample).' : '', result: a[6], testDate: a[6] === 'Pass' ? D(-2) : '', engineer: a[6] === 'Pass' ? E2 : '', evidence: a[6] === 'Pass' ? 'TR-HPS-001' : '', approvalStatus: 'Pending', approvedBy: '', approvedRole: '', approvedAt: '', approvalComment: '' }));

    /* communications (manual observations only — no sample is presented as automatically collected) */
    const comm = (pid, o) => mk('comms', pid, Object.assign({ source: SV.C.SRC_MANUAL, reportedBy: E2, port: '', resolvedAt: '', errorMessages: '', suspectedCause: '', troubleshootingSteps: '', resolution: '' }, o));
    comm(P1, { deviceName: 'PLC-100 (intake & dosing)', deviceType: 'PLC', ip: '10.20.1.10', protocol: 'Modbus TCP', port: 502, symptoms: 'Intermittent bad quality on intake and dosing tags every few minutes.', occurredAt: SV.addDays(-3) + 'T09:40', errorMessages: 'Driver: response timeout (sample entry)', suspectedCause: 'Poll rate high relative to PLC response time', troubleshootingSteps: 'Reviewed driver diagnostics over 30 min; counted timeouts per poll group. Not yet changed any setting.', status: 'Investigating' });
    comm(P1, { deviceName: 'PLC-200 (filtration)', deviceType: 'PLC', ip: '10.20.1.20', protocol: 'Modbus TCP', port: 502, symptoms: 'Device unreachable after card replacement.', occurredAt: SV.addDays(-10) + 'T14:05', resolvedAt: SV.addDays(-10) + 'T15:20', errorMessages: 'Connection refused (sample entry)', suspectedCause: 'Replacement CPU still on default IP address', troubleshootingSteps: 'Compared device address with approved IP schedule; confirmed a different address was configured.', resolution: 'IP corrected through the approved change process; verified communication restored.', status: 'Resolved' });
    comm(P1, { deviceName: 'SCADA-SRV02 (standby)', deviceType: 'SCADA server', ip: '10.20.0.12', protocol: 'OPC UA', port: 4840, symptoms: 'Standby server shows bad quality after switchover test.', occurredAt: SV.addDays(-6) + 'T11:15', errorMessages: 'BadCertificateUntrusted (sample entry)', suspectedCause: 'Server certificate not in client trust list on standby', troubleshootingSteps: 'Checked trust list on both servers (read-only).', status: 'Open' });
    comm(P1, { deviceName: 'GW-01 (serial gateway)', deviceType: 'Gateway / protocol converter', ip: '10.20.1.50', protocol: 'Modbus RTU', symptoms: 'Analyser AIT-501 responds sporadically through gateway.', occurredAt: SV.addDays(-14) + 'T08:30', resolvedAt: SV.addDays(-13) + 'T10:00', errorMessages: 'CRC errors (sample entry)', suspectedCause: 'A/B polarity inconsistent at junction box', troubleshootingSteps: 'Followed serial link checklist.', resolution: 'Polarity labelling corrected under work permit; counters stable for 24 h.', status: 'Closed' });
    comm(P2, { deviceName: 'RTU-H01', deviceType: 'RTU', ip: '10.30.0.5', protocol: 'DNP3', port: 20000, symptoms: 'No integrity poll response from new RTU.', occurredAt: SV.addDays(-2) + 'T13:00', errorMessages: 'Outstation timeout (sample entry)', suspectedCause: 'Link address mismatch', troubleshootingSteps: 'Compared master and outstation addresses with design.', status: 'Open' });

    /* FAT / SAT */
    const tpl = SV.builtin.templates(), T = (id) => tpl.find((t) => t.id === id);
    const test = (pid, testId, type, plan, tplId, o, stepRes) => { const t = T(tplId); const st = t.steps.map((s, i) => ({ text: s.text, expected: s.expected, actual: stepRes[i] === 'Pass' ? 'As expected (sample).' : stepRes[i] === 'Fail' ? 'Did not meet expected result (sample).' : '', result: stepRes[i] || 'Pending' })); return mk('tests', pid, Object.assign({ testId, type, plan, title: t.title, objective: t.objective, prerequisites: t.prerequisites, requirementRef: 'SAMPLE FDS-RWTP §7', steps: st, expectedResult: t.expectedResult, actualResult: '', status: 'Not run', evidence: '', engineer: '', witness: '', date: '', approvalStatus: 'Pending', approvedBy: '', approvedRole: '', approvedAt: '', approvalComment: '', fromTemplateId: tplId }, o)); };
    test(P1, 'FAT-001', 'FAT', 'FAT Plan Rev A', 'tpl-hmi-nav', { status: 'Pass', actualResult: 'All screens opened and agreed with the specification (sample).', evidence: 'FAT-REP-001', engineer: E1, witness: 'J. Park (customer, sample)', date: D(-25), approvalStatus: 'Approved', approvedBy: 'J. Park', approvedRole: 'Customer representative (sample)', approvedAt: SV.nowISO(), approvalComment: 'Witnessed (sample).' }, ['Pass', 'Pass', 'Pass', 'Pass']);
    test(P1, 'FAT-002', 'FAT', 'FAT Plan Rev A', 'tpl-alarm-func', { status: 'Pass', actualResult: 'Alarm functions as specified (sample).', engineer: E1, witness: 'J. Park (customer, sample)', date: D(-24) }, ['Pass', 'Pass', 'Pass', 'Pass']);
    test(P1, 'FAT-003', 'FAT', 'FAT Plan Rev A', 'tpl-comm-loss', { status: 'Fail', actualResult: 'Quality did not change to bad within the specified time (sample).', evidence: 'FAT-REP-003', engineer: E2, witness: 'J. Park (customer, sample)', date: D(-23) }, ['Pass', 'Fail', 'Pending']);
    test(P1, 'FAT-004', 'FAT', 'FAT Plan Rev A', 'tpl-redundancy', {}, []);
    test(P1, 'SAT-001', 'SAT', 'SAT Plan Rev A', 'tpl-hmi-nav', { status: 'In progress', engineer: E1, date: D(-2) }, ['Pass', 'Pass']);
    test(P1, 'SAT-002', 'SAT', 'SAT Plan Rev A', 'tpl-backup', {}, []);
    test(P1, 'SAT-003', 'SAT', 'SAT Plan Rev A', 'tpl-access', { status: 'Blocked', actualResult: 'Waiting for test accounts to be issued by the system owner (sample).' }, []);
    test(P2, 'FAT-101', 'FAT', 'HPS FAT Plan Rev A', 'tpl-comm-loss', { requirementRef: 'SAMPLE HPS-FDS §5' }, []);

    /* checklist */
    const assignees = ['A. Mendoza', 'R. Okafor', 'L. Fischer', 'S. Whitfield'];
    let n = 0;
    SV.C.CHECK_CATS.forEach((cat, ci) => {
      (SV.builtin.checklistStarter[cat] || []).forEach((title, ti) => {
        const pat = (ci + ti) % 5, status = ci < 3 ? (pat === 4 ? 'In progress' : 'Complete') : ci < 6 ? ['Complete', 'In progress', 'Open', 'Blocked', 'Open'][pat] : 'Open';
        mk('checklist', P1, { category: cat, title, assignee: assignees[n++ % 4], dueDate: D(ci < 5 ? -12 + ci * 6 + ti : 10 + ci * 4 + ti * 2), status, comments: status === 'Blocked' ? 'Waiting for approved revision (sample).' : '', evidence: status === 'Complete' && (ci + ti) % 2 === 0 ? 'DOC-RWTP-' + (100 + n) : '', completedBy: status === 'Complete' ? assignees[n % 4] : '', completedAt: status === 'Complete' ? D(-14 + ci) : '' });
      });
    });
    [['Design and document verification', 'Confirm approved RTU integration documents', 'Complete'], ['I/O checks and loop checks', 'Complete RTU I/O checks', 'In progress'], ['Communication verification', 'Verify DNP3 link to SCADA', 'Open'], ['Startup readiness', 'Startup readiness review by authorised person', 'Open']].forEach((c, i) => mk('checklist', P2, { category: c[0], title: c[1], assignee: assignees[i], dueDate: D(-3 + i * 12), status: c[2], comments: '', evidence: c[2] === 'Complete' ? 'DOC-HPS-001' : '', completedBy: c[2] === 'Complete' ? assignees[i] : '', completedAt: c[2] === 'Complete' ? D(-6) : '' }));

    /* defects */
    const def = (pid, id, title, sev, cat, st, o) => mk('defects', pid, Object.assign({ defectId: id, title, description: '', equipment: '', severity: sev, category: cat, assignee: E2, status: st, reportedDate: D(-10), dueDate: D(7), rootCause: '', correctiveAction: '', retestResult: 'Not retested', retestDate: '', closureApprovedBy: '', closureApprovedRole: '', closureApprovedAt: '', evidence: '' }, o));
    def(P1, 'DEF-001', 'P-102 start command output not energising MCC contactor', 'Critical', 'I/O / wiring', 'In progress', { equipment: 'P102_CMD', description: 'During point-to-point test the DO did not energise the contactor interposing relay.', reportedDate: D(-12), dueDate: D(-2), evidence: 'PHOTO-RWTP-014' });
    def(P1, 'DEF-002', 'AIT501_PV scaling in SCADA does not match approved range', 'Major', 'Software / configuration', 'Awaiting retest', { equipment: 'AIT501_PV', description: 'SCADA scaled 0–10 mg/L; approved range 0–5 mg/L.', rootCause: 'Wrong range entered in tag configuration (sample).', correctiveAction: 'Range corrected to approved value (sample).', reportedDate: D(-9), dueDate: D(3) });
    def(P1, 'DEF-003', 'Typographic error in Filter 2 HMI screen title', 'Minor', 'SCADA graphics', 'Closed', { equipment: 'Filter 2 graphic', rootCause: 'Typing error (sample).', correctiveAction: 'Corrected title (sample).', retestResult: 'Pass', retestDate: D(-4), closureApprovedBy: 'S. Whitfield', closureApprovedRole: 'Commissioning lead (sample)', closureApprovedAt: SV.nowISO(), reportedDate: D(-15), dueDate: D(-8), evidence: 'FAT-REP-001' });
    def(P1, 'DEF-004', 'Alarm priority for AIT501_LO differs from approved alarm list', 'Major', 'Alarm / trip logic', 'Open', { equipment: 'AIT501_LO', description: 'Observed priority Low; approved priority Medium (see ALM-003).', reportedDate: D(-7), dueDate: D(7) });
    def(P1, 'DEF-005', 'Cable label missing on junction box JB-12', 'Observation', 'Hardware', 'Open', { equipment: 'JB-12', reportedDate: D(-5), dueDate: D(14), assignee: 'L. Fischer' });
    def(P1, 'DEF-006', 'FT101_PV description differs between approved list and SCADA', 'Minor', 'Documentation', 'Resolved', { equipment: 'FT101_PV', rootCause: 'Description edited locally (sample).', correctiveAction: 'Description aligned with approved list (sample).', retestResult: 'Pass', retestDate: D(-1), reportedDate: D(-8), dueDate: D(2) });
    def(P1, 'DEF-007', 'Approved cause-and-effect row for blower trip TRP-002 not available', 'Critical', 'Documentation', 'Open', { equipment: 'TT601_HH', description: 'Trip cannot be tested without the approved requirement. Do not assume a setting.', reportedDate: D(-11), dueDate: D(-5), assignee: 'S. Whitfield' });
    def(P1, 'DEF-008', 'Communication timeouts to PLC-100', 'Major', 'Communications', 'In progress', { equipment: 'PLC-100', reportedDate: D(-3), dueDate: D(5) });
    def(P2, 'DEF-001', 'RTU-H01 not responding to integrity poll', 'Major', 'Communications', 'Open', { equipment: 'RTU-H01', reportedDate: D(-2), dueDate: D(5) });
    def(P2, 'DEF-002', 'Wet well level scaling needs verification against approved range', 'Minor', 'Documentation', 'In progress', { equipment: 'HPS_LT01', reportedDate: D(-1), dueDate: D(9) });
    return out;
  };

  S.seed = async () => {
    const d = S.build(), now = SV.nowISO();
    for (const s of Object.keys(d)) {
      d[s].forEach((r) => { r.createdAt = now; r.updatedAt = now; });
      await SV.db.putMany(s, d[s]);
      SV.data[s] = SV.data[s].filter((r) => !r.isSample).concat(d[s]);
    }
    await SV.logEvent({ store: 'projects', recordId: '', projectId: '', label: 'Sample data', action: 'import', changes: [], note: 'Fictional demonstration data loaded', isSample: false });
    /* illustrative status-change history for a closed sample defect */
    const def = d.defects.find((x) => x.defectId === 'DEF-003' && x.projectId === 'smp-proj-1');
    const base = Date.now();
    for (const [i, c] of [['create', []], ['update', [{ f: 'status', from: 'Open', to: 'In progress' }]], ['update', [{ f: 'status', from: 'In progress', to: 'Resolved' }]], ['update', [{ f: 'status', from: 'Resolved', to: 'Closed' }]]].map((c, i) => [i, c[1]].concat(c[0]))) {
      const act = ['create', 'update', 'update', 'update'][i], ch = [[], [{ f: 'status', from: 'Open', to: 'In progress' }], [{ f: 'status', from: 'In progress', to: 'Resolved' }], [{ f: 'status', from: 'Resolved', to: 'Closed' }]][i];
      await SV.logEvent({ ts: new Date(base - (12 - i * 3) * 86400000).toISOString(), store: 'defects', recordId: def.id, projectId: def.projectId, label: 'DEF-003 ' + def.title, action: act, changes: ch, note: 'Sample history', isSample: true, user: 'A. Mendoza (sample)' });
    }
  };
  S.count = () => SV.PROJECT_STORES.concat(['projects']).reduce((a, s) => a + SV.data[s].filter((r) => r.isSample).length, 0);
  S.remove = async () => {
    for (const s of SV.PROJECT_STORES.concat(['projects'])) {
      const gone = SV.data[s].filter((r) => r.isSample); if (!gone.length) continue;
      await SV.db.delMany(s, gone.map((g) => g.id)); SV.data[s] = SV.data[s].filter((r) => !r.isSample);
      for (const g of gone) await SV.att.removeOwner(g.id);
    }
    const hs = SV.data.history.filter((x) => x.isSample); if (hs.length) { await SV.db.delMany('history', hs.map((x) => x.id)); SV.data.history = SV.data.history.filter((x) => !x.isSample); }
    if (SV.prefs.scope && !SV.byId('projects', SV.prefs.scope)) await SV.setPref('scope', 'all');
    await SV.logEvent({ store: 'projects', recordId: '', projectId: '', label: 'Sample data', action: 'delete', changes: [], note: 'Demonstration data removed' });
  };
  /* built-in reference content */
  S.seedBuiltIn = async (force) => {
    const kb = SV.builtin.kb(), tp = SV.builtin.templates();
    if (force) { SV.data.kb = SV.data.kb.filter((k) => !k.builtIn); SV.data.templates = SV.data.templates.filter((t) => !t.builtIn); }
    const haveK = new Set(SV.data.kb.map((k) => k.id)), haveT = new Set(SV.data.templates.map((k) => k.id)), now = SV.nowISO();
    const nk = kb.filter((k) => !haveK.has(k.id)).map((k) => Object.assign(k, { createdAt: now, updatedAt: now })), nt = tp.filter((k) => !haveT.has(k.id)).map((k) => Object.assign(k, { createdAt: now, updatedAt: now }));
    if (nk.length) { await SV.db.putMany('kb', nk); SV.data.kb = SV.data.kb.concat(nk); }
    if (nt.length) { await SV.db.putMany('templates', nt); SV.data.templates = SV.data.templates.concat(nt); }
  };
})();
