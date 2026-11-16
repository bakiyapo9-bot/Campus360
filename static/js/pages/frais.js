/* Définition des frais selon la formation (filière) et le niveau, par année académique. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, esc } = C360;
  const anneeSel = document.getElementById('fAnnee');
  ui.fillSelect(anneeSel, db.all('annees'), { label: 'libelle', selected: db.settings().annee_courante_id });

  function renderGrid() {
    const annee = Number(anneeSel.value);
    const niveaux = db.all('niveaux').slice().sort((a, b) => a.ordre - b.ordre);
    document.getElementById('gridHead').innerHTML = `<tr><th>Filière</th>${niveaux.map((n) => `<th class="text-center">${esc(n.code)}</th>`).join('')}</tr>`;
    document.getElementById('gridBody').innerHTML = db.all('filieres').map((f) => `<tr><th class="fw-semibold">${esc(f.code)} <span class="text-secondary fw-normal text-sm d-none d-md-inline">— ${esc(f.nom)}</span></th>
      ${niveaux.map((n) => {
        const fr = db.all('frais').find((x) => x.annee_id === annee && x.filiere_id === f.id && x.niveau_id === n.id);
        return `<td class="text-center text-nowrap">${fr ? `<button class="btn btn-link btn-sm text-body text-decoration-none p-0" data-edit-frais="${fr.id}"><span class="fw-semibold">${fmt.money(fr.frais_inscription + fr.frais_scolarite)}</span><div class="text-xs text-secondary">${fmt.number(fr.frais_inscription)} + ${fmt.number(fr.frais_scolarite)}</div></button>` : `<button class="btn btn-sm btn-outline-secondary" data-new-frais="${f.id}-${n.id}"><i class="bi bi-plus"></i> Définir</button>`}</td>`;
      }).join('')}</tr>`).join('');
  }

  const crud = C360.crud({
    mount: '#crud', collection: 'frais', title: 'Détail des frais', singular: 'un tarif',
    data: () => db.where('frais', (f) => f.annee_id === Number(anneeSel.value)),
    sort: (a, b) => a.filiere_id - b.filiere_id || a.niveau_id - b.niveau_id,
    pageSize: 15,
    columns: [
      { label: 'Formation', render: (f) => `<strong>${esc(labels.groupe(f.filiere_id, f.niveau_id))}</strong> <span class="text-xs text-secondary">${esc(labels.filiere(f.filiere_id))}</span>` },
      { label: 'Frais d\'inscription', class: 'text-end', render: (f) => fmt.money(f.frais_inscription) },
      { label: 'Frais de scolarité', class: 'text-end', render: (f) => fmt.money(f.frais_scolarite) },
      { label: 'Total', class: 'text-end', render: (f) => `<strong>${fmt.money(f.frais_inscription + f.frais_scolarite)}</strong>` },
      { label: 'Tranches', class: 'text-center', field: 'nb_tranches' },
    ],
    fields: [
      { name: 'annee_id', label: 'Année académique', type: 'select', numeric: true, required: true, options: C360.options.from('annees', 'libelle'), col: 4, default: () => anneeSel.value },
      { name: 'filiere_id', label: 'Filière', type: 'select', numeric: true, required: true, options: C360.options.from('filieres'), col: 4 },
      { name: 'niveau_id', label: 'Niveau', type: 'select', numeric: true, required: true, options: C360.options.from('niveaux'), col: 4 },
      { name: 'frais_inscription', label: 'Frais d\'inscription (FCFA)', type: 'number', required: true, min: 0, step: 500, col: 6 },
      { name: 'frais_scolarite', label: 'Frais de scolarité (FCFA)', type: 'number', required: true, min: 0, step: 500, col: 6 },
      { name: 'nb_tranches', label: 'Nombre de tranches autorisées', type: 'number', required: true, min: 1, max: 12, default: 3, col: 6 },
    ],
    validate: (d, row) => (db.all('frais').some((f) => f.annee_id === d.annee_id && f.filiere_id === d.filiere_id && f.niveau_id === d.niveau_id && (!row || f.id !== row.id))
      ? ['Un tarif existe déjà pour cette formation et cette année. Modifiez-le plutôt que d\'en créer un second.'] : []),
    canDelete: (f) => (db.all('etudiants').some((e) => e.filiere_id === f.filiere_id && e.niveau_id === f.niveau_id && e.annee_id === f.annee_id)
      ? 'Impossible : des étudiants sont rattachés à ce tarif.' : null),
    onChange: renderGrid,
  });

  renderGrid();
  anneeSel.addEventListener('change', () => { renderGrid(); crud.refresh(); });
  document.getElementById('gridBody').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit-frais]');
    if (ed) { crud.open(db.get('frais', ed.dataset.editFrais)); return; }
    const nw = e.target.closest('[data-new-frais]');
    if (nw) {
      const [f, n] = nw.dataset.newFrais.split('-');
      crud.open(null, { filiere_id: f, niveau_id: n });
    }
  });
});
