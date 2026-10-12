/* IndexedDB storage, in-memory cache, change history, attachments */
(function () {
  'use strict';
  const SV = window.SV;
  const DB_NAME = 'scada-evc-db', DB_VER = 1;
  const STORES = {
    projects: [], io: ['projectId'], tagsApproved: ['projectId'], tagsExport: ['projectId'], alarms: ['projectId'], comms: ['projectId'],
    kb: [], tests: ['projectId'], templates: [], checklist: ['projectId'], defects: ['projectId'], history: ['recordId'],
    attachments: ['ownerId'], settings: [], diagRuns: []
  };
  SV.STORE_NAMES = Object.keys(STORES);
  SV.PROJECT_STORES = ['io', 'tagsApproved', 'tagsExport', 'alarms', 'comms', 'tests', 'checklist', 'defects'];
  const NO_HISTORY = new Set(['history', 'attachments', 'settings', 'diagRuns']);
  SV.BACKUP_STORES = SV.STORE_NAMES.filter((s) => s !== 'settings');

  let dbp = null;
  const open = () => {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('IndexedDB is not available in this browser.')); return; }
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        Object.keys(STORES).forEach((n) => { if (!d.objectStoreNames.contains(n)) { const s = d.createObjectStore(n, { keyPath: 'id' }); STORES[n].forEach((i) => s.createIndex(i, i)); } });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('Could not open the database.'));
      r.onblocked = () => rej(new Error('Database upgrade blocked by another open tab. Close other tabs and reload.'));
    });
    return dbp;
  };
  const run = async (names, mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      let out; const t = db.transaction(names, mode);
      t.oncomplete = () => resolve(out && typeof out === 'object' && 'readyState' in out && 'result' in out ? out.result : out);
      t.onerror = () => reject(t.error || new Error('Database transaction failed.'));
      t.onabort = () => reject(t.error || new Error('Database transaction aborted (possibly storage quota exceeded).'));
      try { out = fn(t); } catch (e) { try { t.abort(); } catch (x) { /* ignore */ } reject(e); }
    });
  };
  const db = (SV.db = {
    open,
    getAll: (s) => run(s, 'readonly', (t) => t.objectStore(s).getAll()),
    get: (s, id) => run(s, 'readonly', (t) => t.objectStore(s).get(id)),
    put: (s, rec) => run(s, 'readwrite', (t) => t.objectStore(s).put(rec)),
    putMany: (s, recs) => run(s, 'readwrite', (t) => { const st = t.objectStore(s); recs.forEach((r) => st.put(r)); }),
    del: (s, id) => run(s, 'readwrite', (t) => t.objectStore(s).delete(id)),
    delMany: (s, ids) => run(s, 'readwrite', (t) => { const st = t.objectStore(s); ids.forEach((i) => st.delete(i)); }),
    clear: (s) => run(s, 'readwrite', (t) => t.objectStore(s).clear()),
    byIndex: (s, idx, v) => run(s, 'readonly', (t) => t.objectStore(s).index(idx).getAll(v)),
    /* iterate without keeping big payloads: returns array of fn(record) results */
    cursorMap: async (s, fn) => {
      const d = await open();
      return new Promise((resolve, reject) => {
        const out = [], t = d.transaction(s, 'readonly'), req = t.objectStore(s).openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { const v = fn(c.value); if (v !== undefined) out.push(v); c.continue(); } };
        t.oncomplete = () => resolve(out); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
      });
    },
    replaceAll: (data) => run(Object.keys(data), 'readwrite', (t) => { Object.keys(data).forEach((s) => { const st = t.objectStore(s); st.clear(); data[s].forEach((r) => st.put(r)); }); })
  });

  /* in-memory cache */
  SV.data = {}; SV.attCounts = {}; SV.prefs = { id: 'prefs' };
  SV.load = async () => {
    for (const s of SV.STORE_NAMES) { if (s === 'attachments' || s === 'settings') continue; SV.data[s] = await db.getAll(s); }
    const set = await db.getAll('settings'); SV.prefs = set.find((x) => x.id === 'prefs') || { id: 'prefs' };
    SV.attCounts = {};
    (await db.cursorMap('attachments', (a) => a.ownerId)).forEach((id) => { SV.attCounts[id] = (SV.attCounts[id] || 0) + 1; });
  };
  SV.setPref = async (k, v) => { SV.prefs[k] = v; await db.put('settings', SV.prefs); };
  SV.engineer = () => SV.prefs.engineer || '';
  SV.byId = (s, id) => (SV.data[s] || []).find((r) => r.id === id);

  const LABELS = {
    projects: (r) => r.code, io: (r) => r.tag, tagsApproved: (r) => r.tag, tagsExport: (r) => r.tag, alarms: (r) => (r.testId || '') + ' ' + (r.tag || ''),
    comms: (r) => r.deviceName, kb: (r) => r.title, tests: (r) => (r.testId || '') + ' ' + (r.title || ''), templates: (r) => r.title, checklist: (r) => r.title,
    defects: (r) => (r.defectId || '') + ' ' + (r.title || '')
  };
  SV.labelOf = (store, r) => String((LABELS[store] ? LABELS[store](r) : r.id) || r.id).trim();
  const short = (v) => { let s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return s.length > 140 ? s.slice(0, 137) + '...' : s; };
  const diff = (o, n) => {
    const ch = [];
    new Set([...Object.keys(o || {}), ...Object.keys(n || {})]).forEach((k) => {
      if (k === 'updatedAt' || k === 'createdAt' || k === 'id') return;
      const a = JSON.stringify(o ? o[k] : undefined), b = JSON.stringify(n[k]);
      if (a !== b) ch.push({ f: k, from: short(o ? o[k] : undefined), to: short(n[k]) });
    });
    return ch;
  };
  SV.logEvent = async (e) => {
    const rec = Object.assign({ id: SV.uid(), ts: SV.nowISO(), user: SV.engineer() || '(not set)' }, e);
    await db.put('history', rec); SV.data.history.push(rec); return rec;
  };
  SV.save = async (store, rec, opts) => {
    opts = opts || {};
    const arr = SV.data[store], i = arr.findIndex((r) => r.id === rec.id), old = i >= 0 ? arr[i] : null, now = SV.nowISO();
    rec.updatedAt = now; if (!old) rec.createdAt = rec.createdAt || now;
    await db.put(store, rec);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    if (!NO_HISTORY.has(store)) {
      const changes = diff(old, rec);
      if (!old || changes.length || opts.action) await SV.logEvent({ store, recordId: rec.id, projectId: rec.projectId || (store === 'projects' ? rec.id : ''), label: SV.labelOf(store, rec), action: opts.action || (old ? 'update' : 'create'), changes: old ? changes : [], note: opts.note || '', isSample: !!rec.isSample });
    }
    return rec;
  };
  SV.remove = async (store, id, opts) => {
    const arr = SV.data[store], i = arr.findIndex((r) => r.id === id); if (i < 0) return;
    const old = arr[i]; await db.del(store, id); arr.splice(i, 1);
    if (store === 'defects' || store === 'tests' || store === 'alarms') await SV.att.removeOwner(id);
    if (!NO_HISTORY.has(store)) await SV.logEvent({ store, recordId: id, projectId: old.projectId || '', label: SV.labelOf(store, old), action: 'delete', changes: [], note: (opts && opts.note) || '', isSample: !!old.isSample });
  };
  SV.bulkSave = async (store, recs, note, projectId) => {
    const now = SV.nowISO(); recs.forEach((r) => { r.updatedAt = now; r.createdAt = r.createdAt || now; });
    await db.putMany(store, recs);
    const arr = SV.data[store], idx = new Map(arr.map((r, i) => [r.id, i]));
    recs.forEach((r) => { if (idx.has(r.id)) arr[idx.get(r.id)] = r; else arr.push(r); });
    await SV.logEvent({ store, recordId: '', projectId: projectId || '', label: store + ' (' + recs.length + ' records)', action: 'import', changes: [], note: note || '' });
  };
  SV.removeWhere = async (store, pred, note, projectId) => {
    const arr = SV.data[store], gone = arr.filter(pred); if (!gone.length) return 0;
    await db.delMany(store, gone.map((g) => g.id)); SV.data[store] = arr.filter((r) => !pred(r));
    await SV.logEvent({ store, recordId: '', projectId: projectId || '', label: store + ' (' + gone.length + ' removed)', action: 'delete', changes: [], note: note || '' });
    return gone.length;
  };
  SV.deleteProject = async (id) => {
    const p = SV.byId('projects', id); if (!p) return;
    for (const s of SV.PROJECT_STORES) {
      const ids = SV.data[s].filter((r) => r.projectId === id).map((r) => r.id);
      if (ids.length) { await db.delMany(s, ids); SV.data[s] = SV.data[s].filter((r) => r.projectId !== id); for (const x of ids) await SV.att.removeOwner(x); }
    }
    await db.del('projects', id); SV.data.projects = SV.data.projects.filter((r) => r.id !== id);
    await SV.logEvent({ store: 'projects', recordId: id, projectId: id, label: p.code, action: 'delete', changes: [], note: 'Project and all linked records deleted', isSample: !!p.isSample });
  };

  /* attachments (photos) */
  const resize = (file) => new Promise((resolve, reject) => {
    const fallback = () => { if (file.size > 1.5 * 1048576) { reject(new Error('Image is too large to store (limit 1.5 MB when it cannot be resized).')); return; } const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); };
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const max = 1280, sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        const ctx = c.getContext('2d'); if (!ctx) { URL.revokeObjectURL(url); fallback(); return; }
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.8));
      } catch (e) { URL.revokeObjectURL(url); fallback(); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
  SV.att = {
    list: (ownerId) => db.byIndex('attachments', 'ownerId', ownerId),
    add: async (ownerType, ownerId, projectId, file) => {
      if (!/^image\//.test(file.type)) throw new Error('Only image files can be attached as photos.');
      const dataUrl = await resize(file);
      const rec = { id: SV.uid(), ownerType, ownerId, projectId: projectId || '', name: file.name || 'photo.jpg', size: Math.round(dataUrl.length * 0.75), ts: SV.nowISO(), dataUrl };
      await db.put('attachments', rec); SV.attCounts[ownerId] = (SV.attCounts[ownerId] || 0) + 1; return rec;
    },
    remove: async (att) => { await db.del('attachments', att.id); SV.attCounts[att.ownerId] = Math.max(0, (SV.attCounts[att.ownerId] || 1) - 1); },
    removeOwner: async (ownerId) => { const l = await db.byIndex('attachments', 'ownerId', ownerId); if (l.length) await db.delMany('attachments', l.map((a) => a.id)); delete SV.attCounts[ownerId]; },
    count: (ownerId) => SV.attCounts[ownerId] || 0
  };
  SV.requestPersist = async () => { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ } return false; };
})();
