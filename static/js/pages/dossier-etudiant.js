/* Composant réutilisable : dossier complet d'un étudiant (fiche admin + espace étudiant).
   Django : chaque onglet correspond à un bloc du template `etudiants/fiche.html`. */
(function () {
  'use strict';
  const C360 = window.C360;

  function situationBoxes(s) {
    const { fmt } = C360;
    return `<div class="row g-3 mb-3">
      <div class="col-sm-6 col-xl-3"><div class="finance-box soft-primary"><div class="label">Montant total</div><div class="value">${fmt.money(s.total)}</div></div></div>
      <div class="col-sm-6 col-xl-3"><div class="finance-box soft-success"><div class="label">Montant versé</div><div class="value">${fmt.money(s.verse)}</div></div></div>
      <div class="col-sm-6 col-xl-3"><div class="finance-box soft-danger"><div class="label">Reste à payer</div><div class="value">${fmt.money(s.reste)}</div></div></div>
      <div class="col-sm-6 col-xl-3"><div class="finance-box soft-purple"><div class="label">Taux de paiement</div><div class="value">${s.taux} %</div><div class="progress progress-thin mt-2 bg-white bg-opacity-50"><div class="progress-bar" style="width:${s.taux}%;background:#7c3aed"></div></div></div></div>
    </div>`;
  }

  function render(container, etuId, { mode = 'admin' } = {}) {
    const { db, ui, labels, fmt, rules, esc } = C360;
    const e = db.get('etudiants', etuId);
    if (!e) {
      container.innerHTML = '<div class="alert alert-warning">Étudiant introuvable.</div>';
      return;
    }
    const isStudent = mode === 'etudiant';
    const role = C360.session.role();
    const canEdit = ['admin', 'scolarite'].includes(role);
    const canPay = ['admin', 'comptable'].includes(role);
    const publies = db.settings().resultats_publies || {};
    const sit = rules.situationFinanciere(e.id);
    const insc = db.where('inscriptions', (i) => i.etudiant_id === e.id).sort((a, b) => b.annee_id - a.annee_id);
    const uesIds = db.where('ues', (u) => u.filiere_id === e.filiere_id && u.niveau_id === e.niveau_id).map((u) => u.id);
    const mats = db.where('matieres', (m) => uesIds.includes(m.ue_id));
    const paies = db.where('paiements', (p) => p.etudiant_id === e.id).sort((a, b) => b.date.localeCompare(a.date));
    const pres = db.where('presences', (p) => p.etudiant_id === e.id && p.statut !== 'Présent').sort((a, b) => b.date.localeCompare(a.date));
    const stats = rules.statsPresence(e.id);
    const docs = db.where('documents_etudiants', (d) => d.etudiant_id === e.id);
    const sem = rules.moyenneSemestre(e.id, 1);
    const showNotes = !isStudent || publies[1];

    const header = `
      <div class="card mb-3"><div class="card-body d-flex flex-wrap align-items-center gap-3">
        ${ui.avatar(`${e.prenom} ${e.nom}`, 'lg', e.photo)}
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex flex-wrap align-items-center gap-2"><h2 class="h4 fw-bold mb-0">${esc(e.prenom)} ${esc(e.nom.toUpperCase())}</h2>${ui.badge(e.statut)}</div>
          <div class="text-secondary mt-1"><span class="font-monospace">${esc(e.matricule)}</span> · ${esc(labels.filiere(e.filiere_id))} · ${esc(db.get('niveaux', e.niveau_id).nom)} · ${esc(labels.annee(e.annee_id))}</div>
          <div class="text-sm mt-2 d-flex flex-wrap gap-3"><span><i class="bi bi-envelope me-1"></i>${esc(e.email)}</span><span><i class="bi bi-telephone me-1"></i>${esc(e.telephone)}</span></div>
        </div>
        <div class="d-flex flex-wrap gap-2 no-print">
          ${canEdit ? `<a href="${C360.url(`templates/etudiants/formulaire.html?id=${e.id}`)}" class="btn btn-light"><i class="bi bi-pencil me-1"></i>Modifier</a>` : ''}
          <a href="${C360.url(`templates/documents/apercu.html?type=fiche&etudiant=${e.id}`)}" class="btn btn-light"><i class="bi bi-download me-1"></i>Fiche PDF</a>
          ${canPay ? `<a href="${C360.url(`templates/finances/paiements.html?nouveau=1&etudiant=${e.id}`)}" class="btn btn-primary"><i class="bi bi-cash-coin me-1"></i>Paiement</a>` : ''}
        </div>
      </div></div>`;

    const tabs = [
      ['infos', 'Informations', 'person'], ['inscriptions', 'Inscriptions', 'journal-check'], ['cours', 'Cours', 'book'],
      ['notes', 'Notes & résultats', 'award'], ['presences', 'Absences & retards', 'clock-history'],
      ['finances', 'Paiements', 'cash-coin'], ['documents', 'Documents', 'folder2'],
    ];

    const dl = (pairs) => `<dl class="row info-list mb-0">${pairs.map(([k, v]) => `<div class="col-sm-6 col-lg-4"><dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl>`;

    const panes = {
      infos: `
        <h6 class="fw-semibold mb-3">Informations personnelles</h6>
        ${dl([['Nom', e.nom], ['Prénom(s)', e.prenom], ['Sexe', e.sexe === 'F' ? 'Féminin' : 'Masculin'], ['Date de naissance', fmt.date(e.date_naissance)], ['Lieu de naissance', e.lieu_naissance], ['Nationalité', e.nationalite]])}
        <hr><h6 class="fw-semibold mb-3">Adresse et coordonnées</h6>
        ${dl([['Adresse', e.adresse], ['Téléphone', e.telephone], ['E-mail', e.email], ['Parent / tuteur', e.tuteur_nom], ['Téléphone du tuteur', e.tuteur_telephone]])}
        <hr><h6 class="fw-semibold mb-3">Formation</h6>
        ${dl([['Matricule', e.matricule], ['Faculté', labels.faculte(db.get('filieres', e.filiere_id).faculte_id)], ['Filière', labels.filiere(e.filiere_id)], ['Niveau', db.get('niveaux', e.niveau_id).nom], ['Année académique', labels.annee(e.annee_id)], ['Dossier créé le', fmt.date(e.date_creation)]])}`,

      inscriptions: `<div class="table-responsive"><table class="table"><thead><tr><th>Année</th><th>Formation</th><th>Type</th><th>Date</th><th>Pièces</th><th>Statut</th></tr></thead><tbody>
        ${insc.map((i) => { const p = Object.values(i.pieces || {}); return `<tr><td class="fw-semibold">${esc(labels.annee(i.annee_id))}</td><td>${esc(labels.groupe(i.filiere_id, i.niveau_id))}</td><td>${esc(i.type)}</td><td>${fmt.date(i.date)}</td><td>${p.filter(Boolean).length}/${p.length}</td><td>${ui.badge(i.statut)}${i.motif_rejet ? `<div class="text-xs text-danger mt-1">${esc(i.motif_rejet)}</div>` : ''}</td></tr>`; }).join('') || ui.empty(6)}
      </tbody></table></div>`,

      cours: `<div class="table-responsive"><table class="table"><thead><tr><th>Code</th><th>Matière</th><th>UE</th><th class="text-center">Coef.</th><th class="text-center">Crédits</th><th>Enseignant</th></tr></thead><tbody>
        ${mats.map((m) => `<tr><td class="font-monospace text-sm">${esc(m.code)}</td><td class="fw-medium">${esc(m.intitule)}</td><td class="text-sm">${esc(db.get('ues', m.ue_id).intitule)}</td><td class="text-center">${m.coefficient}</td><td class="text-center">${m.credits}</td><td>${esc(labels.enseignant(m.enseignant_id))}</td></tr>`).join('') || ui.empty(6, 'Aucun cours associé à cette formation')}
      </tbody></table></div>`,

      notes: showNotes ? `
        <div class="d-flex flex-wrap gap-3 mb-3">
          <div class="finance-box soft-primary"><div class="label">Moyenne semestre 1</div><div class="value">${fmt.note(sem.moyenne)} / 20</div></div>
          <div class="finance-box soft-teal"><div class="label">Crédits validés</div><div class="value">${sem.credits}</div></div>
          <div class="finance-box ${sem.moyenne !== null && sem.moyenne < 10 ? 'soft-danger' : 'soft-success'}"><div class="label">Décision provisoire</div><div class="value fs-6 mt-1">${esc(sem.decision)}</div></div>
          <a href="${C360.url(`templates/documents/apercu.html?type=releve&etudiant=${e.id}`)}" class="btn btn-outline-primary align-self-center ms-auto no-print"><i class="bi bi-file-earmark-text me-1"></i>Relevé de notes</a>
        </div>
        <div class="table-responsive"><table class="table"><thead><tr><th>Matière</th><th class="text-center">Coef.</th><th>Évaluations</th><th class="text-center">Moyenne</th></tr></thead><tbody>
        ${sem.detail.map(({ matiere: m, moyenne }) => {
          const evals = db.where('evaluations', (ev) => ev.matiere_id === m.id).map((ev) => {
            const n = db.all('notes').find((x) => x.evaluation_id === ev.id && x.etudiant_id === e.id);
            return `<span class="badge text-bg-light border me-1">${esc(ev.libelle)} : ${n ? (n.absent ? 'ABS' : fmt.note(n.valeur)) : '—'}</span>`;
          }).join('');
          return `<tr><td class="fw-medium">${esc(m.intitule)}</td><td class="text-center">${m.coefficient}</td><td>${evals || '<span class="text-secondary text-sm">Aucune évaluation</span>'}</td><td class="text-center fw-semibold ${moyenne !== null && moyenne < 10 ? 'text-danger' : ''}">${fmt.note(moyenne)}</td></tr>`;
        }).join('') || ui.empty(4, 'Aucune note disponible')}
        </tbody></table></div>` : '<div class="empty-state"><i class="bi bi-hourglass"></i>Les résultats du semestre n\'ont pas encore été publiés.</div>',

      presences: `
        <div class="row g-3 mb-3">
          <div class="col-6 col-lg-3"><div class="finance-box soft-success"><div class="label">Taux de présence</div><div class="value">${stats.taux} %</div></div></div>
          <div class="col-6 col-lg-3"><div class="finance-box soft-danger"><div class="label">Absences</div><div class="value">${stats.absences}</div></div></div>
          <div class="col-6 col-lg-3"><div class="finance-box soft-warning"><div class="label">Non justifiées</div><div class="value">${stats.nonJustifiees}</div></div></div>
          <div class="col-6 col-lg-3"><div class="finance-box soft-info"><div class="label">Retards</div><div class="value">${stats.retards}</div></div></div>
        </div>
        ${stats.nonJustifiees >= db.settings().seuil_absences ? `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Seuil d'absences non justifiées atteint (${db.settings().seuil_absences}).</div>` : ''}
        <div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Cours</th><th>Type</th><th>Justification</th></tr></thead><tbody>
        ${pres.map((p) => { const s = db.get('seances', p.seance_id); return `<tr><td>${fmt.date(p.date)}</td><td>${esc(labels.matiere(s.matiere_id))} <span class="text-xs text-secondary">(${s.debut})</span></td><td>${ui.badge(p.statut)}${p.minutes_retard ? ` <span class="text-xs">${p.minutes_retard} min</span>` : ''}</td><td>${p.statut === 'Absent' ? (p.justifiee ? '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Justifiée</span>' : '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Non justifiée</span>') : '—'}</td></tr>`; }).join('') || ui.empty(4, 'Aucune absence ni retard')}
        </tbody></table></div>`,

      finances: `${situationBoxes(sit)}
        <div class="table-responsive"><table class="table"><thead><tr><th>N° reçu</th><th>Date</th><th>Motif</th><th>Mode</th><th class="text-end">Montant</th><th>Statut</th><th></th></tr></thead><tbody>
        ${paies.map((p) => `<tr class="${p.statut === 'Annulé' ? 'text-decoration-line-through text-secondary' : ''}"><td class="fw-semibold font-monospace text-sm">${esc(p.numero_recu)}</td><td>${fmt.date(p.date)}</td><td>${esc(p.motif)}</td><td>${esc(p.mode)}</td><td class="text-end fw-semibold text-nowrap">${fmt.money(p.montant)}</td><td>${ui.badge(p.statut)}</td><td class="text-end">${p.statut === 'Validé' ? `<a class="btn btn-sm btn-light" href="${C360.url(`templates/finances/recu.html?id=${p.id}`)}" title="Reçu"><i class="bi bi-receipt"></i></a>` : ''}</td></tr>`).join('') || ui.empty(7, 'Aucun paiement enregistré')}
        </tbody></table></div>`,

      documents: `
        <div class="d-flex flex-wrap gap-2 mb-3 no-print">
          <a class="btn btn-sm btn-outline-primary" href="${C360.url(`templates/documents/apercu.html?type=attestation&etudiant=${e.id}`)}"><i class="bi bi-file-earmark-check me-1"></i>Attestation d'inscription</a>
          <a class="btn btn-sm btn-outline-primary" href="${C360.url(`templates/documents/apercu.html?type=certificat&etudiant=${e.id}`)}"><i class="bi bi-patch-check me-1"></i>Certificat de scolarité</a>
          <a class="btn btn-sm btn-outline-primary" href="${C360.url(`templates/documents/apercu.html?type=releve&etudiant=${e.id}`)}"><i class="bi bi-file-earmark-text me-1"></i>Relevé de notes</a>
        </div>
        <h6 class="fw-semibold">Pièces justificatives</h6>
        <ul class="list-group mb-3" id="docList">
          ${docs.map((d) => `<li class="list-group-item d-flex align-items-center gap-3"><i class="bi bi-file-earmark-${/\.pdf$/i.test(d.fichier) ? 'pdf text-danger' : 'image text-primary'} fs-4"></i><div class="flex-grow-1"><div class="fw-medium">${esc(d.type)}</div><div class="text-xs text-secondary">${esc(d.fichier)} · déposé le ${fmt.date(d.date)}</div></div>${ui.badge(d.statut)}</li>`).join('') || '<li class="list-group-item text-secondary text-sm">Aucune pièce déposée.</li>'}
        </ul>
        <form id="uploadDoc" class="row g-2 align-items-end no-print" novalidate>
          <div class="col-md-4"><label class="form-label text-sm" for="docType">Type de pièce</label><select id="docType" class="form-select" required><option value="">Choisir…</option><option>Acte de naissance</option><option>Diplôme du baccalauréat</option><option>Certificat médical</option><option>Photo d'identité</option><option>Pièce d'identité</option><option>Autre</option></select></div>
          <div class="col-md-5"><label class="form-label text-sm" for="docFile">Fichier (PDF, JPG, PNG — 5 Mo max.)</label><input type="file" id="docFile" class="form-control" accept=".pdf,image/png,image/jpeg" required></div>
          <div class="col-md-3"><button class="btn btn-primary w-100"><i class="bi bi-upload me-1"></i>Déposer</button></div>
        </form>`,
    };

    container.innerHTML = `${header}
      <div class="card"><div class="card-header p-0 px-2"><ul class="nav nav-tabs-line" role="tablist">
        ${tabs.map(([k, l, i], idx) => `<li class="nav-item" role="presentation"><button class="nav-link${idx === 0 ? ' active' : ''}" data-bs-toggle="tab" data-bs-target="#tab-${k}" type="button" role="tab"><i class="bi bi-${i} me-1"></i>${l}</button></li>`).join('')}
      </ul></div>
      <div class="card-body tab-content">
        ${tabs.map(([k], idx) => `<div class="tab-pane fade${idx === 0 ? ' show active' : ''}" id="tab-${k}" role="tabpanel">${panes[k]}</div>`).join('')}
      </div></div>`;

    // Ouvre l'onglet demandé dans l'URL (#finances, #notes…)
    const hash = window.location.hash.replace('#', '');
    const tabBtn = container.querySelector(`[data-bs-target="#tab-${hash}"]`);
    if (tabBtn) bootstrap.Tab.getOrCreateInstance(tabBtn).show();

    const up = container.querySelector('#uploadDoc');
    up.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const file = up.querySelector('#docFile').files[0];
      if (!ui.validate(up)) return;
      if (file.size > 5 * 1024 * 1024) { ui.toast('Fichier trop volumineux (5 Mo max.).', 'danger'); return; }
      // Django : envoi multipart vers la vue d'upload (validation du type MIME côté serveur obligatoire).
      db.insert('documents_etudiants', { etudiant_id: e.id, type: up.querySelector('#docType').value, fichier: file.name, date: fmt.today(), statut: 'En attente' });
      ui.toast('Pièce déposée — en attente de vérification.');
      render(container, etuId, { mode });
      bootstrap.Tab.getOrCreateInstance(container.querySelector('[data-bs-target="#tab-documents"]')).show();
    });
  }

  C360.dossier = { render, situationBoxes };
})();
