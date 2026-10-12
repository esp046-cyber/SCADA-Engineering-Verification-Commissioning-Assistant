/* UI components */
(function () {
  'use strict';
  const SV = window.SV, h = SV.h;
  SV.filterState = {};

  /* ---------- scope / project helpers ---------- */
  SV.scope = () => { const s = SV.prefs.scope; return s && s !== 'all' && SV.byId('projects', s) ? s : 'all'; };
  SV.scopeIds = () => (SV.scope() === 'all' ? SV.data.projects.map((p) => p.id) : [SV.scope()]);
  SV.scoped = (store) => { const ids = new Set(SV.scopeIds()); return SV.data[store].filter((r) => ids.has(r.projectId)); };
  SV.proj = (id) => SV.byId('projects', id);
  SV.projCode = (id) => (SV.proj(id) || {}).code || '?';
  SV.projectOptions = () => SV.data.projects.slice().sort((a, b) => SV.cmp(a.code, b.code)).map((p) => [p.id, p.code + ' — ' + p.name]);
  SV.defaultProjectId = () => { if (SV.scope() !== 'all') return SV.scope(); const f = SV.data.projects.find((p) => p.favorite); return (f || SV.data.projects[0] || {}).id || ''; };
  SV.stamp = (rec) => { const p = SV.proj(rec.projectId); rec.isSample = !!(p && p.isSample); return rec; };

  /* ---------- toast ---------- */
  SV.toast = (msg, kind, ms) => {
    const box = document.getElementById('toasts'); if (!box) return;
    const t = h('div', { class: 'toast ' + (kind || 'info'), role: kind === 'bad' ? 'alert' : 'status' }, h('div', null, msg),
      h('button', { class: 'icon-btn sm', 'aria-label': 'Dismiss message', onclick: () => t.remove() }, SV.icon('x', 14)));
    box.appendChild(t); setTimeout(() => t.remove(), ms || (kind === 'bad' ? 9000 : 4500));
  };
  SV.fail = (e, ctx) => { console.error(e); SV.toast((ctx ? ctx + ': ' : '') + (e && e.message ? e.message : String(e)), 'bad'); };

  /* ---------- dialog ---------- */
  SV.dialog = (o) => {
    const id = 'dlg-' + SV.uid().slice(0, 8);
    const dlg = h('dialog', { class: 'dlg ' + (o.size || ''), 'aria-labelledby': id });
    let closed = false;
    const api = { el: dlg, close: (r) => { if (closed) return; closed = true; try { dlg.close(); } catch (e) { /* ignore */ } dlg.remove(); if (o.onClose) o.onClose(r); } };
    const foot = h('div', { class: 'dlg-foot' });
    (o.actions || []).forEach((a) => {
      const b = h('button', { type: 'button', class: 'btn ' + (a.kind || ''), disabled: !!a.disabled }, a.icon ? SV.icon(a.icon, 16) : null, a.label);
      b.addEventListener('click', async () => {
        if (b.disabled) return; b.disabled = true;
        try { const r = a.onClick ? await a.onClick(api) : undefined; if (r !== false) api.close(a.result); } catch (e) { SV.fail(e); } finally { b.disabled = !!a.disabled && a.stayDisabled; if (!closed) b.disabled = false; }
      });
      a.node = b; foot.appendChild(b);
    });
    dlg.append(h('div', { class: 'dlg-head' }, h('h2', { id }, o.title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close dialog', onclick: () => api.close(undefined) }, SV.icon('x'))),
      h('div', { class: 'dlg-body' }, o.body), (o.actions || []).length ? foot : null);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); api.close(undefined); });
    document.body.appendChild(dlg);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    const first = dlg.querySelector('.dlg-body input:not([type=hidden]),.dlg-body select,.dlg-body textarea,.dlg-body button');
    if (first) first.focus();
    return api;
  };
  SV.confirm = (o) => new Promise((resolve) => {
    let input = null;
    const body = h('div', null, h('p', null, o.message), o.requireText ? h('div', { class: 'field' }, h('label', { for: 'cf-t' }, 'Type ' + o.requireText + ' to confirm'), (input = h('input', { id: 'cf-t', autocomplete: 'off' }))) : null);
    let ok = false;
    const d = SV.dialog({ title: o.title || 'Please confirm', size: 'sm', body, onClose: () => resolve(ok), actions: [
      { label: 'Cancel', kind: 'ghost', onClick: () => undefined },
      { label: o.confirmLabel || 'Confirm', kind: o.danger ? 'danger' : 'primary', onClick: () => { if (o.requireText && input.value.trim() !== o.requireText) { SV.toast('Type ' + o.requireText + ' exactly to continue.', 'warn'); return false; } ok = true; } }] });
    return d;
  });
  SV.alertDialog = (title, body) => SV.dialog({ title, body, size: 'md', actions: [{ label: 'Close', kind: 'primary' }] });
  /* human sign-off: never automatic */
  SV.approvalDialog = (o) => new Promise((resolve) => {
    const name = h('input', { id: 'ap-n', autocomplete: 'name', required: true }), role = h('input', { id: 'ap-r', placeholder: 'e.g. Commissioning lead, Customer representative' });
    const cm = h('textarea', { id: 'ap-c', rows: 2 }), ck = h('input', { type: 'checkbox', id: 'ap-k' });
    let result = null;
    SV.dialog({ title: o.title, size: 'md', onClose: () => resolve(result), body: h('div', null,
      h('div', { class: 'banner warn' }, SV.icon('shield'), h('div', { class: 'grow' }, 'Sign-off must be given by an authorized person after reviewing the approved requirement and the recorded evidence. This application never approves safety-critical items automatically.')),
      h('div', { style: 'margin:12px 0' }, o.summary),
      h('div', { class: 'form-grid' },
        h('div', { class: 'field' }, h('label', { for: 'ap-n' }, 'Approver name ', h('span', { class: 'req' }, '*')), name),
        h('div', { class: 'field' }, h('label', { for: 'ap-r' }, 'Role / authority ', h('span', { class: 'req' }, '*')), role),
        h('div', { class: 'field full' }, h('label', { for: 'ap-c' }, o.commentLabel || 'Comment (optional)'), cm),
        h('div', { class: 'field chk full' }, ck, h('label', { for: 'ap-k' }, o.statement || 'I am authorized to give this sign-off and I have reviewed the requirement and the evidence.')))),
    actions: [{ label: 'Cancel', kind: 'ghost' }, { label: o.confirmLabel || 'Record approval', kind: 'primary', onClick: () => {
      if (!name.value.trim() || !role.value.trim()) { SV.toast('Approver name and role are required.', 'warn'); return false; }
      if (!ck.checked) { SV.toast('Tick the confirmation statement to continue.', 'warn'); return false; }
      result = { name: name.value.trim(), role: role.value.trim(), comment: cm.value.trim() };
    } }] });
  });

  /* ---------- badges ---------- */
  const KIND = { pass: 'ok', approved: 'ok', complete: 'ok', completed: 'ok', closed: 'ok', resolved: 'ok', match: 'ok', ok: 'ok', fail: 'bad', failed: 'bad', rejected: 'bad', deviation: 'bad', critical: 'crit', major: 'warn', minor: 'info', observation: 'mute', open: 'warn', 'in progress': 'info', 'awaiting retest': 'warn', 'not tested': 'mute', 'not run': 'mute', 'n/a': 'mute', pending: 'warn', blocked: 'warn', investigating: 'info', incomplete: 'warn', overdue: 'bad', 'not retested': 'mute' };
  SV.badge = (text, kind) => h('span', { class: 'badge ' + (kind || KIND[SV.norm(text)] || 'mute') }, text);
  SV.sampleBadge = () => h('span', { class: 'badge sample', title: 'Demonstration record — not real project data' }, 'SAMPLE');
  SV.flagList = (flags) => h('div', { class: 'flags' }, flags.length ? flags.map((f) => SV.badge(f.text, f.kind || 'warn')) : h('span', { class: 'faint' }, '—'));

  /* ---------- layout helpers ---------- */
  SV.pageHeader = (title, sub, actions) => h('div', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', null, sub) : null), actions && actions.length ? h('div', { class: 'btn-row' }, actions) : null);
  SV.btn = (label, o) => { o = o || {}; return h('button', { type: 'button', class: 'btn ' + (o.kind || '') + (o.sm ? ' sm' : ''), onclick: o.onClick, disabled: !!o.disabled, title: o.title, 'aria-label': o.aria }, o.icon ? SV.icon(o.icon, 16) : null, label); };
  SV.iconBtn = (icon, label, onClick, o) => h('button', { type: 'button', class: 'icon-btn sm' + (o && o.on ? ' on' : ''), title: label, 'aria-label': label, onclick: onClick, disabled: !!(o && o.disabled) }, SV.icon(icon, 16));
  SV.empty = (msg, action) => h('div', { class: 'empty' }, h('p', null, msg), action || null);
  SV.dl = (pairs) => h('dl', { class: 'kv' }, pairs.map(([k, v]) => [h('dt', null, k), h('dd', null, v === null || v === undefined || v === '' ? '—' : v)]));
  SV.tabs = (items, active, onSelect) => {
    const list = h('div', { class: 'tabs', role: 'tablist' });
    items.forEach(([k, label]) => {
      const b = h('button', { type: 'button', role: 'tab', 'aria-selected': k === active ? 'true' : 'false', tabindex: k === active ? '0' : '-1', onclick: () => onSelect(k) }, label);
      b.addEventListener('keydown', (e) => { const i = items.findIndex((x) => x[0] === k); let n = -1; if (e.key === 'ArrowRight') n = (i + 1) % items.length; if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length; if (n >= 0) { e.preventDefault(); onSelect(items[n][0]); } });
      list.appendChild(b);
    });
    return list;
  };
  SV.needProject = () => (SV.data.projects.length ? null : h('div', { class: 'empty' }, h('p', null, 'There are no projects yet. Records belong to a project, so create one first.'), h('a', { class: 'btn primary', href: '#/projects' }, 'Go to Projects')));

  /* ---------- form builder ---------- */
  SV.form = (fields, values, o) => {
    values = values || {}; o = o || {};
    const root = h('div', { class: 'form-grid' }), refs = {}, uid = SV.uid().slice(0, 6);
    fields.forEach((f) => {
      if (f.section) { root.appendChild(h('h3', { class: 'form-section' }, f.section)); return; }
      if (f.node) { root.appendChild(h('div', { class: 'field full' }, f.node)); return; }
      const id = 'f-' + uid + '-' + f.name, type = f.type || 'text';
      const cur = values[f.name] !== undefined && values[f.name] !== null ? values[f.name] : f.default !== undefined ? f.default : '';
      let input;
      if (type === 'select') {
        input = h('select', { id, name: f.name }, f.placeholder !== undefined ? h('option', { value: '' }, f.placeholder) : null,
          (f.options || []).map((x) => { const a = Array.isArray(x) ? x : [x, x]; return h('option', { value: a[0], disabled: !!(f.disabledOptions && f.disabledOptions.includes(a[0])) }, a[1]); }));
        input.value = String(cur);
        if (cur === '' && f.placeholder === undefined && input.options.length) input.selectedIndex = 0;
        if (input.value !== String(cur) && cur !== '') { input.appendChild(h('option', { value: cur }, cur)); input.value = String(cur); }
      } else if (type === 'textarea') { input = h('textarea', { id, name: f.name, rows: f.rows || 3, placeholder: f.placeholder }); input.value = cur; }
      else if (type === 'checkbox') { input = h('input', { id, name: f.name, type: 'checkbox' }); input.checked = !!values[f.name]; }
      else {
        input = h('input', { id, name: f.name, type: type === 'number' ? 'number' : type, placeholder: f.placeholder, step: type === 'number' ? f.step || 'any' : null, min: f.min, max: f.max, autocomplete: 'off', list: f.list ? id + '-dl' : null, maxlength: f.maxlength });
        input.value = cur;
      }
      if (f.readonly) { input.readOnly = true; if (type === 'select') input.disabled = true; }
      const help = f.help ? h('div', { class: 'help', id: id + '-h' }, f.help) : null, err = h('div', { class: 'err', id: id + '-e', 'aria-live': 'polite' });
      input.setAttribute('aria-describedby', (help ? id + '-h ' : '') + id + '-e');
      if (f.required) input.setAttribute('aria-required', 'true');
      const label = h('label', { for: id }, f.label, f.required ? h('span', { class: 'req' }, ' *') : null);
      const wrap = type === 'checkbox' ? h('div', { class: 'field chk' + (f.full ? ' full' : '') }, input, label, help, err) : h('div', { class: 'field' + (f.full || type === 'textarea' ? ' full' : '') }, label, input, f.list ? h('datalist', { id: id + '-dl' }, f.list.map((x) => h('option', { value: x }))) : null, help, err);
      refs[f.name] = { f, input, err, wrap }; root.appendChild(wrap);
    });
    const get = () => {
      const out = {};
      Object.keys(refs).forEach((k) => {
        const { f, input } = refs[k], t = f.type || 'text';
        if (t === 'checkbox') out[k] = input.checked;
        else if (t === 'number') out[k] = input.value === '' ? null : Number(input.value);
        else out[k] = t === 'textarea' ? input.value.trim() : input.value.trim();
      });
      return out;
    };
    const setErr = (k, msg) => { const r = refs[k]; r.err.textContent = msg || ''; if (msg) r.input.setAttribute('aria-invalid', 'true'); else r.input.removeAttribute('aria-invalid'); };
    const validate = () => {
      const vals = get(), errs = []; let first = null;
      Object.keys(refs).forEach((k) => {
        const { f, input } = refs[k], v = vals[k], t = f.type || 'text'; let msg = '';
        if (t === 'number' && input.validity && input.validity.badInput) msg = f.label + ' must be a valid number.';
        else if (f.required && (v === '' || v === null || v === undefined)) msg = f.label + ' is required.';
        else if (t === 'number' && v !== null && f.min != null && v < f.min) msg = f.label + ' must be at least ' + f.min + '.';
        else if (t === 'number' && v !== null && f.max != null && v > f.max) msg = f.label + ' must be at most ' + f.max + '.';
        else if (f.validate && !f.readonly) msg = f.validate(v, vals) || '';
        setErr(k, msg); if (msg) { errs.push(msg); if (!first) first = input; }
      });
      if (first) first.focus();
      return errs;
    };
    return { el: root, get, validate, refs, setErr, set: (k, v) => { const r = refs[k]; if (!r) return; if (r.f.type === 'checkbox') r.input.checked = !!v; else r.input.value = v == null ? '' : v; } };
  };
  /* generic add/edit dialog */
  SV.editDialog = (o) => {
    const fm = SV.form(o.fields, o.values, o);
    const errBox = h('div', { class: 'formerr hidden', role: 'alert' });
    const body = h('div', null, o.notice || null, errBox, fm.el, o.extra || null);
    return SV.dialog({ title: o.title, size: o.size || 'md', body, onClose: o.onClose, actions: [
      { label: 'Cancel', kind: 'ghost', onClick: () => { if (o.onCancel) return o.onCancel(); } },
      { label: o.saveLabel || 'Save', kind: 'primary', onClick: async () => {
        const errs = fm.validate(); errBox.classList.toggle('hidden', !errs.length);
        if (errs.length) { errBox.textContent = 'Please fix ' + errs.length + ' problem' + (errs.length > 1 ? 's' : '') + ' before saving: ' + errs.slice(0, 3).join(' '); return false; }
        const vals = fm.get(); const extraErr = o.check ? o.check(vals) : '';
        if (extraErr) { errBox.classList.remove('hidden'); errBox.textContent = extraErr; return false; }
        return await o.onSave(vals);
      } }] });
  };

  /* ---------- table ---------- */
  SV.table = (o) => {
    const wrap = h('div', { class: 'table-wrap' }); let sk = o.defaultSort ? o.defaultSort.key : null, sd = o.defaultSort ? o.defaultSort.dir : 1, page = 0; const ps = o.pageSize || 50;
    const draw = () => {
      let rows = o.rows.slice();
      if (sk) { const col = o.columns.find((c) => c.key === sk); if (col) { const val = col.value || ((r) => r[col.key]); rows.sort((a, b) => sd * SV.cmp(val(a), val(b))); } }
      const pages = Math.max(1, Math.ceil(rows.length / ps)); if (page >= pages) page = pages - 1;
      const slice = rows.slice(page * ps, page * ps + ps);
      if (!rows.length) { wrap.replaceChildren(SV.empty(o.empty || 'No records match the current filters.')); return; }
      const thead = h('thead', null, h('tr', null, o.columns.map((c) => h('th', { scope: 'col', 'aria-sort': sk === c.key ? (sd > 0 ? 'ascending' : 'descending') : null },
        c.nosort ? c.label : h('button', { type: 'button', title: 'Sort by ' + c.label, onclick: () => { if (sk === c.key) sd = -sd; else { sk = c.key; sd = 1; } draw(); } }, c.label, sk === c.key ? (sd > 0 ? '▲' : '▼') : null))), o.actions ? h('th', { scope: 'col' }, 'Actions') : null));
      const tbody = h('tbody', null, slice.map((r) => h('tr', { class: o.rowClass ? o.rowClass(r) : '' },
        o.columns.map((c) => { const v = c.render ? c.render(r) : r[c.key]; return h('td', { class: c.cls || '', 'data-label': c.label }, v === null || v === undefined || v === '' ? h('span', { class: 'faint' }, '—') : v); }),
        o.actions ? h('td', { class: 'act', 'data-label': 'Actions' }, h('div', { class: 'cell-actions' }, o.actions(r))) : null)));
      const pager = rows.length > ps ? h('div', { class: 'pager' }, h('span', null, 'Showing ' + (page * ps + 1) + '–' + Math.min(rows.length, page * ps + ps) + ' of ' + rows.length),
        h('div', { class: 'btn-row' }, SV.btn('Previous', { sm: true, disabled: page === 0, onClick: () => { page--; draw(); } }), SV.btn('Next', { sm: true, disabled: page >= pages - 1, onClick: () => { page++; draw(); } }))) : h('div', { class: 'pager' }, h('span', null, rows.length + ' record' + (rows.length === 1 ? '' : 's')));
      wrap.replaceChildren(h('div', { class: 'tscroll' }, h('table', { class: 't stack' }, thead, tbody)), pager);
    };
    draw(); return wrap;
  };

  /* ---------- filters ---------- */
  SV.filterBar = (spec, key, onChange) => {
    const st = (SV.filterState[key] = SV.filterState[key] || {}), el = h('div', { class: 'filters', role: 'search' });
    const fire = SV.debounce(() => onChange(), 120);
    spec.forEach((f) => {
      const id = 'flt-' + key + '-' + f.name; let inp;
      if (f.type === 'select') {
        inp = h('select', { id }, h('option', { value: '' }, f.all || 'All'), (f.options || []).map((x) => { const a = Array.isArray(x) ? x : [x, x]; return h('option', { value: a[0] }, a[1]); }));
        inp.value = st[f.name] || ''; inp.addEventListener('change', () => { st[f.name] = inp.value; onChange(); });
        el.appendChild(h('label', { for: id }, f.label, inp));
      } else if (f.type === 'checkbox') {
        inp = h('input', { id, type: 'checkbox' }); inp.checked = !!st[f.name]; inp.addEventListener('change', () => { st[f.name] = inp.checked; onChange(); });
        el.appendChild(h('label', { class: 'chk', for: id }, inp, f.label));
      } else if (f.type === 'date') {
        inp = h('input', { id, type: 'date' }); inp.value = st[f.name] || ''; inp.addEventListener('change', () => { st[f.name] = inp.value; onChange(); });
        el.appendChild(h('label', { for: id }, f.label, inp));
      } else {
        inp = h('input', { id, type: 'search', placeholder: f.placeholder || 'Search…', autocomplete: 'off' }); inp.value = st[f.name] || '';
        inp.addEventListener('input', () => { st[f.name] = inp.value; fire(); });
        el.appendChild(h('label', { for: id }, f.label || 'Search', inp));
      }
    });
    el.appendChild(h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { Object.keys(st).forEach((k) => delete st[k]); onChange(); const nf = SV.filterBar; /* re-render by caller */ if (SV.refresh) SV.refresh(); } }, 'Clear filters'));
    return { el, values: () => Object.assign({}, st) };
  };
  SV.matchText = (q, ...fields) => { q = SV.norm(q); if (!q) return true; return fields.some((f) => SV.norm(f).includes(q)); };

  /* ---------- history dialog ---------- */
  SV.showHistory = (recordId, label) => {
    const items = SV.data.history.filter((x) => x.recordId === recordId).sort((a, b) => (a.ts < b.ts ? 1 : -1));
    const body = items.length ? h('ul', { class: 'timeline' }, items.map((x) => h('li', null, h('time', null, SV.fmtDT(x.ts) + ' · ' + (x.user || '')),
      h('b', null, x.action.toUpperCase()), x.note ? ' — ' + x.note : '',
      (x.changes || []).slice(0, 14).map((c) => h('div', { class: 'small muted' }, c.f + ': ', h('span', { class: 'faint' }, c.from === '' ? '(empty)' : c.from), ' → ', c.to === '' ? '(empty)' : c.to)),
      (x.changes || []).length > 14 ? h('div', { class: 'small faint' }, '… and ' + (x.changes.length - 14) + ' more field changes') : null))) : SV.empty('No recorded changes for this item yet.');
    return SV.dialog({ title: 'Change history — ' + label, size: 'md', body, actions: [{ label: 'Close', kind: 'primary' }] });
  };

  /* ---------- photo attachments ---------- */
  SV.attachWidget = (o) => {
    const grid = h('div', { class: 'att-grid' }), added = [], err = h('div', { class: 'err', role: 'alert' });
    const draw = async () => {
      const list = await SV.att.list(o.ownerId);
      grid.replaceChildren(...(list.length ? list : []).map((a) => h('figure', { class: 'att' },
        h('button', { type: 'button', class: 'att-img', 'aria-label': 'View photo ' + a.name, onclick: () => SV.dialog({ title: a.name, size: 'lg', body: h('img', { src: a.dataUrl, alt: a.name, style: 'max-width:100%;height:auto;display:block;margin:auto' }), actions: [{ label: 'Close', kind: 'primary' }] }) }, h('img', { src: a.dataUrl, alt: a.name })),
        h('figcaption', { class: 'small muted' }, a.name.slice(0, 24) + ' · ' + SV.fmtDT(a.ts)),
        o.readonly ? null : h('button', { type: 'button', class: 'btn sm danger', onclick: async () => { if (await SV.confirm({ title: 'Remove photo', message: 'Remove this photo permanently?', confirmLabel: 'Remove', danger: true })) { await SV.att.remove(a); const i = added.findIndex((x) => x.id === a.id); if (i >= 0) added.splice(i, 1); draw(); } } }, 'Remove'))));
      if (!list.length) grid.appendChild(h('p', { class: 'faint small' }, 'No photos attached.'));
    };
    const file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', id: 'att-' + o.ownerId, onchange: async () => {
      err.textContent = '';
      for (const f of Array.from(file.files)) { try { added.push(await SV.att.add(o.ownerType, o.ownerId, o.projectId, f)); } catch (e) { err.textContent = f.name + ': ' + e.message; } }
      file.value = ''; draw();
    } });
    const el = h('div', null, o.readonly ? null : h('div', { class: 'btn-row' }, file, h('label', { class: 'btn sm', for: file.id }, SV.icon('camera', 16), 'Add photo(s)'), h('span', { class: 'small faint' }, 'Images are resized (max 1280 px) and stored locally in this browser.')), err, grid);
    draw();
    return { el, refresh: draw, discardNew: async () => { for (const a of added) await SV.att.remove(a); added.length = 0; } };
  };
})();
