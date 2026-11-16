/* Suivi des présences : statistiques, étudiants au-delà du seuil, justification des absences. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, rules, esc } = C360;
  const role = C360.session.role();
  const seuil = db.settings().seuil_absences;
  document.getElementById('seuilVal').textContent = seuil;
  if (C360.param('alerte')) document.getElementById('fSeuil').checked = true;

  // Un enseignant ne voit que les étudiants de ses séances
  const seancesVisibles = db.where('seances', (s) => role !== 'enseignant' || s.enseignant_id === C360.ROLES.enseignant.enseignant_id);
  const groupesVisibles = new Map(seancesVisibles.map((s) => [`${s.filiere_id}-${s.niveau_id}`, { value: `${s.filiere_id}-${s.niveau_id}`, label: labels.groupe(s.filiere_id, s.niveau_id) }]));
  ui.fillSelect('#fGroupe', [...groupesVisibles.values()], { value: 'value', label: 'label', placeholder: 'Tous les groupes' });
  const seanceIds = seancesVisibles.map((s) => s.id);

  const rows = () => db.where('etudiants', (e) => e.statut === 'Actif' && groupesVisibles.has(`${e.filiere_id}-${e.niveau_id}`))
    .map((e) => Object.assign({}, e, { st: rules.statsPresence(e.id) }))
    .filter((r) => r.st.total > 0);

  function renderStats() {
    const pres = db.where('presences', (p) => seanceIds.includes(p.seance_id));
    const abs = pres.filter((p) => p.statut === 'Absent');
    const alertes = rows().filter((r) => r.st.nonJustifiees >= seuil).length;
    const cards = [
      ['Taux de présence global', `${pres.length ? Math.round((pres.filter((p) => p.statut !== 'Absent').length / pres.length) * 100) : 100} %`, 'graph-up', 'soft-success'],
      ['Absences enregistrées', abs.length, 'x-circle', 'soft-danger'],
      ['Retards', pres.filter((p) => p.statut === 'Retard').length, 'clock', 'soft-warning'],
      ['Étudiants en alerte', alertes, 'exclamation-triangle', 'soft-danger'],
    ];
    document.getElementById('stats').innerHTML = cards.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  }

  const table = new C360.DataTable({
    tbody: '#tbody', data: rows, search: '#search', searchFields: ['nom', 'prenom', 'matricule'],
    filters: [
      { el: '#fGroupe', field: (r, v) => `${r.filiere_id}-${r.niveau_id}` === v },
      { el: '#fSeuil', field: (r) => !document.getElementById('fSeuil').checked || r.st.nonJustifiees >= seuil },
    ],
    sort: (a, b) => b.st.nonJustifiees - a.st.nonJustifiees || b.st.absences - a.st.absences,
    pageSize: 15, colspan: 8,
    render: (r) => `<tr class="${r.st.nonJustifiees >= seuil ? 'table-danger' : ''}">
      <td><div class="fw-medium">${esc(r.prenom)} ${esc(r.nom)}</div><div class="text-xs text-secondary font-monospace">${esc(r.matricule)}</div></td>
      <td>${esc(labels.groupe(r.filiere_id, r.niveau_id))}</td>
      <td class="text-center">${r.st.total}</td><td class="text-center">${r.st.absences}</td>
      <td class="text-center fw-bold ${r.st.nonJustifiees >= seuil ? 'text-danger' : ''}">${r.st.nonJustifiees}</td>
      <td class="text-center">${r.st.retards}</td>
      <td style="min-width:130px">${ui.progress(r.st.taux, r.st.taux >= 90 ? 'success' : r.st.taux >= 75 ? 'warning' : 'danger')}</td>
      <td>${r.st.nonJustifiees >= seuil ? '<span class="badge text-bg-danger"><i class="bi bi-exclamation-triangle me-1"></i>Trop d\'absences</span>' : ''}</td></tr>`,
  });
  // Le filtre « seuil » est une case à cocher : on rafraîchit à chaque changement
  document.getElementById('fSeuil').addEventListener('change', () => table.refresh());

  function renderJustif() {
    const list = db.where('presences', (p) => seanceIds.includes(p.seance_id) && p.statut === 'Absent' && !p.justifiee).sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('nbJustif').textContent = list.length;
    document.getElementById('justifBody').innerHTML = list.slice(0, 100).map((p) => {
      const e = db.get('etudiants', p.etudiant_id);
      const s = db.get('seances', p.seance_id);
      return `<tr><td class="text-nowrap">${fmt.date(p.date)}</td><td>${esc(e.prenom)} ${esc(e.nom)} <span class="text-xs text-secondary font-monospace">${esc(e.matricule)}</span></td><td>${esc(labels.matiere(s.matiere_id))} <span class="text-xs text-secondary">${s.debut}</span></td><td class="text-sm">${esc(p.motif || '—')}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-success" data-justif="${p.id}"><i class="bi bi-check2 me-1"></i>Justifier</button></td></tr>`;
    }).join('') || ui.empty(5, 'Aucune absence à justifier');
  }

  document.getElementById('justifBody').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-justif]');
    if (!b) return;
    const motif = await ui.confirm('L\'absence ne sera plus comptée dans le seuil d\'alerte.', { title: 'Justifier l\'absence', okLabel: 'Justifier', okClass: 'btn-success', input: 'Motif / pièce justificative (ex. certificat médical du …)' });
    if (!motif) return;
    db.update('presences', b.dataset.justif, { justifiee: true, motif });
    ui.toast('Absence justifiée.');
    renderJustif(); renderStats(); table.refresh();
  });

  document.getElementById('btnExport').addEventListener('click', () => C360.exporter.csv('presences', ['Matricule', 'Étudiant', 'Groupe', 'Séances', 'Absences', 'Non justifiées', 'Retards', 'Taux de présence'],
    table.lastRows.map((r) => [r.matricule, `${r.prenom} ${r.nom}`, labels.groupe(r.filiere_id, r.niveau_id), r.st.total, r.st.absences, r.st.nonJustifiees, r.st.retards, `${r.st.taux}%`])));

  renderStats(); renderJustif();
});
