/* Suivi des impayés : identification, relances, exports. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, rules, esc } = C360;
  ui.fillSelect('#fFiliere', db.all('filieres'), { placeholder: 'Toutes les filières' });
  ui.fillSelect('#fNiveau', db.all('niveaux'), { label: 'code', placeholder: 'Tous les niveaux' });
  const selected = new Set();

  const rows = () => db.where('etudiants', (e) => e.statut === 'Actif').map((e) => {
    const s = rules.situationFinanciere(e.id);
    const last = db.where('paiements', (p) => p.etudiant_id === e.id && p.statut === 'Validé').sort((a, b) => b.date.localeCompare(a.date))[0];
    return Object.assign({}, e, { sit: s, dernier: last ? last.date : null });
  }).filter((r) => r.sit.reste > 0);

  function renderSummary() {
    const all = rows();
    const total = all.reduce((s, r) => s + r.sit.reste, 0);
    const zero = all.filter((r) => r.sit.verse === 0).length;
    const cards = [
      ['Étudiants concernés', all.length, 'people', 'soft-warning'], ['Montant total impayé', fmt.money(total), 'exclamation-octagon', 'soft-danger'],
      ['Aucun versement', zero, 'x-circle', 'soft-danger'], ['Reste moyen', fmt.money(all.length ? total / all.length : 0), 'calculator', 'soft-info'],
    ];
    document.getElementById('summary').innerHTML = cards.map(([l, v, i, c]) => `<div class="col-sm-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div class="min-w-0"><div class="stat-value text-truncate">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  }

  const table = new C360.DataTable({
    tbody: '#tbody',
    data: rows,
    search: '#search',
    searchFields: ['nom', 'prenom', 'matricule'],
    filters: [
      { el: '#fFiliere', field: 'filiere_id' }, { el: '#fNiveau', field: 'niveau_id' },
      { el: '#fTaux', field: (r, v) => (v === '0' ? r.sit.verse === 0 : v === '50' ? r.sit.taux < 50 : r.sit.verse > 0) },
    ],
    sort: (a, b) => b.sit.reste - a.sit.reste,
    pageSize: 15,
    colspan: 9,
    emptyText: 'Aucun impayé 🎉',
    render: (r) => `<tr>
      <td class="no-print"><input type="checkbox" class="form-check-input" data-select="${r.id}" ${selected.has(r.id) ? 'checked' : ''} aria-label="Sélectionner"></td>
      <td><a href="../etudiants/fiche.html?id=${r.id}#finances" class="fw-semibold text-body">${esc(r.prenom)} ${esc(r.nom)}</a><div class="text-xs text-secondary font-monospace">${esc(r.matricule)}</div></td>
      <td>${esc(labels.groupe(r.filiere_id, r.niveau_id))}</td>
      <td class="text-end text-nowrap">${fmt.money(r.sit.total)}</td>
      <td class="text-end text-nowrap text-success">${fmt.money(r.sit.verse)}</td>
      <td class="text-end text-nowrap fw-bold text-danger">${fmt.money(r.sit.reste)}</td>
      <td style="min-width:120px">${ui.progress(r.sit.taux)}</td>
      <td class="text-nowrap">${r.dernier ? fmt.date(r.dernier) : '<span class="text-danger">Jamais</span>'}</td>
      <td class="text-end text-nowrap no-print">
        <a class="btn btn-sm btn-primary" href="paiements.html?nouveau=1&etudiant=${r.id}" title="Encaisser"><i class="bi bi-cash-coin"></i></a>
        <button class="btn btn-sm btn-light" data-relance="${r.id}" title="Envoyer une relance"><i class="bi bi-send"></i></button>
      </td></tr>`,
  });

  document.getElementById('tbody').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-select]');
    if (!cb) return;
    const id = Number(cb.dataset.select);
    if (cb.checked) selected.add(id); else selected.delete(id);
  });
  document.getElementById('checkAll').addEventListener('change', (e) => {
    table.lastRows.forEach((r) => (e.target.checked ? selected.add(r.id) : selected.delete(r.id)));
    table.refresh();
  });

  const relancer = (ids) => {
    // Django : tâche asynchrone (Celery) d'envoi d'e-mails / SMS
    ids.forEach((id) => { const e = db.get('etudiants', id); C360.audit('Relance d\'impayé', `${e.prenom} ${e.nom} (${e.matricule}) — reste ${fmt.money(rules.situationFinanciere(id).reste)}`); });
    ui.toast(`${ids.length} relance(s) envoyée(s) par e-mail et SMS.`);
  };
  document.getElementById('tbody').addEventListener('click', (e) => { const b = e.target.closest('[data-relance]'); if (b) relancer([Number(b.dataset.relance)]); });
  document.getElementById('btnRelance').addEventListener('click', async () => {
    if (!selected.size) { ui.toast('Sélectionnez au moins un étudiant.', 'warning'); return; }
    if (await ui.confirm(`Une relance sera envoyée à ${selected.size} étudiant(s) et à leur tuteur.`, { title: 'Envoyer les relances ?', okLabel: 'Envoyer' })) { relancer([...selected]); selected.clear(); table.refresh(); }
  });

  document.getElementById('btnExport').addEventListener('click', () => C360.exporter.csv('impayes', ['Matricule', 'Étudiant', 'Filière', 'Niveau', 'Téléphone', 'Total dû', 'Versé', 'Reste', 'Taux', 'Dernier versement'],
    table.lastRows.map((r) => [r.matricule, `${r.prenom} ${r.nom}`, labels.filiere(r.filiere_id), labels.niveau(r.niveau_id), r.telephone, r.sit.total, r.sit.verse, r.sit.reste, `${r.sit.taux}%`, r.dernier ? fmt.date(r.dernier) : 'Jamais'])));
  document.getElementById('btnPrint').addEventListener('click', () => C360.exporter.pdf());
  renderSummary();
});
