/* Paiements : enregistrement (total ou partiel), contrôle du solde, anti-doublon,
   reçus numérotés, annulation / correction tracées (jamais de modification silencieuse). */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, rules, esc } = C360;
  const modal = new bootstrap.Modal('#payModal');
  const form = document.getElementById('payForm');
  let submitting = false;

  function renderSummary() {
    const valides = db.where('paiements', (p) => p.statut === 'Validé');
    const today = fmt.today();
    const month = today.slice(0, 7);
    const sum = (arr) => arr.reduce((s, p) => s + p.montant, 0);
    const cards = [
      ['Encaissé (année)', fmt.money(sum(valides)), 'cash-stack', 'soft-success'],
      ['Encaissé ce mois', fmt.money(sum(valides.filter((p) => p.date.startsWith(month)))), 'calendar-month', 'soft-primary'],
      ['Transactions validées', fmt.number(valides.length), 'receipt', 'soft-info'],
      ['Annulations', fmt.number(db.where('paiements', (p) => p.statut === 'Annulé').length), 'x-octagon', 'soft-danger'],
    ];
    document.getElementById('summary').innerHTML = cards.map(([l, v, i, c]) => `<div class="col-sm-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div class="min-w-0"><div class="stat-value text-truncate">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');
  }

  function renderAudit() {
    const rows = db.all('audit').slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    document.getElementById('auditBody').innerHTML = rows.map((a) => `<tr><td class="text-nowrap">${esc(a.date)}</td><td>${esc(a.utilisateur)}</td><td>${/annul/i.test(a.action) ? '<span class="text-danger fw-semibold">' : /correct/i.test(a.action) ? '<span class="text-warning fw-semibold">' : '<span class="fw-semibold">'}${esc(a.action)}</span></td><td class="text-sm">${esc(a.details)}</td></tr>`).join('') || ui.empty(4, 'Aucune opération');
  }

  const table = new C360.DataTable({
    tbody: '#tbody',
    data: () => db.all('paiements'),
    search: '#search',
    searchFields: ['numero_recu', 'reference', 'reference_externe', (p) => { const e = db.get('etudiants', p.etudiant_id); return e ? `${e.nom} ${e.prenom} ${e.matricule}` : ''; }],
    filters: [
      { el: '#fMode', field: 'mode' }, { el: '#fStatut', field: 'statut' },
      { el: '#fDu', field: (p, v) => p.date >= v }, { el: '#fAu', field: (p, v) => p.date <= v },
    ],
    sort: (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    pageSize: 12,
    colspan: 8,
    render: (p) => {
      const e = db.get('etudiants', p.etudiant_id);
      const cancelled = p.statut === 'Annulé';
      return `<tr class="${cancelled ? 'text-secondary' : ''}">
        <td class="font-monospace text-sm fw-semibold ${cancelled ? 'text-decoration-line-through' : ''}">${esc(p.numero_recu)}</td>
        <td class="text-nowrap">${fmt.date(p.date)}</td>
        <td><a href="../etudiants/fiche.html?id=${e.id}#finances" class="text-body fw-medium">${esc(e.prenom)} ${esc(e.nom)}</a><div class="text-xs text-secondary font-monospace">${esc(e.matricule)}</div></td>
        <td class="text-sm">${esc(p.motif)}${p.observation ? `<div class="text-xs text-secondary">${esc(p.observation)}</div>` : ''}</td>
        <td class="text-sm text-nowrap">${esc(p.mode)}</td>
        <td class="text-end fw-semibold text-nowrap ${cancelled ? 'text-decoration-line-through' : ''}">${fmt.money(p.montant)}</td>
        <td>${ui.badge(p.statut)}</td>
        <td class="text-end text-nowrap">${cancelled ? '' : `
          <a class="btn btn-sm btn-light" href="recu.html?id=${p.id}" title="Reçu" aria-label="Reçu"><i class="bi bi-receipt"></i></a>
          <div class="btn-group"><button class="btn btn-sm btn-light" data-bs-toggle="dropdown" aria-label="Plus d'actions"><i class="bi bi-three-dots-vertical"></i></button>
          <ul class="dropdown-menu dropdown-menu-end shadow"><li><button class="dropdown-item" data-correct="${p.id}"><i class="bi bi-pencil-square me-2"></i>Corriger (annule et remplace)</button></li><li><button class="dropdown-item text-danger" data-cancel="${p.id}"><i class="bi bi-x-octagon me-2"></i>Annuler le paiement</button></li></ul></div>`}
        </td></tr>`;
    },
  });

  /* ------------------------------------------------ Modale de paiement --- */
  const search = document.getElementById('payStudentSearch');
  const results = document.getElementById('payStudentResults');

  function updateSituation() {
    const id = Number(form.etudiant_id.value);
    const box = document.getElementById('paySituation');
    const quick = document.getElementById('quickAmounts');
    if (!id) { box.innerHTML = ''; quick.innerHTML = ''; document.getElementById('newBalance').innerHTML = ''; return; }
    const s = rules.situationFinanciere(id);
    box.innerHTML = C360.dossier.situationBoxes(s);
    const fr = rules.fraisPour(db.get('etudiants', id).filiere_id, db.get('etudiants', id).niveau_id);
    const tranche = fr ? Math.ceil(fr.frais_scolarite / fr.nb_tranches / 500) * 500 : 0;
    const choices = [];
    if (s.reste > 0) choices.push(['Solde', s.reste]);
    if (tranche && tranche < s.reste) choices.push(['1 tranche', tranche]);
    quick.innerHTML = choices.map(([l, v]) => `<button type="button" class="btn btn-sm btn-outline-secondary" data-amount="${v}">${l} : ${fmt.number(v)}</button>`).join('');
    updateBalance();
  }

  function updateBalance() {
    const id = Number(form.etudiant_id.value);
    const m = Number(form.montant.value) || 0;
    if (!id) return;
    const s = rules.situationFinanciere(id);
    const after = s.reste - m;
    document.getElementById('newBalance').innerHTML = m ? (after < 0
      ? `<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Dépasse le solde de ${fmt.money(-after)}</span>`
      : `Solde après paiement : <strong>${fmt.money(after)}</strong>`) : '';
  }

  function selectStudent(id) {
    const e = db.get('etudiants', id);
    form.etudiant_id.value = e.id;
    search.value = `${e.prenom} ${e.nom} — ${e.matricule}`;
    results.innerHTML = '';
    updateSituation();
  }

  search.addEventListener('input', () => {
    form.etudiant_id.value = '';
    updateSituation();
    const q = search.value.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = ''; return; }
    const found = db.where('etudiants', (e) => e.statut === 'Actif' && `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q)).slice(0, 6);
    results.innerHTML = found.map((e) => {
      const s = rules.situationFinanciere(e.id);
      return `<button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-pick="${e.id}"><span><strong>${esc(e.prenom)} ${esc(e.nom)}</strong> <span class="text-xs text-secondary font-monospace">${esc(e.matricule)}</span></span><span class="text-xs ${s.reste ? 'text-danger' : 'text-success'}">${s.reste ? `Reste ${fmt.money(s.reste)}` : 'Soldé'}</span></button>`;
    }).join('') || '<div class="list-group-item text-secondary text-sm">Aucun étudiant actif trouvé</div>';
  });
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) selectStudent(Number(b.dataset.pick)); });
  document.getElementById('quickAmounts').addEventListener('click', (e) => { const b = e.target.closest('[data-amount]'); if (b) { form.montant.value = b.dataset.amount; updateBalance(); } });
  form.montant.addEventListener('input', updateBalance);
  form.exceptionnel.addEventListener('change', () => {
    document.getElementById('exceptionWrap').classList.toggle('d-none', !form.exceptionnel.checked);
    form.observation.required = form.exceptionnel.checked;
  });

  function openModal({ etudiantId = null, preset = null, title = 'Enregistrer un paiement', correctionOf = null } = {}) {
    form.reset(); form.classList.remove('was-validated');
    ui.showErrors('#payErrors', []);
    form.etudiant_id.value = ''; search.value = ''; results.innerHTML = '';
    form.date.value = fmt.today(); form.date.max = fmt.today();
    form.idempotency_key.value = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    form.dataset.correctionOf = correctionOf || '';
    document.getElementById('exceptionWrap').classList.add('d-none');
    document.getElementById('payTitle').textContent = title;
    search.disabled = !!correctionOf;
    if (etudiantId) selectStudent(etudiantId); else updateSituation();
    if (preset) { Object.entries(preset).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; }); updateBalance(); }
    modal.show();
  }

  document.getElementById('btnNew').addEventListener('click', () => openModal());
  if (C360.param('nouveau')) openModal({ etudiantId: Number(C360.param('etudiant')) || null });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (submitting) return; // protection double-clic
    const d = ui.formData(form);
    const correctionOf = Number(form.dataset.correctionOf) || null;
    if (!d.etudiant_id) { ui.showErrors('#payErrors', ['Veuillez sélectionner un étudiant.']); return; }
    if (!ui.validate(form)) return;

    // En cas de correction, le paiement d'origine est d'abord neutralisé dans le calcul du solde
    const original = correctionOf ? db.get('paiements', correctionOf) : null;
    if (original) original.statut = 'Annulé';
    const check = rules.verifierPaiement({ etudiant_id: Number(d.etudiant_id), montant: Number(d.montant), date: d.date, reference_externe: d.reference_externe, exceptionnel: d.exceptionnel });
    if (original) original.statut = 'Validé';
    if (!check.ok) { ui.showErrors('#payErrors', check.errors); return; }
    if (db.all('paiements').some((p) => p.idempotency_key && p.idempotency_key === d.idempotency_key)) { ui.showErrors('#payErrors', ['Ce paiement a déjà été enregistré.']); return; }

    submitting = true;
    document.getElementById('paySubmit').disabled = true;
    const etu = db.get('etudiants', d.etudiant_id);
    if (original) {
      db.update('paiements', original.id, { statut: 'Annulé', observation: `Corrigé — remplacé par un nouveau reçu (${C360.session.user().nom})` });
      C360.audit('Paiement corrigé', `${original.numero_recu} (${fmt.money(original.montant)}) annulé et remplacé — ${etu.prenom} ${etu.nom}`);
    }
    const p = db.insert('paiements', {
      reference: `PAY-${String(db.nextId('paiements') + 1).padStart(6, '0')}`,
      numero_recu: rules.prochainNumeroRecu(),
      etudiant_id: etu.id, annee_id: db.settings().annee_courante_id, montant: Number(d.montant), mode: d.mode, motif: d.motif, date: d.date,
      reference_externe: d.reference_externe, statut: 'Validé', saisi_par: C360.session.user().nom,
      observation: d.exceptionnel ? `Opération exceptionnelle : ${d.observation}` : '', idempotency_key: d.idempotency_key,
    });
    C360.audit(d.exceptionnel ? 'Paiement exceptionnel enregistré' : 'Paiement enregistré', `${p.numero_recu} — ${fmt.money(p.montant)} (${etu.prenom} ${etu.nom}, ${p.mode})`);
    modal.hide();
    submitting = false;
    document.getElementById('paySubmit').disabled = false;
    table.refresh(); renderSummary(); renderAudit();
    ui.toast(`Paiement enregistré — reçu ${p.numero_recu}.`);
    setTimeout(() => { window.location.href = `recu.html?id=${p.id}`; }, 800);
  });

  /* ------------------------------------------- Annulation / correction --- */
  document.getElementById('tbody').addEventListener('click', async (ev) => {
    const c = ev.target.closest('[data-cancel]');
    if (c) {
      const p = db.get('paiements', c.dataset.cancel);
      const motif = await ui.confirm(`Le reçu ${p.numero_recu} (${fmt.money(p.montant)}) sera annulé. Il restera visible dans l'historique.`, { title: 'Annuler ce paiement ?', okLabel: 'Annuler le paiement', okClass: 'btn-danger', input: 'Motif de l\'annulation (obligatoire)' });
      if (!motif) return;
      db.update('paiements', p.id, { statut: 'Annulé', observation: `Annulé : ${motif}` });
      C360.audit('Paiement annulé', `${p.numero_recu} — ${fmt.money(p.montant)} — motif : ${motif}`);
      ui.toast('Paiement annulé et tracé dans l\'historique.', 'warning');
      table.refresh(); renderSummary(); renderAudit();
      return;
    }
    const k = ev.target.closest('[data-correct]');
    if (k) {
      const p = db.get('paiements', k.dataset.correct);
      openModal({ etudiantId: p.etudiant_id, title: `Corriger le reçu ${p.numero_recu}`, correctionOf: p.id, preset: { montant: p.montant, mode: p.mode, motif: p.motif, date: p.date, reference_externe: p.reference_externe || '' } });
    }
  });

  document.getElementById('btnExport').addEventListener('click', () => {
    C360.exporter.csv('paiements', ['N° reçu', 'Date', 'Matricule', 'Étudiant', 'Filière', 'Niveau', 'Motif', 'Mode', 'Montant (FCFA)', 'Statut', 'Saisi par'],
      table.lastRows.map((p) => { const e = db.get('etudiants', p.etudiant_id); return [p.numero_recu, fmt.date(p.date), e.matricule, `${e.prenom} ${e.nom}`, labels.filiere(e.filiere_id), labels.niveau(e.niveau_id), p.motif, p.mode, p.montant, p.statut, p.saisi_par]; }));
  });

  renderSummary();
  renderAudit();
});
