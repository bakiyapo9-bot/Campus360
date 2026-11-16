/* Référentiels académiques : années, semestres, facultés, filières, niveaux. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, esc } = C360;
  const used = (collection, field, id) => db.all(collection).some((x) => x[field] === id);

  C360.crud({
    mount: '#p-annees', collection: 'annees', title: 'Années académiques', singular: 'une année académique',
    columns: [
      { label: 'Libellé', render: (a) => `<strong>${esc(a.libelle)}</strong>` },
      { label: 'Début', render: (a) => fmt.date(a.date_debut) },
      { label: 'Fin', render: (a) => fmt.date(a.date_fin) },
      { label: 'Inscriptions', render: (a) => db.where('inscriptions', (i) => i.annee_id === a.id).length },
      { label: 'Statut', render: (a) => ui.badge(a.statut) },
    ],
    fields: [
      { name: 'libelle', label: 'Libellé', required: true, pattern: '\\d{4}-\\d{4}', placeholder: '2027-2028', col: 6, invalid: 'Format attendu : AAAA-AAAA' },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['À venir', 'En cours', 'Clôturée']), col: 6 },
      { name: 'date_debut', label: 'Date de début', type: 'date', required: true, col: 6 },
      { name: 'date_fin', label: 'Date de fin', type: 'date', required: true, col: 6 },
    ],
    sort: (a, b) => b.libelle.localeCompare(a.libelle),
    validate(d, row) {
      const errs = [];
      if (d.date_fin && d.date_debut && d.date_fin <= d.date_debut) errs.push('La date de fin doit être postérieure à la date de début.');
      if (db.all('annees').some((a) => a.libelle === d.libelle && (!row || a.id !== row.id))) errs.push('Cette année académique existe déjà.');
      if (d.statut === 'En cours' && db.all('annees').some((a) => a.statut === 'En cours' && (!row || a.id !== row.id))) errs.push('Une seule année peut être « En cours ». Clôturez d\'abord l\'année actuelle.');
      return errs;
    },
    canDelete: (a) => (used('inscriptions', 'annee_id', a.id) ? 'Impossible : des inscriptions sont rattachées à cette année.' : null),
  });

  C360.crud({
    mount: '#p-semestres', collection: 'semestres', title: 'Périodes & semestres', singular: 'un semestre',
    columns: [
      { label: 'Libellé', render: (s) => `<strong>${esc(s.libelle)}</strong>` },
      { label: 'Année', render: (s) => esc(labels.annee(s.annee_id)) },
      { label: 'Début', render: (s) => fmt.date(s.date_debut) },
      { label: 'Fin', render: (s) => fmt.date(s.date_fin) },
      { label: 'Statut', render: (s) => ui.badge(s.statut) },
    ],
    fields: [
      { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Semestre 1', col: 6 },
      { name: 'annee_id', label: 'Année académique', type: 'select', numeric: true, required: true, options: C360.options.from('annees', 'libelle'), col: 6 },
      { name: 'date_debut', label: 'Début', type: 'date', required: true, col: 4 },
      { name: 'date_fin', label: 'Fin', type: 'date', required: true, col: 4 },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['À venir', 'En cours', 'Clôturée']), col: 4 },
    ],
    validate(d) {
      const errs = [];
      if (d.date_fin <= d.date_debut) errs.push('La date de fin doit être postérieure à la date de début.');
      const a = db.get('annees', d.annee_id);
      if (a && (d.date_debut < a.date_debut || d.date_fin > a.date_fin)) errs.push(`Le semestre doit être compris dans l'année ${a.libelle} (${fmt.date(a.date_debut)} – ${fmt.date(a.date_fin)}).`);
      return errs;
    },
    canDelete: (s) => (used('ues', 'semestre_id', s.id) ? 'Impossible : des UE sont rattachées à ce semestre.' : null),
  });

  C360.crud({
    mount: '#p-facultes', collection: 'facultes', title: 'Facultés / départements', singular: 'une faculté', search: ['code', 'nom'],
    columns: [
      { label: 'Code', render: (f) => `<span class="badge text-bg-light border font-monospace">${esc(f.code)}</span>` },
      { label: 'Nom', field: 'nom' },
      { label: 'Responsable', field: 'responsable' },
      { label: 'Filières', render: (f) => db.where('filieres', (x) => x.faculte_id === f.id).length },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, maxlength: 10, col: 4 },
      { name: 'nom', label: 'Nom', required: true, col: 8 },
      { name: 'responsable', label: 'Doyen / responsable', col: 12 },
    ],
    beforeSave: (d) => Object.assign(d, { code: d.code.toUpperCase() }),
    validate: (d, row) => (db.all('facultes').some((f) => f.code.toUpperCase() === d.code.toUpperCase() && (!row || f.id !== row.id)) ? ['Ce code est déjà utilisé.'] : []),
    canDelete: (f) => (used('filieres', 'faculte_id', f.id) ? 'Impossible : des filières sont rattachées à cette faculté.' : null),
  });

  C360.crud({
    mount: '#p-filieres', collection: 'filieres', title: 'Filières', singular: 'une filière', search: ['code', 'nom'],
    columns: [
      { label: 'Code', render: (f) => `<span class="badge text-bg-light border font-monospace">${esc(f.code)}</span>` },
      { label: 'Intitulé', field: 'nom' },
      { label: 'Faculté', render: (f) => esc(labels.faculte(f.faculte_id)) },
      { label: 'Étudiants actifs', render: (f) => `<a href="../etudiants/liste.html?filiere=${f.id}">${db.where('etudiants', (e) => e.filiere_id === f.id && e.statut === 'Actif').length}</a>` },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, maxlength: 10, col: 4 },
      { name: 'nom', label: 'Intitulé', required: true, col: 8 },
      { name: 'faculte_id', label: 'Faculté / département', type: 'select', numeric: true, required: true, options: C360.options.from('facultes'), col: 12 },
    ],
    beforeSave: (d) => Object.assign(d, { code: d.code.toUpperCase() }),
    validate: (d, row) => (db.all('filieres').some((f) => f.code.toUpperCase() === d.code.toUpperCase() && (!row || f.id !== row.id)) ? ['Ce code est déjà utilisé.'] : []),
    canDelete: (f) => (used('etudiants', 'filiere_id', f.id) ? 'Impossible : des étudiants sont inscrits dans cette filière.' : null),
  });

  C360.crud({
    mount: '#p-niveaux', collection: 'niveaux', title: 'Niveaux', singular: 'un niveau',
    columns: [
      { label: 'Ordre', field: 'ordre' },
      { label: 'Code', render: (n) => `<span class="badge text-bg-light border font-monospace">${esc(n.code)}</span>` },
      { label: 'Intitulé', field: 'nom' },
      { label: 'Étudiants actifs', render: (n) => db.where('etudiants', (e) => e.niveau_id === n.id && e.statut === 'Actif').length },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, maxlength: 6, col: 4 },
      { name: 'nom', label: 'Intitulé', required: true, col: 5 },
      { name: 'ordre', label: 'Ordre', type: 'number', required: true, min: 1, max: 20, col: 3 },
    ],
    sort: (a, b) => a.ordre - b.ordre,
    canDelete: (n) => (used('etudiants', 'niveau_id', n.id) ? 'Impossible : des étudiants sont inscrits à ce niveau.' : null),
  });
});
