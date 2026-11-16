/* Liste et gestion des enseignants. */
C360.page(function () {
  'use strict';
  const { db, ui, esc } = C360;
  const charge = (id) => db.where('seances', (s) => s.enseignant_id === id).reduce((sum, s) => {
    const [h1, m1] = s.debut.split(':').map(Number); const [h2, m2] = s.fin.split(':').map(Number);
    return sum + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
  }, 0);

  const renderStats = () => {
    const all = db.all('enseignants');
    const s = [
      ['Enseignants actifs', all.filter((e) => e.statut === 'Actif').length, 'person-badge', 'soft-primary'],
      ['Permanents', all.filter((e) => e.statut_contrat === 'Permanent').length, 'briefcase', 'soft-teal'],
      ['Vacataires', all.filter((e) => e.statut_contrat === 'Vacataire').length, 'person-workspace', 'soft-warning'],
      ['Matières sans enseignant', db.where('matieres', (m) => !m.enseignant_id).length, 'exclamation-circle', 'soft-danger'],
    ];
    document.getElementById('stats').innerHTML = s.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  };
  renderStats();

  const crud = C360.crud({
    mount: '#crud', collection: 'enseignants', title: 'Corps enseignant', singular: 'un enseignant', search: ['nom', 'prenom', 'matricule', 'specialite'], modalSize: 'modal-lg',
    sort: (a, b) => a.nom.localeCompare(b.nom),
    columns: [
      { label: 'Enseignant', render: (e) => `<a href="fiche.html?id=${e.id}" class="d-flex align-items-center gap-2 text-decoration-none text-body">${ui.avatar(`${e.prenom} ${e.nom}`)}<div><div class="fw-semibold">${esc(e.civilite)} ${esc(e.prenom)} ${esc(e.nom)}</div><div class="text-xs text-secondary">${esc(e.matricule)} · ${esc(e.grade)}</div></div></a>` },
      { label: 'Spécialité', field: 'specialite' },
      { label: 'Faculté', render: (e) => `<span class="text-sm">${esc(db.get('facultes', e.faculte_id)?.code || '—')}</span>` },
      { label: 'Contrat', render: (e) => `<span class="badge text-bg-${e.statut_contrat === 'Permanent' ? 'primary' : 'light border'}">${esc(e.statut_contrat)}</span>` },
      { label: 'Cours', class: 'text-center', render: (e) => db.where('matieres', (m) => m.enseignant_id === e.id).length },
      { label: 'Charge hebdo.', class: 'text-center', render: (e) => `${charge(e.id)} h` },
      { label: 'Statut', render: (e) => ui.badge(e.statut) },
    ],
    extraActions: (e) => `<a class="btn btn-sm btn-light" href="fiche.html?id=${e.id}" title="Fiche" aria-label="Fiche"><i class="bi bi-eye"></i></a> `,
    fields: [
      { name: 'civilite', label: 'Civilité', type: 'select', required: true, options: C360.options.list(['M.', 'Mme', 'Dr.', 'Pr.', 'Me']), col: 2 },
      { name: 'nom', label: 'Nom', required: true, col: 5 },
      { name: 'prenom', label: 'Prénom(s)', required: true, col: 5 },
      { name: 'matricule', label: 'Matricule', required: true, col: 4, default: () => `ENS-${String(db.nextId('enseignants')).padStart(3, '0')}` },
      { name: 'email', label: 'E-mail', type: 'email', required: true, col: 4 },
      { name: 'telephone', label: 'Téléphone', type: 'tel', required: true, pattern: '[+0-9 ]{8,20}', col: 4 },
      { name: 'specialite', label: 'Spécialité', required: true, col: 6 },
      { name: 'grade', label: 'Grade', type: 'select', required: true, options: C360.options.list(['Assistant', 'Assistante', 'Maître-assistant', 'Maître-assistante', 'Maître de conférences', 'Professeur titulaire']), col: 6 },
      { name: 'faculte_id', label: 'Faculté / département', type: 'select', numeric: true, required: true, options: C360.options.from('facultes'), col: 6 },
      { name: 'statut_contrat', label: 'Type de contrat', type: 'select', required: true, options: C360.options.list(['Permanent', 'Vacataire']), col: 3 },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['Actif', 'Inactif']), col: 3, default: 'Actif' },
    ],
    validate: (d, row) => {
      const errs = [];
      if (db.all('enseignants').some((e) => e.matricule === d.matricule && (!row || e.id !== row.id))) errs.push('Ce matricule est déjà attribué.');
      if (db.all('enseignants').some((e) => e.email.toLowerCase() === d.email.toLowerCase() && (!row || e.id !== row.id))) errs.push('Cet e-mail est déjà utilisé.');
      return errs;
    },
    canDelete: (e) => (db.all('matieres').some((m) => m.enseignant_id === e.id) || db.all('seances').some((s) => s.enseignant_id === e.id)
      ? 'Impossible : cet enseignant a des cours affectés. Passez-le plutôt en « Inactif ».' : null),
    onChange: renderStats,
  });

  document.getElementById('btnExport').addEventListener('click', () => {
    C360.exporter.csv('enseignants', ['Matricule', 'Civilité', 'Nom', 'Prénom', 'Spécialité', 'Grade', 'Contrat', 'E-mail', 'Téléphone', 'Statut'],
      crud.table.lastRows.map((e) => [e.matricule, e.civilite, e.nom, e.prenom, e.specialite, e.grade, e.statut_contrat, e.email, e.telephone, e.statut]));
  });
});
