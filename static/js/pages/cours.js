/* UE et matières : coefficients, crédits, volumes horaires, enseignants. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, esc } = C360;
  ui.fillSelect('#fFiliere', db.all('filieres'), { placeholder: 'Toutes les filières' });
  ui.fillSelect('#fNiveau', db.all('niveaux'), { label: 'code', placeholder: 'Tous les niveaux' });
  ui.fillSelect('#fSemestre', db.all('semestres'), { label: 'libelle', placeholder: 'Tous les semestres' });

  const ueMatch = (u) => {
    const f = document.getElementById('fFiliere').value;
    const n = document.getElementById('fNiveau').value;
    const s = document.getElementById('fSemestre').value;
    return (!f || u.filiere_id === Number(f)) && (!n || u.niveau_id === Number(n)) && (!s || u.semestre_id === Number(s));
  };

  const ues = C360.crud({
    mount: '#ues', collection: 'ues', title: 'Unités d\'enseignement (UE)', singular: 'une UE', search: ['code', 'intitule'],
    data: () => db.all('ues').filter(ueMatch),
    columns: [
      { label: 'Code', render: (u) => `<span class="font-monospace text-sm">${esc(u.code)}</span>` },
      { label: 'Intitulé', render: (u) => `<strong>${esc(u.intitule)}</strong>` },
      { label: 'Formation', render: (u) => esc(labels.groupe(u.filiere_id, u.niveau_id)) },
      { label: 'Semestre', render: (u) => esc((db.get('semestres', u.semestre_id) || {}).libelle || '—') },
      { label: 'Crédits ECTS', class: 'text-center', render: (u) => {
        const somme = db.where('matieres', (m) => m.ue_id === u.id).reduce((s, m) => s + m.credits, 0);
        return `${u.credits}${somme !== u.credits ? ` <i class="bi bi-exclamation-triangle text-warning" title="Somme des crédits des matières : ${somme}"></i>` : ''}`;
      } },
      { label: 'Matières', class: 'text-center', render: (u) => db.where('matieres', (m) => m.ue_id === u.id).length },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, col: 4 },
      { name: 'intitule', label: 'Intitulé', required: true, col: 8 },
      { name: 'filiere_id', label: 'Filière', type: 'select', numeric: true, required: true, options: C360.options.from('filieres'), col: 6 },
      { name: 'niveau_id', label: 'Niveau', type: 'select', numeric: true, required: true, options: C360.options.from('niveaux'), col: 6 },
      { name: 'semestre_id', label: 'Semestre', type: 'select', numeric: true, required: true, options: C360.options.from('semestres', 'libelle'), col: 6 },
      { name: 'credits', label: 'Crédits', type: 'number', required: true, min: 1, max: 60, col: 6 },
    ],
    validate: (d, row) => (db.all('ues').some((u) => u.code === d.code && (!row || u.id !== row.id)) ? ['Ce code d\'UE existe déjà.'] : []),
    canDelete: (u) => (db.all('matieres').some((m) => m.ue_id === u.id) ? 'Supprimez d\'abord les matières de cette UE.' : null),
    onChange: () => mats.refresh(),
  });

  const mats = C360.crud({
    mount: '#matieres', collection: 'matieres', title: 'Matières', singular: 'une matière', search: ['code', 'intitule'], modalSize: 'modal-lg',
    data: () => db.all('matieres').filter((m) => { const u = db.get('ues', m.ue_id); return u && ueMatch(u); }),
    columns: [
      { label: 'Code', render: (m) => `<span class="font-monospace text-sm">${esc(m.code)}</span>` },
      { label: 'Matière', render: (m) => `<div class="fw-semibold">${esc(m.intitule)}</div><div class="text-xs text-secondary">${esc(db.get('ues', m.ue_id).code)}</div>` },
      { label: 'Coef.', class: 'text-center', field: 'coefficient' },
      { label: 'Crédits', class: 'text-center', field: 'credits' },
      { label: 'Volume (CM/TD/TP)', render: (m) => `<span class="text-nowrap">${m.volume_cm} / ${m.volume_td} / ${m.volume_tp} h</span> <span class="text-xs text-secondary">(${m.volume_cm + m.volume_td + m.volume_tp} h)</span>` },
      { label: 'Enseignant', render: (m) => (m.enseignant_id ? `<a href="../enseignants/fiche.html?id=${m.enseignant_id}">${esc(labels.enseignant(m.enseignant_id))}</a>` : '<span class="text-warning">Non affecté</span>') },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, col: 4 },
      { name: 'intitule', label: 'Intitulé', required: true, col: 8 },
      { name: 'ue_id', label: 'Unité d\'enseignement', type: 'select', numeric: true, required: true, options: C360.options.from('ues', (u) => `${u.code} — ${u.intitule}`), col: 8 },
      { name: 'enseignant_id', label: 'Enseignant responsable', type: 'select', numeric: true, options: C360.options.from('enseignants', (e) => `${e.civilite} ${e.prenom} ${e.nom} (${e.specialite})`, (e) => e.statut === 'Actif'), col: 4 },
      { name: 'coefficient', label: 'Coefficient', type: 'number', required: true, min: 0.5, max: 10, step: 0.5, col: 3 },
      { name: 'credits', label: 'Crédits', type: 'number', required: true, min: 1, max: 30, col: 3 },
      { name: 'volume_cm', label: 'Heures CM', type: 'number', required: true, min: 0, max: 200, default: 0, col: 2 },
      { name: 'volume_td', label: 'Heures TD', type: 'number', required: true, min: 0, max: 200, default: 0, col: 2 },
      { name: 'volume_tp', label: 'Heures TP', type: 'number', required: true, min: 0, max: 200, default: 0, col: 2 },
    ],
    validate: (d, row) => {
      const errs = [];
      if (db.all('matieres').some((m) => m.code === d.code && (!row || m.id !== row.id))) errs.push('Ce code de matière existe déjà.');
      if ((d.volume_cm || 0) + (d.volume_td || 0) + (d.volume_tp || 0) === 0) errs.push('Le volume horaire total doit être supérieur à 0.');
      return errs;
    },
    canDelete: (m) => (db.all('evaluations').some((e) => e.matiere_id === m.id) ? 'Impossible : des évaluations existent pour cette matière.' : null),
    onChange: () => ues.refresh(),
  });

  ['#fFiliere', '#fNiveau', '#fSemestre'].forEach((s) => document.querySelector(s).addEventListener('change', () => { ues.refresh(); mats.refresh(); }));
});
