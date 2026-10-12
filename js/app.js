/* Application shell: routing, navigation, global search, settings, service worker */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h;
  SV.views = SV.views || {};
  const ROUTES = [
    { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', group: 'Overview' },
    { id: 'projects', title: 'Projects', icon: 'project' },
    { id: 'io', title: 'I/O Verification', icon: 'io', group: 'Verification' },
    { id: 'tags', title: 'Tag Database Checker', icon: 'tags' },
    { id: 'alarms', title: 'Alarm & Trip Tests', icon: 'alarm' },
    { id: 'comms', title: 'Communication Diagnostics', icon: 'comms' },
    { id: 'fatsat', title: 'FAT / SAT Tests', icon: 'fat', group: 'Acceptance' },
    { id: 'checklist', title: 'Commissioning Checklist', icon: 'checklist' },
    { id: 'defects', title: 'Defects & Punch List', icon: 'defect' },
    { id: 'reports', title: 'Evidence & Reports', icon: 'report', group: 'Records' },
    { id: 'data', title: 'Data Management', icon: 'data' }
  ];
  SV.ROUTES = ROUTES;
  let current = '', deferredInstall = null;

  const parseHash = () => { const m = /^#\/([a-z]*)(?:\?(.*))?$/.exec(location.hash || ''); return { route: (m && m[1]) || 'dashboard', query: new URLSearchParams((m && m[2]) || '') }; };
  SV.go = (route) => { if (location.hash === '#/' + route) SV.refresh(); else location.hash = '#/' + route; };
  SV.link = (route, label, cls) => h('a', { href: '#/' + route, class: cls || '' }, label);

  /* ---- navigation ---- */
  const renderNav = () => {
    const nav = document.getElementById('nav'); if (!nav) return;
    const ids = SV.scopeIds(), set = new Set(ids);
    const counts = { defects: SV.data.defects.filter((d) => set.has(d.projectId) && d.status !== 'Closed' && d.severity === 'Critical').length, checklist: SV.data.checklist.filter((c) => set.has(c.projectId) && SV.isOverdueCheck(c)).length };
    const kids = []; let lastGroup = '';
    ROUTES.forEach((r) => {
      if (r.group && r.group !== lastGroup) { kids.push(h('li', { class: 'nav-group', 'aria-hidden': 'true' }, r.group)); lastGroup = r.group; }
      const c = counts[r.id];
      kids.push(h('li', null, h('a', { href: '#/' + r.id, 'aria-current': r.id === current ? 'page' : null }, SV.icon(r.icon), h('span', null, r.title), c ? h('span', { class: 'cnt', title: r.id === 'defects' ? c + ' open critical defect(s)' : c + ' overdue item(s)' }, c) : null)));
    });
    nav.replaceChildren(...kids);
  };

  /* ---- scope selector ---- */
  SV.renderScope = () => {
    const sel = document.getElementById('scopeSelect'), star = document.getElementById('favBtn'); if (!sel) return;
    const favs = SV.data.projects.filter((p) => p.favorite), rest = SV.data.projects.filter((p) => !p.favorite), opt = (p) => h('option', { value: p.id }, (p.favorite ? '★ ' : '') + p.code + (p.isSample ? ' (sample)' : ''));
    sel.replaceChildren(h('option', { value: 'all' }, 'All projects'), favs.length ? h('optgroup', { label: 'Favorites' }, favs.map(opt)) : null, rest.length ? h('optgroup', { label: favs.length ? 'Other projects' : 'Projects' }, rest.map(opt)) : null);
    sel.value = SV.scope();
    const p = SV.scope() === 'all' ? null : SV.proj(SV.scope());
    star.disabled = !p; star.setAttribute('aria-pressed', p && p.favorite ? 'true' : 'false'); star.classList.toggle('on', !!(p && p.favorite));
    star.title = p ? (p.favorite ? 'Remove ' + p.code + ' from Favorites' : 'Add ' + p.code + ' to Favorites') : 'Select a project to add it to Favorites';
    star.replaceChildren(SV.icon(p && p.favorite ? 'star-fill' : 'star'));
  };
  SV.setScope = async (id) => { await SV.setPref('scope', id); SV.renderScope(); SV.refresh(); };
  SV.toggleFavorite = async (id) => { const p = SV.proj(id); if (!p) return; await SV.save('projects', Object.assign({}, p, { favorite: !p.favorite }), { action: p.favorite ? 'unfavorite' : 'favorite' }); SV.renderScope(); SV.toast(p.favorite ? p.code + ' removed from Favorites.' : p.code + ' added to Favorites.', 'ok'); };

  /* ---- global search ---- */
  const SEARCH = [
    ['projects', 'Project', 'projects', (r) => [r.code, r.name, r.customer, r.facility], (r) => r.code, (r) => r.name],
    ['io', 'I/O point', 'io', (r) => [r.tag, r.description, r.equipment], (r) => r.tag, (r) => r.description],
    ['tagsApproved', 'Approved tag', 'tags', (r) => [r.tag, r.description], (r) => r.tag, (r) => r.description],
    ['tagsExport', 'SCADA export tag', 'tags', (r) => [r.tag, r.description], (r) => r.tag, (r) => r.description],
    ['alarms', 'Alarm / trip test', 'alarms', (r) => [r.testId, r.tag, r.alarmDescription, r.requirementRef], (r) => r.testId + ' ' + r.tag, (r) => r.alarmDescription],
    ['comms', 'Comm issue', 'comms', (r) => [r.deviceName, r.ip, r.symptoms, r.errorMessages], (r) => r.deviceName, (r) => r.symptoms],
    ['kb', 'Knowledge base', 'comms', (r) => [r.title, r.symptoms, r.causes, r.tags], (r) => r.title, (r) => r.symptoms],
    ['tests', 'FAT/SAT test', 'fatsat', (r) => [r.testId, r.title, r.objective], (r) => r.testId + ' ' + r.title, (r) => r.objective],
    ['templates', 'Test template', 'fatsat', (r) => [r.title, r.objective], (r) => r.title, (r) => r.objective],
    ['checklist', 'Checklist item', 'checklist', (r) => [r.title, r.assignee, r.comments, r.category], (r) => r.title, (r) => r.category],
    ['defects', 'Defect', 'defects', (r) => [r.defectId, r.title, r.equipment, r.description], (r) => r.defectId + ' ' + r.title, (r) => r.equipment]
  ];
  SV.searchAll = (q) => {
    const ids = new Set(SV.scopeIds()), out = [];
    SEARCH.forEach(([store, label, route, fields, title, sub]) => {
      SV.data[store].forEach((r) => {
        if (r.projectId !== undefined && store !== 'projects' && !ids.has(r.projectId)) return;
        if (SV.matchText(q, ...fields(r))) out.push({ store, label, route, title: title(r), sub: sub(r), projectId: r.projectId, rec: r });
      });
    });
    return out;
  };
  SV.views.search = (query) => {
    const q = (query.get('q') || '').trim(), res = q ? SV.searchAll(q) : [], groups = {};
    res.forEach((r) => (groups[r.label] = (groups[r.label] || []).concat(r)));
    return h('div', null, SV.pageHeader('Search results', q ? res.length + ' result' + (res.length === 1 ? '' : 's') + ' for “' + q + '” in ' + (SV.scope() === 'all' ? 'all projects' : SV.projCode(SV.scope())) + '.' : 'Type a search term in the box at the top of the page.'),
      !q ? null : !res.length ? SV.empty('Nothing matched. Check the spelling, or switch the project selector to “All projects”.') :
        Object.keys(groups).map((g) => h('div', { class: 'card' }, h('h2', null, g + ' (' + groups[g].length + ')'), SV.table({ pageSize: 15, rows: groups[g], columns: [
          { key: 'title', label: 'Item', render: (r) => h('span', { class: 'tagname' }, r.title) }, { key: 'sub', label: 'Detail', render: (r) => h('span', { class: 'wrap' }, r.sub) },
          { key: 'projectId', label: 'Project', render: (r) => (r.store === 'projects' ? '' : SV.projCode(r.projectId)), value: (r) => SV.projCode(r.projectId) }],
        actions: (r) => [SV.btn('Open', { sm: true, onClick: () => { const k = r.route === 'tags' ? 'tags:' + (r.store === 'tagsExport' ? 'export' : r.store === 'tagsApproved' ? 'approved' : 'compare') : r.route === 'comms' ? (r.store === 'kb' ? 'kb' : 'comms') : r.route; SV.filterState[k] = Object.assign(SV.filterState[k] || {}, { q: r.title.split(' ').slice(-1)[0] && r.store !== 'projects' ? r.rec.tag || r.rec.testId || r.rec.defectId || r.rec.title || r.rec.deviceName || '' : r.rec.code }); if (r.route === 'tags') SV.tabState.tags = r.store === 'tagsExport' ? 'export' : r.store === 'tagsApproved' ? 'approved' : 'compare'; if (r.route === 'comms') SV.tabState.comms = r.store === 'kb' ? 'kb' : 'issues'; if (r.route === 'fatsat') SV.tabState.fatsat = r.store === 'templates' ? 'templates' : 'tests'; SV.go(r.route); } })] }))));
  };
  SV.tabState = {};

  /* ---- render ---- */
  const render = (focus) => {
    const main = document.getElementById('main'); if (!main) return;
    const { route, query } = parseHash(), view = SV.views[route] || SV.views.dashboard, r = ROUTES.find((x) => x.id === route);
    current = route; const y = window.scrollY;
    document.title = (r ? r.title : route === 'search' ? 'Search' : 'Dashboard') + ' — SCADA Verification & Commissioning';
    let node; try { node = view(query); } catch (e) { console.error(e); node = h('div', { class: 'card' }, h('h1', null, 'This view could not be displayed'), h('p', null, e.message), h('p', { class: 'muted' }, 'Your data is not affected. Try another page or reload.')); }
    main.replaceChildren(node); renderNav(); renderBanners();
    document.body.classList.remove('nav-open');
    if (focus) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); } else window.scrollTo(0, y);
  };
  SV.refresh = () => render(false);

  const renderBanners = () => {
    const b = document.getElementById('banners'); if (!b) return;
    const kids = [], samples = SV.sample.count();
    if (samples > 0 && !SV.prefs.hideSampleBanner) kids.push(h('div', { class: 'banner info', role: 'note' }, SV.icon('info'), h('div', { class: 'grow' }, h('b', null, 'Demonstration data is loaded. '), 'Records marked ', SV.sampleBadge(), ' belong to fictional plants and are not real test results. Remove them under Data Management before recording genuine project work.'),
      SV.btn('Data Management', { sm: true, onClick: () => SV.go('data') }), SV.btn('Hide', { sm: true, kind: 'ghost', onClick: async () => { await SV.setPref('hideSampleBanner', true); renderBanners(); } })));
    b.replaceChildren(...kids);
  };

  /* ---- settings ---- */
  SV.openSettings = () => {
    const fm = SV.form([{ name: 'engineer', label: 'Your name', help: 'Used as the default engineer and recorded in the change history. Stored only in this browser.', default: SV.engineer(), maxlength: 80 }], { engineer: SV.engineer() });
    SV.dialog({ title: 'Engineer profile', size: 'sm', body: fm.el, actions: [{ label: 'Cancel', kind: 'ghost' }, { label: 'Save', kind: 'primary', onClick: async () => { await SV.setPref('engineer', fm.get().engineer); updateEngineerChip(); SV.toast('Engineer name saved.', 'ok'); } }] });
  };
  const updateEngineerChip = () => { const c = document.getElementById('engBtn'); if (c) c.lastChild.textContent = SV.engineer() || 'Set your name'; };

  const updateOnline = () => { const p = document.getElementById('onlinePill'); if (!p) return; const on = navigator.onLine; p.replaceChildren(h('span', { class: 'lamp ' + (on ? 'ok' : 'warn') }), on ? 'Online' : 'Offline — working locally'); p.title = 'Core functions work offline; data stays in this browser.'; };

  const registerSW = () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('service-worker.js').then((reg) => {
      const prompt = (w) => SV.toast(h('span', null, 'An updated version is ready. ', h('button', { class: 'btn sm primary', onclick: () => w.postMessage('SKIP_WAITING') }, 'Reload to update')), 'info', 60000);
      if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); }); });
    }).catch((e) => console.warn('Service worker registration failed:', e));
    let reloading = false, hadController = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController) { hadController = true; return; } if (reloading) return; reloading = true; location.reload(); });
  };

  SV.init = async () => {
    try {
      await SV.load();
      if (!SV.prefs.initialized) { await SV.sample.seedBuiltIn(); await SV.sample.seed(); await SV.setPref('initialized', true); await SV.setPref('scope', 'all'); }
      else await SV.sample.seedBuiltIn();
    } catch (e) { console.error(e); document.getElementById('main').replaceChildren(h('div', { class: 'card' }, h('h1', null, 'Local storage is not available'), h('p', null, e.message), h('p', null, 'This application stores all data in your browser using IndexedDB. Private/incognito modes and some restricted environments disable it. Open the app in a normal browser window.'))); return; }
    document.getElementById('menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.getElementById('backdrop').addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });
    document.getElementById('scopeSelect').addEventListener('change', (e) => SV.setScope(e.target.value));
    document.getElementById('favBtn').addEventListener('click', () => { if (SV.scope() !== 'all') SV.toggleFavorite(SV.scope()).then(() => SV.refresh()); });
    document.getElementById('engBtn').addEventListener('click', SV.openSettings);
    document.getElementById('searchForm').addEventListener('submit', (e) => { e.preventDefault(); const q = document.getElementById('globalSearch').value.trim(); location.hash = '#/search?q=' + encodeURIComponent(q); });
    window.addEventListener('hashchange', () => { render(true); });
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; const b = document.getElementById('installBtn'); if (b) b.classList.remove('hidden'); });
    window.addEventListener('appinstalled', () => { deferredInstall = null; const b = document.getElementById('installBtn'); if (b) b.classList.add('hidden'); SV.toast('App installed.', 'ok'); });
    document.getElementById('installBtn').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; document.getElementById('installBtn').classList.add('hidden'); });
    SV.renderScope(); updateEngineerChip(); updateOnline();
    const q = parseHash().query.get('q'); if (q) document.getElementById('globalSearch').value = q;
    render(false); registerSW(); SV.requestPersist();
    window.SV_READY = true;
  };
  window.addEventListener('DOMContentLoaded', () => SV.init());
})();
