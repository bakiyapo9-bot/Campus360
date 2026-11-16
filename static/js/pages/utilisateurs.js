/* Comptes utilisateurs : création, attribution des rôles, activation / désactivation,
   réinitialisation du mot de passe. */
C360.page(function () {
  'use strict';
  const { db, ui, esc } = C360;
  const ROLE_OPTS = Object.entries(C360.ROLES).map(([k, r]) => ({ value: k, label: r.label }));
  ui.fillSelect('#fRole', ROLE_OPTS, { value: 'value', label: 'label', placeholder: 'Tous les rôles' });
  const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const log = (user, evenement, niveau = 'warning') => db.insert('connexions', { user_id: user.id, date: now(), ip: '—', navigateur: navigator.userAgent.slice(0, 40), evenement, niveau });

  const renderStats = () => {
    const all = db.all('users');
    const s = [['Comptes', all.length, 'people', 'soft-primary'], ['Actifs', all.filter((u) => u.statut === 'Actif').length, 'person-check', 'soft-success'], ['Désactivés', all.filter((u) => u.statut !== 'Actif').length, 'person-slash', 'soft-danger'], ['Administrateurs', all.filter((u) => u.role === 'admin').length, 'shield-lock', 'soft-purple']];
    document.getElementById('stats').innerHTML = s.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  };
  renderStats();

  const crud = C360.crud({
    mount: '#crud', collection: 'users', title: 'Utilisateurs', singular: 'un utilisateur', search: ['username', 'nom', 'prenom', 'email'], modalSize: 'modal-lg',
    filters: [{ el: '#fRole', field: 'role' }, { el: '#fStatut', field: 'statut' }],
    sort: (a, b) => a.nom.localeCompare(b.nom),
    columns: [
      { label: 'Utilisateur', render: (u) => `<div class="d-flex align-items-center gap-2">${ui.avatar(`${u.prenom} ${u.nom}`)}<div><div class="fw-semibold">${esc(u.prenom)} ${esc(u.nom)}</div><div class="text-xs text-secondary">${esc(u.email)}</div></div></div>` },
      { label: 'Identifiant', render: (u) => `<span class="font-monospace text-sm">${esc(u.username)}</span>` },
      { label: 'Rôle', render: (u) => `<span class="badge text-bg-light border">${esc(C360.ROLES[u.role].label)}</span>` },
      { label: 'Dernière connexion', render: (u) => `<span class="text-sm">${esc(u.derniere_connexion || 'Jamais')}</span>` },
      { label: 'Statut', render: (u) => ui.badge(u.statut) },
    ],
    extraActions: (u) => `<button class="btn btn-sm btn-light" data-reset="${u.id}" title="Réinitialiser le mot de passe" aria-label="Réinitialiser le mot de passe"><i class="bi bi-key"></i></button>
      <button class="btn btn-sm btn-light ${u.statut === 'Actif' ? 'text-warning' : 'text-success'}" data-toggle-user="${u.id}" title="${u.statut === 'Actif' ? 'Désactiver' : 'Activer'}" aria-label="${u.statut === 'Actif' ? 'Désactiver' : 'Activer'}"><i class="bi bi-${u.statut === 'Actif' ? 'person-slash' : 'person-check'}"></i></button> `,
    fields: [
      { name: 'prenom', label: 'Prénom', required: true, col: 6 },
      { name: 'nom', label: 'Nom', required: true, col: 6 },
      { name: 'username', label: 'Identifiant de connexion', required: true, pattern: '[A-Za-z0-9._\\-]{3,40}', invalid: '3 à 40 caractères : lettres, chiffres, . _ -', col: 6 },
      { name: 'email', label: 'E-mail', type: 'email', required: true, col: 6 },
      { name: 'role', label: 'Rôle', type: 'select', required: true, options: ROLE_OPTS, col: 6 },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['Actif', 'Inactif']), default: 'Actif', col: 6 },
      { name: 'envoyer_invitation', label: 'Envoyer un e-mail d\'activation (l\'utilisateur choisira son mot de passe)', type: 'checkbox', default: true, col: 12 },
    ],
    validate: (d, row) => {
      const errs = [];
      if (db.all('users').some((u) => u.username.toLowerCase() === d.username.toLowerCase() && (!row || u.id !== row.id))) errs.push('Cet identifiant est déjà utilisé.');
      if (db.all('users').some((u) => u.email.toLowerCase() === d.email.toLowerCase() && (!row || u.id !== row.id))) errs.push('Cet e-mail est déjà utilisé.');
      if (row && row.role === 'admin' && d.role !== 'admin' && db.where('users', (u) => u.role === 'admin' && u.statut === 'Actif').length <= 1) errs.push('Impossible de retirer le rôle du dernier administrateur actif.');
      return errs;
    },
    beforeSave: (d, row) => {
      if (row && row.role !== d.role) log(row, `Rôle « ${C360.ROLES[d.role].label} » attribué à ${row.username}`);
      if (!row) setTimeout(() => ui.toast(d.envoyer_invitation ? `Invitation envoyée à ${d.email}.` : 'Compte créé.', 'info'), 300);
      const out = Object.assign({}, d);
      delete out.envoyer_invitation;
      if (!row) out.derniere_connexion = null;
      return out;
    },
    canDelete: (u) => (u.role === 'admin' && db.where('users', (x) => x.role === 'admin').length <= 1 ? 'Impossible de supprimer le dernier administrateur.' : null),
    onChange: renderStats,
  });

  document.getElementById('crud').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-toggle-user]');
    if (t) {
      const u = db.get('users', t.dataset.toggleUser);
      const activer = u.statut !== 'Actif';
      if (!activer && u.role === 'admin' && db.where('users', (x) => x.role === 'admin' && x.statut === 'Actif').length <= 1) { ui.toast('Impossible de désactiver le dernier administrateur actif.', 'warning'); return; }
      if (!(await ui.confirm(activer ? `${u.prenom} ${u.nom} pourra de nouveau se connecter.` : `${u.prenom} ${u.nom} ne pourra plus se connecter. Ses données sont conservées.`, { title: activer ? 'Activer le compte ?' : 'Désactiver le compte ?', okLabel: activer ? 'Activer' : 'Désactiver', okClass: activer ? 'btn-success' : 'btn-warning' }))) return;
      db.update('users', u.id, { statut: activer ? 'Actif' : 'Inactif' });
      log(u, activer ? 'Compte réactivé par admin' : 'Compte désactivé par admin');
      ui.toast(activer ? 'Compte activé.' : 'Compte désactivé.');
      crud.refresh(); renderStats();
      return;
    }
    const r = e.target.closest('[data-reset]');
    if (r) {
      const u = db.get('users', r.dataset.reset);
      if (!(await ui.confirm(`Un lien de réinitialisation sera envoyé à ${u.email}. Le mot de passe actuel restera valable jusqu'à son utilisation.`, { title: 'Réinitialiser le mot de passe ?', okLabel: 'Envoyer le lien' }))) return;
      log(u, 'Réinitialisation de mot de passe demandée');
      ui.toast('Lien de réinitialisation envoyé.');
    }
  });
});
