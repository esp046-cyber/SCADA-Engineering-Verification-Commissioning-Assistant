/* Built-in reference content (generic guidance — not project data) */
(function () {
  'use strict';
  const SV = window.SV;
  const B = (SV.builtin = {});

  B.ports = [
    ['Modbus TCP', '502/TCP'], ['OPC UA', '4840/TCP (common default; check server endpoint URL)'], ['DNP3', '20000/TCP or UDP'], ['IEC 60870-5-104', '2404/TCP'],
    ['EtherNet/IP', '44818 (explicit messaging), 2222/UDP (implicit I/O)'], ['Siemens S7 (ISO-on-TCP)', '102/TCP'], ['IEC 61850 MMS', '102/TCP'], ['BACnet/IP', '47808/UDP'], ['MQTT', '1883/TCP (8883 with TLS)']
  ];

  B.kb = () => [
    { id: 'kb-modbus-intermittent', title: 'Intermittent communication loss on Modbus TCP devices', category: 'Network', protocol: 'Modbus TCP', symptoms: 'Tags toggle between good and bad quality; periodic timeouts; communication-fail bit set intermittently.',
      causes: 'Poll rate or timeout too aggressive for the device; too many simultaneous connections to the device; duplicate IP address; switch port errors or duplex mismatch; gateway overloaded.',
      steps: '1. Confirm the device IP and unit ID against the approved network design.\n2. Check the SCADA driver diagnostics (timeouts, retries, response times) over a period of time.\n3. Check the device connection limit and how many clients are connected.\n4. Look at switch port counters (CRC errors, collisions) in read-only view.\n5. Review recent changes (new devices, firmware, configuration).\n6. Adjust poll groups or timeouts only through the approved change process, then re-test.', tags: 'timeout, quality, modbus' },
    { id: 'kb-modbus-exc02', title: 'Modbus exception 02 (illegal data address)', category: 'Protocol configuration', protocol: 'Modbus TCP', symptoms: 'Some tags read bad quality while others from the same device are good; driver reports exception code 02.',
      causes: 'Register address outside the device map; zero-based vs one-based addressing offset mismatch; wrong register type (holding vs input); block read spans an unmapped register.',
      steps: '1. Compare the tag address with the approved I/O or register map.\n2. Check the addressing base used by the driver (0-based vs 1-based) and any offset setting.\n3. Confirm register type and data type/word order.\n4. Reduce block size to isolate the failing register.\n5. Record the corrected mapping in the project documents via the change process.', tags: 'exception, address, register' },
    { id: 'kb-modbus-codes', title: 'Modbus exception codes quick reference', category: 'Reference', protocol: 'Modbus TCP', symptoms: 'Driver or device reports a numeric Modbus exception code.',
      causes: '01 illegal function; 02 illegal data address; 03 illegal data value; 04 server device failure; 05 acknowledge; 06 server busy; 0A gateway path unavailable; 0B gateway target device failed to respond.',
      steps: 'Match the code to the list in the cause field, then check the device manual for the supported function codes and register ranges. Codes 0A/0B point at the gateway or the device behind it rather than the SCADA configuration.', tags: 'reference, exception' },
    { id: 'kb-ip-conflict', title: 'Timeouts after a PLC/RTU replacement (duplicate IP address)', category: 'Network', protocol: 'Other', symptoms: 'Device unreachable or flapping after a replacement or addition; connection resets; ARP warnings on engineering stations.',
      causes: 'Old and new device share the same IP; replacement device still on factory-default address; DHCP lease collision; incorrect subnet mask or gateway.',
      steps: '1. Check the approved IP schedule for the intended address.\n2. Using an authorised, read-only method, check which MAC address currently answers for that IP (compare with device label).\n3. Confirm only one device holds the address; correct through the approved change process.\n4. Re-verify subnet mask and gateway against the design.', tags: 'ip, arp, replacement' },
    { id: 'kb-opcua', title: 'OPC UA connection fails or drops', category: 'Protocol configuration', protocol: 'OPC UA', symptoms: 'Client cannot connect; BadSecurityChecksFailed / certificate errors; session drops after a time.',
      causes: 'Server certificate not trusted by client (or vice versa); security policy/mode mismatch; wrong endpoint URL or hostname; clock difference between client and server; user identity token not accepted.',
      steps: '1. Confirm endpoint URL, security policy and mode against the design.\n2. Check certificate trust lists on both sides and certificate validity dates.\n3. Compare system clocks and time-sync status.\n4. Check server session/subscription limits and server logs.\n5. Do not store or share credentials in project notes.', tags: 'certificate, security, opcua' },
    { id: 'kb-bad-quality', title: 'Tags show stale data or bad quality but the link looks healthy', category: 'SCADA configuration', protocol: 'Other', symptoms: 'Values frozen or flagged uncertain/bad; communications status shows OK.',
      causes: 'Tag address wrong or points to unused register; scan class/poll group disabled; deadband or exception reporting hides updates; device in program/stop mode; byte/word order issue giving implausible values.',
      steps: '1. Compare the tag definition with the approved tag list (use the Tag Database Checker).\n2. Check that the tag belongs to an enabled scan group.\n3. Compare value with a local reading at the device or HMI.\n4. Check deadband/engineering-range settings and data type.', tags: 'stale, quality, scan' },
    { id: 'kb-dnp3', title: 'DNP3 outstation not responding', category: 'Protocol configuration', protocol: 'DNP3', symptoms: 'No response from outstation; integrity poll fails; events not received.',
      causes: 'Master/outstation link addresses swapped or mismatched; wrong port or transport (TCP/UDP/serial); unsolicited responses disabled or class assignment differs; time-sync required but not performed.',
      steps: '1. Verify master address, outstation address and port against the design.\n2. Verify event class assignments and unsolicited settings.\n3. Review the outstation diagnostic/log if available (read-only).\n4. Check time synchronisation status.', tags: 'dnp3, outstation, unsolicited' },
    { id: 'kb-rs485', title: 'RS-485 serial link errors (CRC, framing, no response)', category: 'Physical layer', protocol: 'Modbus RTU', symptoms: 'Sporadic or total loss of response; CRC or framing errors; works with one device only.',
      causes: 'Baud rate, parity or stop bits mismatch; A/B polarity swapped; missing or doubled termination; shield/earthing issues; duplicate slave address; excessive cable length or stubs.',
      steps: '1. Confirm serial settings and slave IDs on every device against the design.\n2. Check A/B polarity labelling and termination at both ends only.\n3. Check shield earthing at one point per the installation standard.\n4. Disconnect nothing on live systems without authorisation; isolate segments only under an approved procedure.', tags: 'serial, rs485, crc' },
    { id: 'kb-redundancy', title: 'Values not updating after SCADA server switchover', category: 'SCADA configuration', protocol: 'Other', symptoms: 'After failover the standby server shows stale or bad data; clients stay connected to the failed server.',
      causes: 'Standby driver not running or pointed at a different network; firewall rules differ between servers; PLC connection limit reached by primary; client failover configuration incomplete.',
      steps: '1. Compare driver and channel configuration on both servers.\n2. Check connection limits on the PLC/RTU.\n3. Review network paths and firewall rules from each server to each device.\n4. Verify the planned failover procedure against the approved design and repeat the test only in an authorised window.', tags: 'redundancy, failover' },
    { id: 'kb-timesync', title: 'Event timestamps inconsistent between SCADA and field devices', category: 'Time synchronisation', protocol: 'Other', symptoms: 'Sequence-of-events order looks wrong; alarm times differ between HMI and device logs; time jumps.',
      causes: 'No common time source; time zone / daylight-saving settings differ; sync service unreachable; device stamping with local vs UTC time.',
      steps: '1. Identify the time source and sync method for each device class from the design.\n2. Compare device clocks to the reference (read-only).\n3. Check time zone and UTC settings on servers and devices.\n4. Record offsets observed and raise a defect if outside the specified tolerance.', tags: 'time, sntp, sequence of events' },
    { id: 'kb-switch', title: 'Switch port, VLAN or duplex problems', category: 'Network', protocol: 'Other', symptoms: 'Packet loss on a single device; link up but no traffic; slow response only on some ports.',
      causes: 'Speed/duplex mismatch; port in wrong VLAN; spanning-tree convergence; faulty patch lead or SFP; broadcast storm.',
      steps: '1. Compare port, VLAN and speed settings with the approved network drawing (read-only).\n2. Check port error counters and link LEDs.\n3. Swap patch lead only under an authorised procedure.\n4. Record observations and escalate to the network owner.', tags: 'vlan, duplex, switch' }
  ].map((k) => Object.assign(k, { builtIn: true }));

  B.diagLists = [
    { id: 'dl-first-line', title: 'First-line communication fault checklist (read-only)', items: [
      'Confirm you are authorised to work on this system and any required permit is in place',
      'Record the affected devices, protocol, symptoms and the time the fault started',
      'Check physical link indicators and cable labelling at the affected device(s)',
      'Compare the configured IP address, subnet mask and gateway with the approved network design (read-only)',
      'Check the SCADA driver/channel status and diagnostic counters for the affected devices',
      'Check the device diagnostic page or status LEDs using the vendor tool in read-only mode',
      'Review the change log: what changed recently (firmware, configuration, network, replacements)?',
      'Confirm time synchronisation status of SCADA servers and affected devices',
      'Record all findings as observations; raise a defect if the fault is confirmed' ] },
    { id: 'dl-serial', title: 'Serial link (RS-485 / RS-232) checklist', items: [
      'Confirm baud rate, parity, data bits and stop bits match on master and all slaves',
      'Confirm each slave address is unique and matches the approved device schedule',
      'Check A/B (+/-) polarity labelling consistently along the segment',
      'Check termination is present at both physical ends only and bias per vendor guidance',
      'Check shield/earthing arrangement against the installation standard',
      'Record cable lengths and number of drops against the specified limits',
      'Record error counters (CRC/framing/timeouts) observed over a defined period' ] },
    { id: 'dl-protocol', title: 'Protocol configuration verification checklist', items: [
      'Compare protocol, port and device address/ID with the approved communications schedule',
      'Compare register/point mapping with the approved I/O or register list',
      'Check data types, scaling and word/byte order against the device documentation',
      'Check poll/scan rates, timeouts and retries against the design values',
      'Check security settings (certificates, security mode) against the design — never record credentials here',
      'Confirm redundancy / failover settings match the approved design',
      'Record the configuration revision that was checked' ] }
  ];

  B.templates = () => [
    { id: 'tpl-hmi-nav', type: 'Both', title: 'Operator HMI navigation and graphics verification', category: 'SCADA graphics', objective: 'Verify that SCADA graphics, navigation and dynamic objects match the approved graphics specification.', prerequisites: 'Approved graphics specification available; test environment connected to simulated or live data as permitted; tag verification complete for displayed tags.', expectedResult: 'All screens and dynamic objects behave as described in the approved specification.',
      steps: [['Open each screen from the navigation structure', '[Per approved specification] Each screen opens and is reachable as specified'], ['Compare displayed equipment symbols and names with the approved P&ID / equipment list', '[Per approved specification] Symbols and names agree'], ['Check dynamic objects (state colours, values, units) against the specification', '[Per approved specification] Colours, values and units agree'], ['Check faceplates and command permissions as documented', '[Per approved specification] Faceplates operate and permissions agree']] },
    { id: 'tpl-alarm-func', type: 'Both', title: 'Alarm acknowledge, silence and reset function test', category: 'Alarm and event testing', objective: 'Verify generic alarm handling functions against the approved alarm philosophy.', prerequisites: 'Approved alarm philosophy / alarm list; authorised ability to simulate or force the test condition; alarm summary and event log accessible.', expectedResult: 'Alarm handling behaves as defined in the approved alarm philosophy.',
      steps: [['Generate a test alarm per the approved procedure', '[Per approved alarm philosophy] Alarm annunciates with the specified priority'], ['Acknowledge the alarm from an authorised operator station', '[Per approved alarm philosophy] Acknowledgement behaviour as specified'], ['Return the condition to normal and verify reset behaviour', '[Per approved alarm philosophy] Reset behaviour as specified'], ['Check the event log entries for the sequence', '[Per approved specification] Events logged with correct time and text']] },
    { id: 'tpl-comm-loss', type: 'Both', title: 'Communication loss handling verification', category: 'Communication verification', objective: 'Verify how loss of communication to a device is annunciated and displayed.', prerequisites: 'Approved communication-failure requirements; authorisation and procedure to safely create the comm-loss condition (e.g. in a test setup); no interference with live process.', expectedResult: 'Communication loss is detected, annunciated and displayed as specified, and recovery is automatic or manual as specified.',
      steps: [['Create the communication loss condition under the approved procedure', '[Per approved specification] Loss is detected within the specified time'], ['Observe quality indication and alarm', '[Per approved specification] Quality and alarm as specified'], ['Restore communication', '[Per approved specification] Recovery behaviour as specified']] },
    { id: 'tpl-redundancy', type: 'Both', title: 'SCADA server redundancy failover test', category: 'Functional testing', objective: 'Verify failover and failback between redundant SCADA servers as per the approved design.', prerequisites: 'Approved redundancy design and failover requirements; approved outage window and permit; backups taken.', expectedResult: 'Failover and failback occur as specified without loss of required data or functions.',
      steps: [['Record the initial state of both servers', '[Per approved design] Initial state as documented'], ['Initiate failover using the approved method', '[Per approved design] Standby assumes control within the specified time'], ['Verify clients, alarms and data after failover', '[Per approved design] No loss beyond the specified allowance'], ['Perform failback using the approved method', '[Per approved design] Failback as specified']] },
    { id: 'tpl-historian', type: 'Both', title: 'Historian and trend verification', category: 'Functional testing', objective: 'Verify configured historian tags, sample rates and trend displays against the approved specification.', prerequisites: 'Approved historian/trending requirements; tags available with live or simulated data.', expectedResult: 'Selected tags are archived and displayed according to the specification.',
      steps: [['Compare the historian tag list with the approved list', '[Per approved specification] Lists agree'], ['Verify sample/compression settings for selected tags', '[Per approved specification] Settings agree'], ['Display trends over a recorded period and compare with source values', '[Per approved specification] Trend values agree within the specified tolerance']] },
    { id: 'tpl-access', type: 'Both', title: 'User roles and access rights verification', category: 'Functional testing', objective: 'Verify that user roles and permissions match the approved security matrix.', prerequisites: 'Approved security/role matrix; test accounts issued by the system owner. Do not record passwords in this application.', expectedResult: 'Each role can perform only the actions permitted by the approved matrix.',
      steps: [['For each role, verify permitted actions can be performed', '[Per approved security matrix] Permitted actions succeed'], ['For each role, verify restricted actions are refused', '[Per approved security matrix] Restricted actions are refused'], ['Verify audit/event log records the user actions', '[Per approved specification] Actions are logged']] },
    { id: 'tpl-backup', type: 'SAT', title: 'Backup and restore verification', category: 'Startup readiness', objective: 'Verify that SCADA configuration backups can be created and restored per the approved procedure.', prerequisites: 'Approved backup/restore procedure; non-production target or approved window.', expectedResult: 'Backup completes and the restored configuration matches the original.',
      steps: [['Create a backup using the approved procedure', '[Per approved procedure] Backup completes without error'], ['Restore to the designated target', '[Per approved procedure] Restore completes without error'], ['Compare restored configuration with the original', '[Per approved procedure] Configurations agree']] }
  ].map((t) => ({ id: t.id, builtIn: true, type: t.type, title: t.title, category: t.category, objective: t.objective, prerequisites: t.prerequisites, expectedResult: t.expectedResult, steps: t.steps.map((s) => ({ text: s[0], expected: s[1] })) }));

  /* generic starter items — tasks only, no invented values */
  B.checklistStarter = {
    'Design and document verification': ['Confirm approved design documents and revisions are available', 'Compare as-built drawings with approved design', 'Confirm approved I/O list, alarm list and cause-and-effect revisions'],
    'Hardware installation and inspection': ['Inspect panels and field devices for installation per design', 'Verify labelling of devices, cables and terminals', 'Confirm hardware inventory against the approved bill of materials'],
    'Power and grounding checks': ['Verify power supplies and protection devices per design', 'Verify earthing and shielding arrangements per installation standard', 'Record insulation/continuity test evidence where required'],
    'I/O checks and loop checks': ['Complete digital I/O point-to-point checks', 'Complete analog loop checks including scaling', 'Resolve and retest I/O failures'],
    'SCADA graphics and tag verification': ['Run tag database comparison against the approved tag list', 'Verify graphics against the approved graphics specification', 'Verify engineering units and ranges on displays'],
    'Alarm and event testing': ['Complete alarm tests per the approved alarm list', 'Complete trip/interlock tests per approved cause-and-effect with authorisation', 'Verify event logging and acknowledgement behaviour'],
    'Communication verification': ['Verify communication to every PLC/RTU/gateway per the design', 'Verify redundancy and failover behaviour per the design', 'Verify time synchronisation'],
    'Functional testing': ['Execute approved functional test procedures', 'Verify historian, trends and reports', 'Verify user roles and access rights per the security matrix'],
    'Startup readiness': ['Confirm all critical defects are closed or formally accepted by the authorised person', 'Confirm backups of final configuration exist', 'Confirm startup readiness review is completed by the authorised person'],
    'Training and handover preparation': ['Prepare operator and maintenance training material', 'Compile as-built documentation and test evidence package', 'Prepare outstanding items list for handover']
  };
})();
