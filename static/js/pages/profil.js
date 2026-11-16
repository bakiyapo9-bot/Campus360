/* Profil de l'utilisateur connecté : modification des informations, changement de mot de passe. */
C360.page(function () {
  'use strict';
  const { db, ui, esc } = C360;
  const session = C360.session.user();
  // En démo : on retrouve le compte correspondant au rôle simulé
  const user = db.all('users').find((u) => u.role === session.role && u.statut === 'Actif') || db.all('users')[0];

  function renderCard() {
    document.getElementById('profileCard').innerHTML = `${ui.avatar(`${user.prenom} ${user.nom}`, 'xl')}
      <h2 class="h5 fw-bold mt-3 mb-0">${esc(user.prenom)} ${esc(user.nom)}</h2>
      <div class="text-secondary text-sm">${esc(C360.ROLES[user.role].label)}</div>
      <div class="text-sm mt-2"><i class="bi bi-person-badge me-1"></i><span class="font-monospace">${esc(user.username)}</span></div>
      <div class="text-sm"><i class="bi bi-envelope me-1"></i>${esc(user.email)}</div>`;
  }
  const f = document.getElementById('profileForm');
  f.prenom.value = user.prenom; f.nom.value = user.nom; f.email.value = user.email; f.telephone.value = user.telephone || '';
  renderCard();

  const logs = db.where('connexions', (c) => c.user_id === user.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  document.getElementById('myLogins').innerHTML = logs.map((c) => `<li class="list-group-item"><div class="text-sm fw-medium">${esc(c.evenement)}</div><div class="text-xs text-secondary">${esc(c.date)} · ${esc(c.ip)} · ${esc(c.navigateur)}</div></li>`).join('')
    || '<li class="list-group-item text-sm text-secondary">Aucune activité récente.</li>';

  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const used = db.all('users').some((u) => u.id !== user.id && u.email.toLowerCase() === f.email.value.trim().toLowerCase());
    f.email.setCustomValidity(used ? 'used' : '');
    if (used) ui.toast('Cet e-mail est déjà utilisé par un autre compte.', 'danger');
    if (!ui.validate(f)) return;
    const d = ui.formData(f);
    db.update('users', user.id, { prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone });
    renderCard();
    ui.toast('Profil mis à jour.');
  });

  C360.passwordStrength('#new_password1', '#strengthBar', '#strengthText');
  const p = document.getElementById('pwdForm');
  p.addEventListener('submit', (e) => {
    e.preventDefault();
    p.new_password2.setCustomValidity(p.new_password2.value !== p.new_password1.value ? 'mismatch' : '');
    if (!ui.validate(p)) return;
    if (p.old_password.value === p.new_password1.value) { ui.toast('Le nouveau mot de passe doit être différent de l\'actuel.', 'warning'); return; }
    db.insert('connexions', { user_id: user.id, date: new Date().toISOString().slice(0, 16).replace('T', ' '), ip: '—', navigateur: navigator.userAgent.slice(0, 40), evenement: 'Mot de passe modifié', niveau: 'warning' });
    p.reset(); p.classList.remove('was-validated');
    ui.toast('Mot de passe mis à jour.');
  });

  if (window.location.hash === '#securite') document.getElementById('old_password').focus();
});
