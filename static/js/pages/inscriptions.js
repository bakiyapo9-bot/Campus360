/* Liste des inscriptions : vérification du dossier, validation / rejet, historique. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, rules, esc } = C360;
  const PIECES = { acte_naissance: 'Acte de naissance', diplome: 'Diplôme / relevé du BAC', photo: 'Photo d\'identité', certificat_medical: 'Certificat médical' };
  const modal = new bootstrap.Modal('#detailModal');
  // Ferme proprement la fenêtre de détail avant d'ouvrir une confirmation (évite deux modales superposées).
  const closeDetail = () => new Promise((res) => {
    const el = document.getElementById('detailModal');
    if (!el.classList.contains('show')) { res(); return; }
    el.addEventListener('hidden.bs.modal', () => res(), { once: true });
    modal.hide();
  });

  ui.fillSelect('#fAnnee', db.all('annees'), { label: 'libelle', placeholder: 'Toutes les années', selected: db.settings().annee_courante_id });
  ui.fillSelect('#fFiliere', db.all('filieres'), { placeholder: 'Toutes les filières' });
  ui.fillSelect('#fNiveau', db.all('niveaux'), { label: 'code', placeholder: 'Tous les niveaux' });
  if (C360.param('statut')) document.getElementById('fStatut').value = C360.param('statut');

  const renderSummary = () => {
    const annee = Number(document.getElementById('fAnnee').value) || null;
    const rows = db.where('inscriptions', (i) => !annee || i.annee_id === annee);
    const c = (s) => rows.filter((i) => i.statut === s).length;
    const cards = [
      ['Total', rows.length, 'journal-text', 'soft-primary'], ['En attente', c('En attente'), 'hourglass-split', 'soft-warning'],
      ['Validées', c('Validée'), 'check2-circle', 'soft-success'], ['Rejetées', c('Rejetée'), 'x-circle', 'soft-danger'],
    ];
    document.getElementById('summary').innerHTML = cards.map(([l, v, i, cls]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${cls}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  };

  const completude = (i) => { const p = Object.values(i.pieces || {}); return { ok: p.filter(Boolean).length, total: p.length }; };

  const table = new C360.DataTable({
    tbody: '#tbody',
    data: () => db.all('inscriptions'),
    search: '#search',
    searchFields: [(r) => { const e = db.get('etudiants', r.etudiant_id); return `${e.nom} ${e.prenom} ${e.matricule}`; }],
    filters: [{ el: '#fAnnee', field: 'annee_id' }, { el: '#fFiliere', field: 'filiere_id' }, { el: '#fNiveau', field: 'niveau_id' }, { el: '#fType', field: 'type' }, { el: '#fStatut', field: 'statut' }],
    sort: (a, b) => ({ 'En attente': 0, 'Validée': 1, 'Rejetée': 2 }[a.statut] - { 'En attente': 0, 'Validée': 1, 'Rejetée': 2 }[b.statut]) || b.date.localeCompare(a.date),
    colspan: 8,
    render: (i) => {
      const e = db.get('etudiants', i.etudiant_id);
      const c = completude(i);
      return `<tr>
        <td><div class="d-flex align-items-center gap-2">${ui.avatar(`${e.prenom} ${e.nom}`, null, e.photo)}<div><a href="../etudiants/fiche.html?id=${e.id}" class="fw-semibold text-body">${esc(e.prenom)} ${esc(e.nom)}</a><div class="text-xs text-secondary font-monospace">${esc(e.matricule)}</div></div></div></td>
        <td>${esc(labels.annee(i.annee_id))}</td>
        <td>${esc(labels.groupe(i.filiere_id, i.niveau_id))}${i.derogation ? ' <span class="badge text-bg-info" title="Dérogation accordée">Dérog.</span>' : ''}</td>
        <td>${esc(i.type)}</td>
        <td class="text-nowrap">${fmt.date(i.date)}</td>
        <td><span class="${c.ok === c.total ? 'text-success' : 'text-warning'}"><i class="bi bi-${c.ok === c.total ? 'check-circle' : 'exclamation-circle'} me-1"></i>${c.ok}/${c.total} pièces</span></td>
        <td>${ui.badge(i.statut)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-light" data-detail="${i.id}" title="Vérifier le dossier"><i class="bi bi-eye"></i></button>
          ${i.statut === 'En attente' ? `<button class="btn btn-sm btn-success" data-valider="${i.id}" title="Valider"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-rejeter="${i.id}" title="Rejeter"><i class="bi bi-x-lg"></i></button>` : ''}
        </td></tr>`;
    },
  });
  renderSummary();
  document.getElementById('fAnnee').addEventListener('change', renderSummary);

  function refresh() { table.refresh(); renderSummary(); }

  async function valider(id) {
    await closeDetail();
    const i = db.get('inscriptions', id);
    const c = completude(i);
    const msg = c.ok < c.total ? `Attention : le dossier est incomplet (${c.ok}/${c.total} pièces). Valider quand même ?` : 'L\'inscription sera validée et l\'étudiant pourra accéder à ses cours.';
    if (!(await ui.confirm(msg, { title: 'Valider l\'inscription ?', okLabel: 'Valider', okClass: 'btn-success' }))) return;
    db.update('inscriptions', id, { statut: 'Validée', date_validation: fmt.today() });
    const etu = db.get('etudiants', i.etudiant_id);
    if (i.annee_id === db.settings().annee_courante_id) db.update('etudiants', etu.id, { filiere_id: i.filiere_id, niveau_id: i.niveau_id, annee_id: i.annee_id, statut: 'Actif' });
    ui.toast(`Inscription de ${etu.prenom} ${etu.nom} validée.`);
    refresh();
  }

  async function rejeter(id) {
    await closeDetail();
    const motif = await ui.confirm('Le motif sera communiqué à l\'étudiant et conservé dans l\'historique.', { title: 'Rejeter l\'inscription', okLabel: 'Rejeter', okClass: 'btn-danger', input: 'Motif du rejet' });
    if (!motif) return;
    db.update('inscriptions', id, { statut: 'Rejetée', motif_rejet: motif });
    ui.toast('Inscription rejetée.', 'warning');
    refresh();
  }

  function detail(id) {
    const i = db.get('inscriptions', id);
    const e = db.get('etudiants', i.etudiant_id);
    const fr = rules.fraisPour(i.filiere_id, i.niveau_id, i.annee_id);
    const histo = db.where('inscriptions', (x) => x.etudiant_id === e.id).sort((a, b) => a.annee_id - b.annee_id);
    document.getElementById('detailTitle').textContent = `Dossier — ${e.prenom} ${e.nom}`;
    document.getElementById('detailBody').innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="fw-semibold">Inscription</h6>
          <dl class="row info-list mb-0">
            <div class="col-6"><dt>Année</dt><dd>${esc(labels.annee(i.annee_id))}</dd></div>
            <div class="col-6"><dt>Type</dt><dd>${esc(i.type)}</dd></div>
            <div class="col-6"><dt>Filière</dt><dd>${esc(labels.filiere(i.filiere_id))}</dd></div>
            <div class="col-6"><dt>Niveau</dt><dd>${esc(db.get('niveaux', i.niveau_id).nom)}</dd></div>
            <div class="col-6"><dt>Matricule</dt><dd class="font-monospace">${esc(e.matricule)}</dd></div>
            <div class="col-6"><dt>Statut</dt><dd>${ui.badge(i.statut)}</dd></div>
            ${fr ? `<div class="col-12"><dt>Frais applicables</dt><dd>${fmt.money(fr.frais_inscription)} (inscription) + ${fmt.money(fr.frais_scolarite)} (scolarité)</dd></div>` : ''}
          </dl>
          ${i.motif_rejet ? `<div class="alert alert-danger py-2 text-sm"><strong>Motif du rejet :</strong> ${esc(i.motif_rejet)}</div>` : ''}
        </div>
        <div class="col-md-6">
          <h6 class="fw-semibold">Pièces justificatives</h6>
          <ul class="list-group list-group-flush mb-3">
            ${Object.entries(PIECES).map(([k, l]) => `<li class="list-group-item px-0 d-flex justify-content-between align-items-center">${l}
              <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" data-piece="${k}" ${i.pieces[k] ? 'checked' : ''} ${i.statut !== 'En attente' ? 'disabled' : ''} aria-label="${l} fournie"></div></li>`).join('')}
          </ul>
          <h6 class="fw-semibold">Historique des inscriptions</h6>
          <ul class="timeline">${histo.map((h) => `<li><span class="t-dot bg-${h.statut === 'Validée' ? 'success' : h.statut === 'Rejetée' ? 'danger' : 'warning'}"></span><div class="fw-medium">${esc(labels.annee(h.annee_id))} — ${esc(labels.groupe(h.filiere_id, h.niveau_id))}</div><div class="text-xs text-secondary">${esc(h.type)} · ${fmt.date(h.date)} · ${esc(h.statut)}</div></li>`).join('')}</ul>
        </div>
      </div>`;
    document.getElementById('detailFooter').innerHTML = i.statut === 'En attente'
      ? `<a href="../etudiants/fiche.html?id=${e.id}" class="btn btn-light me-auto">Dossier complet</a><button class="btn btn-outline-danger" data-rejeter="${i.id}">Rejeter</button><button class="btn btn-success" data-valider="${i.id}"><i class="bi bi-check-lg me-1"></i>Valider</button>`
      : `<a href="../etudiants/fiche.html?id=${e.id}" class="btn btn-light me-auto">Dossier complet</a>${i.statut === 'Validée' ? `<a href="../documents/apercu.html?type=attestation&etudiant=${e.id}" class="btn btn-outline-primary"><i class="bi bi-file-earmark-check me-1"></i>Attestation</a>` : ''}<button class="btn btn-primary" data-bs-dismiss="modal">Fermer</button>`;
    document.querySelectorAll('#detailBody [data-piece]').forEach((sw) => sw.addEventListener('change', () => {
      i.pieces[sw.dataset.piece] = sw.checked;
      db.save(); table.refresh();
    }));
    modal.show();
  }

  document.addEventListener('click', (ev) => {
    const d = ev.target.closest('[data-detail]'); if (d) return detail(Number(d.dataset.detail));
    const v = ev.target.closest('[data-valider]'); if (v) return valider(Number(v.dataset.valider));
    const r = ev.target.closest('[data-rejeter]'); if (r) return rejeter(Number(r.dataset.rejeter));
    return null;
  });

  document.getElementById('btnExport').addEventListener('click', () => {
    C360.exporter.csv('inscriptions', ['Matricule', 'Nom', 'Prénom', 'Année', 'Filière', 'Niveau', 'Type', 'Date', 'Statut'],
      table.lastRows.map((i) => { const e = db.get('etudiants', i.etudiant_id); return [e.matricule, e.nom, e.prenom, labels.annee(i.annee_id), labels.filiere(i.filiere_id), labels.niveau(i.niveau_id), i.type, fmt.date(i.date), i.statut]; }));
  });
});
