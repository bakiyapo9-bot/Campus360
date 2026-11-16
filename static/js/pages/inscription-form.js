/* Assistant d'inscription / réinscription (4 étapes).
   Règle : pas deux inscriptions identiques (même étudiant, même année, même formation) sauf dérogation. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, rules, esc } = C360;
  const form = document.getElementById('wizard');
  const PIECES = [
    { key: 'acte_naissance', label: 'Acte de naissance', required: true },
    { key: 'diplome', label: 'Diplôme / relevé du BAC (ou dernier diplôme)', required: true },
    { key: 'photo', label: 'Photo d\'identité', required: false },
    { key: 'certificat_medical', label: 'Certificat médical', required: false },
  ];
  let step = 1;

  ui.fillSelect('#annee_id', db.where('annees', (a) => a.statut === 'En cours'), { label: 'libelle' });
  ui.fillSelect('#filiere_id', db.all('filieres'), { label: (f) => `${f.code} — ${f.nom}`, placeholder: 'Choisir…' });
  ui.fillSelect('#niveau_id', db.all('niveaux'), { label: 'nom', placeholder: 'Choisir…' });

  document.getElementById('piecesList').innerHTML = PIECES.map((p) => `
    <div class="col-md-6"><div class="border rounded-3 p-3 h-100">
      <label class="form-label fw-medium" for="piece_${p.key}">${esc(p.label)} ${p.required ? '<span class="text-danger">*</span>' : '<span class="text-secondary text-xs">(facultatif)</span>'}</label>
      <input type="file" class="form-control" id="piece_${p.key}" name="piece_${p.key}" accept=".pdf,image/png,image/jpeg">
    </div></div>`).join('');

  const isRe = () => form.type.value === 'Réinscription';
  if (C360.param('type') === 'reinscription') document.getElementById('typeRe').checked = true;

  const toggleType = () => {
    document.getElementById('blockNew').classList.toggle('d-none', isRe());
    document.getElementById('blockRe').classList.toggle('d-none', !isRe());
    document.querySelectorAll('#blockNew [required]').forEach((el) => { el.disabled = isRe(); });
  };
  form.querySelectorAll('[name=type]').forEach((r) => r.addEventListener('change', toggleType));
  toggleType();

  // Recherche de l'ancien étudiant
  const search = document.getElementById('searchStudent');
  const results = document.getElementById('studentResults');
  const selectStudent = (id) => {
    const e = db.get('etudiants', id);
    form.etudiant_id.value = e.id;
    results.innerHTML = ''; search.value = '';
    const last = db.where('inscriptions', (i) => i.etudiant_id === e.id).sort((a, b) => b.annee_id - a.annee_id)[0];
    document.getElementById('selectedStudent').innerHTML = `<div class="alert alert-primary d-flex align-items-center gap-3 mb-0" style="max-width:520px">${ui.avatar(`${e.prenom} ${e.nom}`, null, e.photo)}
      <div><div class="fw-semibold">${esc(e.prenom)} ${esc(e.nom)} <span class="font-monospace text-sm">(${esc(e.matricule)})</span></div><div class="text-sm">Dernière inscription : ${last ? `${esc(labels.annee(last.annee_id))} — ${esc(labels.groupe(last.filiere_id, last.niveau_id))} (${esc(last.statut)})` : 'aucune'}</div></div></div>`;
    // Pré-remplit la formation : même filière, niveau suivant si la précédente est validée
    form.filiere_id.value = e.filiere_id;
    const niv = db.get('niveaux', e.niveau_id);
    const next = last && last.statut === 'Validée' && last.annee_id < db.settings().annee_courante_id ? db.all('niveaux').find((n) => n.ordre === niv.ordre + 1) : niv;
    form.niveau_id.value = (next || niv).id;
  };
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = ''; return; }
    const found = db.all('etudiants').filter((e) => `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q)).slice(0, 6);
    results.innerHTML = found.map((e) => `<button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-2" data-pick="${e.id}">${ui.avatar(`${e.prenom} ${e.nom}`)}<span><strong>${esc(e.prenom)} ${esc(e.nom)}</strong> <span class="text-secondary text-sm font-monospace">${esc(e.matricule)}</span></span></button>`).join('') || '<div class="list-group-item text-secondary text-sm">Aucun étudiant trouvé</div>';
  });
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) selectStudent(Number(b.dataset.pick)); });
  if (C360.param('etudiant')) { document.getElementById('typeRe').checked = true; toggleType(); selectStudent(Number(C360.param('etudiant'))); }

  // Frais affichés à la sélection de la formation
  const showFrais = () => {
    const fr = rules.fraisPour(form.filiere_id.value, form.niveau_id.value, form.annee_id.value);
    document.getElementById('fraisInfo').innerHTML = fr ? `<div class="alert alert-info mb-0 py-2"><i class="bi bi-tag me-2"></i>Frais applicables : <strong>${fmt.money(fr.frais_inscription)}</strong> d'inscription + <strong>${fmt.money(fr.frais_scolarite)}</strong> de scolarité (payables en ${fr.nb_tranches} tranches).</div>` : '';
  };
  ['filiere_id', 'niveau_id', 'annee_id'].forEach((n) => form[n].addEventListener('change', showFrais));
  form.derogation.addEventListener('change', () => {
    document.getElementById('derogationMotifWrap').classList.toggle('d-none', !form.derogation.checked);
    form.derogation_motif.required = form.derogation.checked;
  });

  const etudiantIdForCheck = () => (isRe() ? Number(form.etudiant_id.value) : null);

  function validateStep(n) {
    const section = form.querySelector(`.wiz-step[data-step="${n}"]`);
    const errors = [];
    section.classList.add('was-validated');
    const fields = [...section.querySelectorAll('input,select,textarea')].filter((el) => !el.disabled && el.offsetParent !== null);
    let valid = fields.every((el) => el.checkValidity());
    if (n === 1 && isRe() && !form.etudiant_id.value) { errors.push('Sélectionnez l\'étudiant à réinscrire.'); valid = false; }
    if (n === 1 && !isRe()) {
      const dup = db.all('etudiants').find((e) => e.email.toLowerCase() === form.email.value.trim().toLowerCase());
      if (dup) { errors.push(`Un étudiant utilise déjà cet e-mail (${dup.prenom} ${dup.nom}, ${dup.matricule}). S'agit-il d'une réinscription ?`); valid = false; }
    }
    if (n === 2 && valid && isRe()) {
      const check = rules.verifierInscription({ etudiant_id: etudiantIdForCheck(), annee_id: form.annee_id.value, filiere_id: form.filiere_id.value, niveau_id: form.niveau_id.value, derogation: form.derogation.checked });
      if (!check.ok) { errors.push(...check.errors, 'Cochez « Cas particulier autorisé » si une dérogation a été accordée.'); valid = false; }
    }
    if (n === 3) {
      PIECES.forEach((p) => {
        const f = form[`piece_${p.key}`].files[0];
        if (f && f.size > 5 * 1024 * 1024) { errors.push(`${p.label} : fichier trop volumineux (5 Mo max.).`); valid = false; }
      });
    }
    ui.showErrors('#wizErrors', errors);
    return valid;
  }

  function renderRecap() {
    const fr = rules.fraisPour(form.filiere_id.value, form.niveau_id.value, form.annee_id.value);
    const e = isRe() ? db.get('etudiants', form.etudiant_id.value) : null;
    const matricule = e ? e.matricule : rules.genererMatricule(labels.annee(form.annee_id.value));
    const pieces = PIECES.map((p) => ({ ...p, ok: !!form[`piece_${p.key}`].files[0] }));
    const manque = pieces.filter((p) => p.required && !p.ok);
    document.getElementById('recap').innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <h6 class="fw-semibold">Étudiant</h6>
          <dl class="row info-list">
            <div class="col-6"><dt>Nom complet</dt><dd>${esc(e ? `${e.prenom} ${e.nom}` : `${form.prenom.value} ${form.nom.value}`)}</dd></div>
            <div class="col-6"><dt>Matricule ${e ? '' : 'attribué'}</dt><dd class="font-monospace">${esc(matricule)}</dd></div>
            <div class="col-6"><dt>Type</dt><dd>${esc(form.type.value)}</dd></div>
            <div class="col-6"><dt>Année académique</dt><dd>${esc(labels.annee(form.annee_id.value))}</dd></div>
            <div class="col-6"><dt>Filière</dt><dd>${esc(labels.filiere(form.filiere_id.value))}</dd></div>
            <div class="col-6"><dt>Niveau</dt><dd>${esc(db.get('niveaux', form.niveau_id.value).nom)}</dd></div>
          </dl>
          ${form.derogation.checked ? `<div class="alert alert-info py-2 text-sm"><i class="bi bi-shield-check me-1"></i>Dérogation : ${esc(form.derogation_motif.value)}</div>` : ''}
        </div>
        <div class="col-md-6">
          <h6 class="fw-semibold">Pièces justificatives</h6>
          <ul class="list-unstyled">${pieces.map((p) => `<li class="mb-1"><i class="bi bi-${p.ok ? 'check-circle-fill text-success' : 'circle text-secondary'} me-2"></i>${esc(p.label)}</li>`).join('')}</ul>
          ${manque.length ? '<div class="alert alert-warning py-2 text-sm">Dossier incomplet : l\'inscription restera « En attente » jusqu\'à réception des pièces obligatoires.</div>' : ''}
          ${fr ? `<h6 class="fw-semibold mt-3">Frais</h6><div class="d-flex justify-content-between"><span>Inscription</span><strong>${fmt.money(fr.frais_inscription)}</strong></div><div class="d-flex justify-content-between"><span>Scolarité</span><strong>${fmt.money(fr.frais_scolarite)}</strong></div><hr class="my-2"><div class="d-flex justify-content-between fs-5"><span>Total</span><strong class="text-primary">${fmt.money(fr.frais_inscription + fr.frais_scolarite)}</strong></div>` : ''}
        </div>
      </div>`;
  }

  function go(n) {
    step = n;
    form.querySelectorAll('.wiz-step').forEach((s) => s.classList.toggle('d-none', Number(s.dataset.step) !== n));
    document.querySelectorAll('#stepper .step').forEach((s) => {
      const k = Number(s.dataset.step);
      s.classList.toggle('active', k === n); s.classList.toggle('done', k < n);
    });
    document.getElementById('btnPrev').disabled = n === 1;
    document.getElementById('btnNext').classList.toggle('d-none', n === 4);
    document.getElementById('btnSubmit').classList.toggle('d-none', n !== 4);
    if (n === 2) showFrais();
    if (n === 4) renderRecap();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('btnNext').addEventListener('click', () => { if (validateStep(step)) go(step + 1); });
  document.getElementById('btnPrev').addEventListener('click', () => { ui.showErrors('#wizErrors', []); go(step - 1); });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (step !== 4) return;
    const d = ui.formData(form);
    let etu;
    if (isRe()) {
      etu = db.get('etudiants', d.etudiant_id);
    } else {
      etu = db.insert('etudiants', {
        matricule: rules.genererMatricule(labels.annee(d.annee_id)), nom: d.nom, prenom: d.prenom, sexe: d.sexe, date_naissance: d.date_naissance,
        lieu_naissance: d.lieu_naissance, nationalite: '', email: d.email, telephone: d.telephone, adresse: d.adresse, tuteur_nom: '', tuteur_telephone: '',
        filiere_id: Number(d.filiere_id), niveau_id: Number(d.niveau_id), annee_id: Number(d.annee_id), photo: null, statut: 'Actif', date_creation: fmt.today(),
      });
    }
    // Contrôle final du doublon (à refaire côté serveur avec une contrainte d'unicité)
    const check = rules.verifierInscription({ etudiant_id: etu.id, annee_id: d.annee_id, filiere_id: d.filiere_id, niveau_id: d.niveau_id, derogation: d.derogation });
    if (!check.ok) { ui.showErrors('#wizErrors', check.errors); go(2); return; }
    const pieces = {};
    PIECES.forEach((p) => { pieces[p.key] = !!form[`piece_${p.key}`].files[0]; });
    db.insert('inscriptions', {
      etudiant_id: etu.id, annee_id: Number(d.annee_id), filiere_id: Number(d.filiere_id), niveau_id: Number(d.niveau_id),
      type: isRe() ? 'Réinscription' : 'Nouvelle', date: fmt.today(), statut: 'En attente', pieces, motif_rejet: '',
      derogation: !!d.derogation, derogation_motif: d.derogation_motif || '',
    });
    ui.toast(`Inscription enregistrée pour ${etu.prenom} ${etu.nom} (${etu.matricule}).`);
    setTimeout(() => { window.location.href = 'liste.html?statut=En%20attente'; }, 900);
  });
});
