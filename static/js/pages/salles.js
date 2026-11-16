/* Gestion des salles : capacité, type, équipements, taux d'occupation. */
C360.page(function () {
  'use strict';
  const { db, ui, esc } = C360;
  const SEMAINE_MIN = 6 * (19 * 60 - (7 * 60 + 30)); // créneau ouvrable hebdomadaire
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const occupation = (id) => Math.round((db.where('seances', (s) => s.salle_id === id).reduce((sum, s) => sum + toMin(s.fin) - toMin(s.debut), 0) / SEMAINE_MIN) * 100);

  const renderStats = () => {
    const all = db.all('salles');
    const s = [
      ['Salles', all.length, 'door-open', 'soft-primary'],
      ['Capacité totale', C360.fmt.number(all.reduce((t, x) => t + x.capacite, 0)), 'people', 'soft-teal'],
      ['Disponibles', all.filter((x) => x.statut === 'Disponible').length, 'check-circle', 'soft-success'],
      ['En maintenance', all.filter((x) => x.statut !== 'Disponible').length, 'tools', 'soft-warning'],
    ];
    document.getElementById('stats').innerHTML = s.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  };
  renderStats();

  C360.crud({
    mount: '#crud', collection: 'salles', title: 'Liste des salles', singular: 'une salle', search: ['code', 'nom', 'batiment'],
    columns: [
      { label: 'Code', render: (s) => `<span class="badge text-bg-light border font-monospace">${esc(s.code)}</span>` },
      { label: 'Nom', render: (s) => `<strong>${esc(s.nom)}</strong><div class="text-xs text-secondary">${esc(s.batiment)}</div>` },
      { label: 'Type', field: 'type' },
      { label: 'Capacité', class: 'text-center', render: (s) => `${s.capacite} places` },
      { label: 'Équipements', render: (s) => `<span class="text-sm">${esc(s.equipements || '—')}</span>` },
      { label: 'Occupation hebdo.', render: (s) => `<div style="min-width:110px">${ui.progress(occupation(s.id), 'primary')}</div>` },
      { label: 'Statut', render: (s) => ui.badge(s.statut) },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, maxlength: 10, col: 4 },
      { name: 'nom', label: 'Nom', required: true, col: 8 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: C360.options.list(['Amphithéâtre', 'Salle de cours', 'Salle de TD', 'Laboratoire']), col: 6 },
      { name: 'capacite', label: 'Capacité (places)', type: 'number', required: true, min: 1, max: 2000, col: 6 },
      { name: 'batiment', label: 'Bâtiment', required: true, col: 6 },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['Disponible', 'En maintenance', 'Hors service']), col: 6, default: 'Disponible' },
      { name: 'equipements', label: 'Équipements', type: 'textarea', col: 12 },
    ],
    beforeSave: (d) => Object.assign(d, { code: d.code.toUpperCase() }),
    validate: (d, row) => (db.all('salles').some((s) => s.code.toUpperCase() === d.code.toUpperCase() && (!row || s.id !== row.id)) ? ['Ce code de salle existe déjà.'] : []),
    canDelete: (s) => (db.all('seances').some((x) => x.salle_id === s.id) ? 'Impossible : des séances sont planifiées dans cette salle.' : null),
    onChange: renderStats,
  });
});
