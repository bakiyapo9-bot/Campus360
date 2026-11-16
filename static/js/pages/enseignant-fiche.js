/* Fiche enseignant : cours affectés, emploi du temps, classes, disponibilités. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, esc } = C360;
  const ens = db.get('enseignants', Number(C360.param('id')) || 1);
  if (!ens) { document.querySelector('.app-content').innerHTML = '<div class="alert alert-warning">Enseignant introuvable.</div>'; return; }

  document.getElementById('header').innerHTML = `<div class="card mb-3"><div class="card-body d-flex flex-wrap align-items-center gap-3">
    ${ui.avatar(`${ens.prenom} ${ens.nom}`, 'lg')}
    <div class="flex-grow-1"><div class="d-flex align-items-center gap-2"><h2 class="h4 fw-bold mb-0">${esc(ens.civilite)} ${esc(ens.prenom)} ${esc(ens.nom)}</h2>${ui.badge(ens.statut)}</div>
      <div class="text-secondary">${esc(ens.matricule)} · ${esc(ens.grade)} · ${esc(ens.statut_contrat)}</div>
      <div class="mt-2 d-flex flex-wrap gap-3 text-sm"><span><i class="bi bi-mortarboard me-1"></i>${esc(ens.specialite)}</span><span><i class="bi bi-building me-1"></i>${esc(labels.faculte(ens.faculte_id))}</span><span><i class="bi bi-envelope me-1"></i>${esc(ens.email)}</span><span><i class="bi bi-telephone me-1"></i>${esc(ens.telephone)}</span></div>
    </div></div></div>`;

  function renderCours() {
    const mats = db.where('matieres', (m) => m.enseignant_id === ens.id);
    document.getElementById('coursBody').innerHTML = mats.map((m) => { const u = db.get('ues', m.ue_id); return `<tr>
      <td class="font-monospace text-sm">${esc(m.code)}</td><td class="fw-semibold">${esc(m.intitule)}</td><td>${esc(labels.groupe(u.filiere_id, u.niveau_id))}</td>
      <td class="text-center">${m.coefficient}</td><td>${m.volume_cm + m.volume_td + m.volume_tp} h</td>
      <td class="text-end"><button class="btn btn-sm btn-light text-danger" data-unassign="${m.id}" title="Retirer l'affectation"><i class="bi bi-x-lg"></i></button></td></tr>`; }).join('') || ui.empty(6, 'Aucun cours affecté');
    ui.fillSelect('#assignMatiere', db.where('matieres', (m) => m.enseignant_id !== ens.id), { label: (m) => `${m.code} — ${m.intitule}${m.enseignant_id ? ` (actuellement : ${labels.enseignant(m.enseignant_id)})` : ' (non affectée)'}`, placeholder: 'Choisir une matière…' });
  }

  function renderClasses() {
    const groupes = {};
    db.where('seances', (s) => s.enseignant_id === ens.id).forEach((s) => {
      const k = `${s.filiere_id}-${s.niveau_id}`;
      groupes[k] = groupes[k] || { filiere_id: s.filiere_id, niveau_id: s.niveau_id, matieres: new Set() };
      groupes[k].matieres.add(labels.matiere(s.matiere_id));
    });
    document.getElementById('classes').innerHTML = Object.values(groupes).map((g) => {
      const eff = db.where('etudiants', (e) => e.statut === 'Actif' && e.filiere_id === g.filiere_id && e.niveau_id === g.niveau_id).length;
      return `<div class="col-md-6 col-xl-4"><div class="border rounded-3 p-3 h-100"><div class="d-flex justify-content-between"><h6 class="fw-bold mb-1">${esc(labels.groupe(g.filiere_id, g.niveau_id))}</h6><span class="badge text-bg-primary">${eff} étudiants</span></div>
        <div class="text-sm text-secondary mb-2">${esc(labels.filiere(g.filiere_id))}</div><div class="text-sm">${[...g.matieres].map((m) => `<span class="badge text-bg-light border me-1 mb-1">${esc(m)}</span>`).join('')}</div>
        <div class="mt-2 d-flex gap-2"><a class="btn btn-sm btn-light" href="../presences/appel.html">Faire l'appel</a><a class="btn btn-sm btn-light" href="../notes/saisie.html">Saisir les notes</a></div></div></div>`;
    }).join('') || '<div class="col-12"><div class="empty-state"><i class="bi bi-people"></i>Aucune classe planifiée</div></div>';
  }

  function renderDispo() {
    const list = db.where('disponibilites', (d) => d.enseignant_id === ens.id).sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut));
    document.getElementById('dispoList').innerHTML = list.map((d) => `<li class="list-group-item d-flex align-items-center"><i class="bi bi-calendar-check text-success me-2"></i><strong class="me-2">${labels.jour(d.jour)}</strong>${d.debut} – ${d.fin}<button class="btn btn-sm btn-light text-danger ms-auto" data-dispo-del="${d.id}" aria-label="Supprimer"><i class="bi bi-trash"></i></button></li>`).join('') || '<li class="list-group-item text-secondary">Aucune disponibilité déclarée.</li>';
  }

  renderCours(); renderClasses(); renderDispo();
  C360.timetable.render('#edt', db.where('seances', (s) => s.enseignant_id === ens.id));

  document.getElementById('assignForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!ui.validate(f)) return;
    db.update('matieres', Number(f.assignMatiere.value), { enseignant_id: ens.id });
    f.classList.remove('was-validated');
    ui.toast('Matière affectée.'); renderCours();
  });
  document.getElementById('coursBody').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-unassign]');
    if (!b) return;
    if (!(await ui.confirm('La matière n\'aura plus d\'enseignant responsable.', { title: 'Retirer l\'affectation ?', okLabel: 'Retirer', okClass: 'btn-danger' }))) return;
    db.update('matieres', Number(b.dataset.unassign), { enseignant_id: null });
    renderCours();
  });

  document.getElementById('dispoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!ui.validate(f)) return;
    if (f.dFin.value <= f.dDebut.value) { ui.toast('L\'heure de fin doit être après l\'heure de début.', 'danger'); return; }
    const jour = Number(f.dJour.value);
    const overlap = db.all('disponibilites').some((d) => d.enseignant_id === ens.id && d.jour === jour && d.debut < f.dFin.value && f.dDebut.value < d.fin);
    if (overlap) { ui.toast('Ce créneau chevauche une disponibilité existante.', 'warning'); return; }
    db.insert('disponibilites', { enseignant_id: ens.id, jour, debut: f.dDebut.value, fin: f.dFin.value });
    f.classList.remove('was-validated');
    renderDispo();
  });
  document.getElementById('dispoList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dispo-del]');
    if (b) { db.remove('disponibilites', b.dataset.dispoDel); renderDispo(); }
  });

  // Re-calcul de la largeur de l'emploi du temps quand l'onglet devient visible
  document.querySelector('[data-bs-target="#t-edt"]').addEventListener('shown.bs.tab', () => C360.timetable.render('#edt', db.where('seances', (s) => s.enseignant_id === ens.id)));
});
