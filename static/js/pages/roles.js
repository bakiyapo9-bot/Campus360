/* Gestion des permissions par rôle (matrice module × droit).
   Django : correspond aux Group + Permission (auth) ; le front n'affiche que l'état. */
C360.page(function () {
  'use strict';
  const { db, ui, esc } = C360;
  const perms = db.raw().permissions;
  const DROITS = { voir: 'Consulter', ajouter: 'Ajouter', modifier: 'Modifier', supprimer: 'Supprimer' };
  const ICONS = { admin: 'shield-lock', scolarite: 'mortarboard', comptable: 'calculator', enseignant: 'person-video3', etudiant: 'person' };
  const draft = JSON.parse(JSON.stringify(perms.roles));
  let dirty = false;

  ui.fillSelect('#roleSel', Object.entries(C360.ROLES).map(([k, r]) => ({ value: k, label: r.label })), { value: 'value', label: 'label', selected: C360.param('role') || 'scolarite' });

  function renderCards() {
    document.getElementById('roleCards').innerHTML = Object.entries(C360.ROLES).map(([k, r]) => {
      const n = db.where('users', (u) => u.role === k).length;
      const mods = k === 'admin' ? perms.modules.length : Object.keys(draft[k] || {}).filter((m) => (draft[k][m] || []).length).length;
      return `<div class="col-sm-6 col-xl"><button type="button" class="card h-100 w-100 text-start ${document.getElementById('roleSel').value === k ? 'border-primary border-2' : ''}" data-role-card="${k}"><div class="card-body">
        <div class="stat-icon soft-primary mb-2"><i class="bi bi-${ICONS[k]}"></i></div><div class="fw-semibold">${esc(r.label)}</div>
        <div class="text-xs text-secondary">${n} utilisateur(s) · ${mods} module(s)</div></div></button></div>`;
    }).join('');
  }

  function renderMatrix() {
    const role = document.getElementById('roleSel').value;
    const locked = role === 'admin';
    document.getElementById('roleNote').innerHTML = locked ? '<i class="bi bi-lock me-1"></i>L\'administrateur dispose de tous les droits ; ce rôle n\'est pas modifiable.' : '<i class="bi bi-info-circle me-1"></i>« Consulter » est requis pour les autres droits d\'un module.';
    document.getElementById('permHead').innerHTML = `<tr><th>Module</th>${Object.values(DROITS).map((d) => `<th>${d}</th>`).join('')}</tr>`;
    document.getElementById('permBody').innerHTML = perms.modules.map((m) => {
      const has = (d) => locked || (draft[role] && (draft[role][m.code] || []).includes(d));
      return `<tr><td class="fw-medium">${esc(m.nom)}</td>${Object.keys(DROITS).map((d) => `<td><input type="checkbox" class="form-check-input" data-mod="${m.code}" data-droit="${d}" ${has(d) ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="${esc(m.nom)} : ${DROITS[d]}"></td>`).join('')}</tr>`;
    }).join('');
  }

  document.getElementById('permBody').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-mod]');
    if (!cb) return;
    const role = document.getElementById('roleSel').value;
    draft[role] = draft[role] || {};
    const list = new Set(draft[role][cb.dataset.mod] || []);
    if (cb.checked) { list.add(cb.dataset.droit); list.add('voir'); } else { list.delete(cb.dataset.droit); if (cb.dataset.droit === 'voir') list.clear(); }
    draft[role][cb.dataset.mod] = [...list];
    dirty = true;
    document.getElementById('btnSave').disabled = false;
    renderMatrix(); renderCards();
  });
  document.getElementById('roleSel').addEventListener('change', () => { renderMatrix(); renderCards(); });
  document.getElementById('roleCards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-role-card]');
    if (b) { document.getElementById('roleSel').value = b.dataset.roleCard; renderMatrix(); renderCards(); }
  });
  document.getElementById('btnSave').addEventListener('click', () => {
    perms.roles = JSON.parse(JSON.stringify(draft));
    db.save();
    C360.audit('Permissions modifiées', Object.keys(C360.ROLES).map((k) => C360.ROLES[k].label).join(', '));
    dirty = false;
    document.getElementById('btnSave').disabled = true;
    ui.toast('Permissions enregistrées.');
  });
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  renderCards(); renderMatrix();
});
