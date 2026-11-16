/* Documents administratifs : génération (attestation, certificat, relevé, fiche, reçus)
   et vérification des pièces justificatives. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, esc, labels } = C360;
  const role = C360.session.role();
  const isStudent = role === 'etudiant';
  const canVerify = ['admin', 'scolarite'].includes(role);
  let etuId = isStudent ? C360.ROLES.etudiant.etudiant_id : (Number(C360.param('etudiant')) || null);

  const TYPES = [
    { type: 'attestation', label: 'Attestation d\'inscription', icon: 'file-earmark-check', cls: 'soft-primary', roles: ['admin', 'scolarite', 'etudiant'] },
    { type: 'certificat', label: 'Certificat de scolarité', icon: 'patch-check', cls: 'soft-teal', roles: ['admin', 'scolarite', 'etudiant'] },
    { type: 'releve', label: 'Relevé de notes', icon: 'file-earmark-text', cls: 'soft-purple', roles: ['admin', 'scolarite', 'etudiant'] },
    { type: 'fiche', label: 'Fiche individuelle', icon: 'person-vcard', cls: 'soft-info', roles: ['admin', 'scolarite', 'comptable', 'etudiant'] },
    { type: 'recus', label: 'Reçus de paiement', icon: 'receipt', cls: 'soft-success', roles: ['admin', 'comptable', 'etudiant'] },
  ].filter((t) => t.roles.includes(role));

  function renderTypes() {
    document.getElementById('docTypes').innerHTML = TYPES.map((t) => {
      if (t.type === 'recus') {
        const paies = etuId ? db.where('paiements', (p) => p.etudiant_id === etuId && p.statut === 'Validé') : [];
        return `<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body">
          <div class="d-flex align-items-center gap-3 mb-2"><div class="stat-icon ${t.cls}"><i class="bi bi-${t.icon}"></i></div><div class="fw-semibold">${t.label}</div></div>
          ${etuId ? (paies.map((p) => `<a class="d-flex justify-content-between text-sm py-1 border-bottom text-decoration-none" href="../finances/recu.html?id=${p.id}"><span class="font-monospace">${esc(p.numero_recu)}</span><span>${fmt.money(p.montant)}</span></a>`).join('') || '<div class="text-sm text-secondary">Aucun paiement.</div>') : '<div class="text-sm text-secondary">Sélectionnez un étudiant.</div>'}
        </div></div></div>`;
      }
      return `<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body d-flex align-items-center gap-3">
        <div class="stat-icon ${t.cls}"><i class="bi bi-${t.icon}"></i></div>
        <div class="flex-grow-1"><div class="fw-semibold">${t.label}</div><div class="text-xs text-secondary">PDF téléchargeable</div></div>
        <a class="btn btn-sm btn-primary ${etuId ? '' : 'disabled'}" href="${etuId ? `apercu.html?type=${t.type}&etudiant=${etuId}` : '#'}" ${etuId ? '' : 'aria-disabled="true" tabindex="-1"'}><i class="bi bi-download me-1"></i>Générer</a>
      </div></div></div>`;
    }).join('');
  }

  function renderSelected() {
    if (!etuId) { document.getElementById('docSelected').innerHTML = ''; return; }
    const e = db.get('etudiants', etuId);
    document.getElementById('docSelected').innerHTML = `<div class="d-inline-flex align-items-center gap-2 border rounded-3 px-3 py-2">${ui.avatar(`${e.prenom} ${e.nom}`, null, e.photo)}<div><div class="fw-semibold">${esc(e.prenom)} ${esc(e.nom)}</div><div class="text-xs text-secondary">${esc(e.matricule)} · ${esc(labels.groupe(e.filiere_id, e.niveau_id))}</div></div></div>`;
  }

  // Sélection de l'étudiant (personnel uniquement)
  if (isStudent) {
    document.getElementById('studentPicker').classList.add('d-none');
    document.getElementById('step2Label').textContent = 'Mes documents';
  } else {
    const input = document.getElementById('docStudent');
    const results = document.getElementById('docResults');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.innerHTML = ''; return; }
      results.innerHTML = db.all('etudiants').filter((e) => `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q)).slice(0, 6)
        .map((e) => `<button type="button" class="list-group-item list-group-item-action" data-pick="${e.id}"><strong>${esc(e.prenom)} ${esc(e.nom)}</strong> <span class="text-xs text-secondary font-monospace">${esc(e.matricule)}</span></button>`).join('')
        || '<div class="list-group-item text-sm text-secondary">Aucun résultat</div>';
    });
    results.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-pick]');
      if (!b) return;
      etuId = Number(b.dataset.pick);
      input.value = ''; results.innerHTML = '';
      renderSelected(); renderTypes();
    });
  }

  // Pièces justificatives
  const piecesCard = document.getElementById('piecesCard');
  if (!canVerify && !isStudent) piecesCard.classList.add('d-none');
  function renderPieces() {
    const statut = document.getElementById('fPieceStatut').value;
    const rows = db.where('documents_etudiants', (d) => (!isStudent || d.etudiant_id === etuId) && (!statut || d.statut === statut))
      .sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('piecesBody').innerHTML = rows.map((d) => {
      const e = db.get('etudiants', d.etudiant_id);
      return `<tr><td><a href="../etudiants/fiche.html?id=${e.id}#documents" class="text-body fw-medium">${esc(e.prenom)} ${esc(e.nom)}</a></td><td>${esc(d.type)}</td><td class="text-sm"><i class="bi bi-paperclip me-1"></i>${esc(d.fichier)}</td><td>${fmt.date(d.date)}</td><td>${ui.badge(d.statut)}</td>
        <td class="text-end text-nowrap">${canVerify && d.statut === 'En attente' ? `<button class="btn btn-sm btn-success" data-verif="${d.id}" title="Marquer comme vérifiée"><i class="bi bi-check-lg"></i></button> <button class="btn btn-sm btn-outline-danger" data-rejet="${d.id}" title="Rejeter"><i class="bi bi-x-lg"></i></button>` : ''}</td></tr>`;
    }).join('') || ui.empty(6, 'Aucune pièce');
  }
  document.getElementById('fPieceStatut').addEventListener('change', renderPieces);
  document.getElementById('piecesBody').addEventListener('click', async (ev) => {
    const v = ev.target.closest('[data-verif]');
    if (v) { db.update('documents_etudiants', v.dataset.verif, { statut: 'Vérifié' }); ui.toast('Pièce vérifiée.'); renderPieces(); return; }
    const r = ev.target.closest('[data-rejet]');
    if (r) {
      const motif = await ui.confirm('L\'étudiant sera invité à déposer une nouvelle pièce.', { title: 'Rejeter la pièce ?', okLabel: 'Rejeter', okClass: 'btn-danger', input: 'Motif du rejet' });
      if (motif) { db.update('documents_etudiants', r.dataset.rejet, { statut: 'Rejetée', motif }); renderPieces(); }
    }
  });

  renderSelected(); renderTypes(); renderPieces();
});
