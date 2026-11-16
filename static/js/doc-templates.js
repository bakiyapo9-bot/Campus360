/* ==========================================================================
   Campus360 — Modèles de documents administratifs imprimables / PDF
   (reçu, attestation, certificat, relevé, fiche individuelle)
   Django : ces modèles deviendront des templates HTML rendus en PDF côté
   serveur (WeasyPrint ou xhtml2pdf) pour garantir l'authenticité.
   ========================================================================== */
(function () {
  'use strict';
  const C360 = window.C360;

  function head(ref) {
    const { esc, fmt, db } = C360;
    const p = db.settings();
    return `<div class="doc-head">
      <div class="d-flex gap-3 align-items-center">
        <div class="brand-logo" style="width:56px;height:56px;font-size:1.6rem;border-radius:12px"><i class="bi bi-mortarboard-fill"></i></div>
        <div><div class="fw-bold fs-5">${esc(p.nom_universite)}</div><div class="text-sm">Direction de la scolarité et des affaires académiques</div><div class="text-xs text-secondary">BP 360 — ${esc(p.ville)} · scolarite@campus360.edu · +223 20 00 00 00</div></div>
      </div>
      <div class="text-end text-sm"><div>${esc(p.ville)}, le ${fmt.dateLong()}</div>${ref ? `<div class="font-monospace mt-1">Réf. : ${esc(ref)}</div>` : ''}</div>
    </div>`;
  }

  function foot(code) {
    return `<div class="signature"><div class="text-sm">Code de vérification :<div class="font-monospace fw-semibold">${C360.esc(code)}</div><div class="text-xs text-secondary">À vérifier sur campus360.edu/verifier</div></div>
      <div class="text-center"><div class="stamp mx-auto mb-2">Cachet et<br>signature</div><div class="fw-semibold text-sm">Le Directeur de la scolarité</div></div></div>
      <div class="doc-footer">Document généré par Campus360. Toute falsification est passible de poursuites.</div>`;
  }

  const code = (prefix, id) => `${prefix}-${new Date().getFullYear()}-${String(id).padStart(5, '0')}-${(id * 7919 % 9973).toString(36).toUpperCase()}`;

  const T = {
    recu(paiementId) {
      const { db, esc, fmt, labels, rules } = C360;
      const p = db.get('paiements', paiementId);
      if (!p) return '<div class="alert alert-warning">Paiement introuvable.</div>';
      const e = db.get('etudiants', p.etudiant_id);
      const s = rules.situationFinanciere(e.id, p.annee_id);
      return `<div class="doc-sheet">${head(p.numero_recu)}
        <div class="doc-title">Reçu de paiement</div>
        ${p.statut !== 'Validé' ? '<div class="alert alert-danger text-center fw-bold">REÇU ANNULÉ — SANS VALEUR</div>' : ''}
        <table class="table table-bordered">
          <tr><th style="width:35%">N° de reçu</th><td class="font-monospace fw-bold">${esc(p.numero_recu)}</td></tr>
          <tr><th>Date du paiement</th><td>${fmt.date(p.date)}</td></tr>
          <tr><th>Étudiant</th><td>${esc(e.prenom)} ${esc(e.nom.toUpperCase())} — <span class="font-monospace">${esc(e.matricule)}</span></td></tr>
          <tr><th>Formation</th><td>${esc(labels.filiere(e.filiere_id))} — ${esc(db.get('niveaux', e.niveau_id).nom)} (${esc(labels.annee(p.annee_id))})</td></tr>
          <tr><th>Motif</th><td>${esc(p.motif)}</td></tr>
          <tr><th>Mode de paiement</th><td>${esc(p.mode)}${p.reference_externe ? ` — réf. ${esc(p.reference_externe)}` : ''}</td></tr>
          <tr><th>Montant</th><td class="fs-5 fw-bold">${fmt.money(p.montant)}</td></tr>
          <tr><th>Montant en lettres</th><td class="fst-italic">${esc(rules.montantEnLettres(p.montant))} francs CFA</td></tr>
        </table>
        <h6 class="fw-bold mt-4">Situation financière à ce jour</h6>
        <table class="table table-sm table-bordered text-center"><thead><tr><th>Montant total</th><th>Total versé</th><th>Reste à payer</th><th>Taux</th></tr></thead>
          <tbody><tr><td>${fmt.money(s.total)}</td><td>${fmt.money(s.verse)}</td><td class="fw-bold">${fmt.money(s.reste)}</td><td>${s.taux} %</td></tr></tbody></table>
        <div class="text-sm mt-3">Encaissé par : <strong>${esc(p.saisi_par)}</strong></div>
        ${foot(code('RCP', p.id))}</div>`;
    },

    attestation(etuId) {
      const { db, esc, fmt, labels } = C360;
      const e = db.get('etudiants', etuId);
      const insc = db.where('inscriptions', (i) => i.etudiant_id === e.id && i.annee_id === db.settings().annee_courante_id)[0];
      const ok = insc && insc.statut === 'Validée';
      return `<div class="doc-sheet">${head(`ATT-${e.matricule}`)}
        <div class="doc-title">Attestation d'inscription</div>
        ${ok ? '' : '<div class="alert alert-warning no-print">Attention : l\'inscription de l\'année en cours n\'est pas validée. Ce document ne devrait pas être délivré.</div>'}
        <p style="line-height:2">Le Directeur de la scolarité de l'${esc(db.settings().nom_universite)} atteste que :</p>
        <p class="fs-5 fw-bold text-center my-4">${e.sexe === 'F' ? 'Mme' : 'M.'} ${esc(e.prenom)} ${esc(e.nom.toUpperCase())}</p>
        <p style="line-height:2">né${e.sexe === 'F' ? 'e' : ''} le <strong>${fmt.dateLong(e.date_naissance)}</strong> à <strong>${esc(e.lieu_naissance || '—')}</strong>, matricule <strong class="font-monospace">${esc(e.matricule)}</strong>,
        est régulièrement inscrit${e.sexe === 'F' ? 'e' : ''} en <strong>${esc(db.get('niveaux', e.niveau_id).nom)}</strong>, filière <strong>${esc(labels.filiere(e.filiere_id))}</strong>
        (${esc(labels.faculte(db.get('filieres', e.filiere_id).faculte_id))}), au titre de l'année académique <strong>${esc(labels.annee(db.settings().annee_courante_id))}</strong>.</p>
        <p style="line-height:2">En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p>
        ${foot(code('ATT', e.id))}</div>`;
    },

    certificat(etuId) {
      const { db, esc, fmt, labels } = C360;
      const e = db.get('etudiants', etuId);
      const insc = db.where('inscriptions', (i) => i.etudiant_id === e.id && i.statut === 'Validée').sort((a, b) => a.annee_id - b.annee_id);
      return `<div class="doc-sheet">${head(`CS-${e.matricule}`)}
        <div class="doc-title">Certificat de scolarité</div>
        <p style="line-height:2">Je soussigné, Directeur de la scolarité, certifie que <strong>${e.sexe === 'F' ? 'Mme' : 'M.'} ${esc(e.prenom)} ${esc(e.nom.toUpperCase())}</strong>,
        né${e.sexe === 'F' ? 'e' : ''} le ${fmt.dateLong(e.date_naissance)} à ${esc(e.lieu_naissance || '—')}, matricule <span class="font-monospace">${esc(e.matricule)}</span>, suit régulièrement les enseignements dispensés dans notre établissement.</p>
        <h6 class="fw-bold mt-4">Parcours</h6>
        <table class="table table-bordered table-sm"><thead><tr><th>Année académique</th><th>Filière</th><th>Niveau</th></tr></thead><tbody>
          ${insc.map((i) => `<tr><td>${esc(labels.annee(i.annee_id))}</td><td>${esc(labels.filiere(i.filiere_id))}</td><td>${esc(db.get('niveaux', i.niveau_id).nom)}</td></tr>`).join('') || '<tr><td colspan="3">Aucune inscription validée</td></tr>'}
        </tbody></table>
        <p style="line-height:2">Le présent certificat est délivré à l'intéressé${e.sexe === 'F' ? 'e' : ''} pour servir et valoir ce que de droit.</p>
        ${foot(code('CS', e.id))}</div>`;
    },

    releve(etuId) {
      const { db, esc, fmt, labels, rules } = C360;
      const e = db.get('etudiants', etuId);
      const sem = rules.moyenneSemestre(e.id, 1);
      const byUe = {};
      sem.detail.forEach((d) => { (byUe[d.matiere.ue_id] = byUe[d.matiere.ue_id] || []).push(d); });
      return `<div class="doc-sheet">${head(`RN-${e.matricule}`)}
        <div class="doc-title">Relevé de notes — Semestre 1</div>
        <table class="table table-sm table-borderless mb-3"><tr><td><strong>Nom et prénom(s) :</strong> ${esc(e.nom.toUpperCase())} ${esc(e.prenom)}</td><td><strong>Matricule :</strong> <span class="font-monospace">${esc(e.matricule)}</span></td></tr>
          <tr><td><strong>Formation :</strong> ${esc(labels.filiere(e.filiere_id))} — ${esc(db.get('niveaux', e.niveau_id).nom)}</td><td><strong>Année :</strong> ${esc(labels.annee(db.settings().annee_courante_id))}</td></tr></table>
        <table class="table table-bordered table-sm"><thead class="table-light"><tr><th>Code</th><th>Matière</th><th class="text-center">Coef.</th><th class="text-center">Crédits</th><th class="text-center">Moyenne /20</th><th class="text-center">Résultat</th></tr></thead><tbody>
        ${Object.entries(byUe).map(([ueId, list]) => { const ue = db.get('ues', ueId); return `<tr class="table-light"><td colspan="6" class="fw-bold">${esc(ue.code)} — ${esc(ue.intitule)}</td></tr>${list.map(({ matiere: m, moyenne }) => `<tr><td class="font-monospace">${esc(m.code)}</td><td>${esc(m.intitule)}</td><td class="text-center">${m.coefficient}</td><td class="text-center">${m.credits}</td><td class="text-center fw-semibold">${fmt.note(moyenne)}</td><td class="text-center">${moyenne === null ? '—' : moyenne >= 10 ? 'Validé' : 'Non validé'}</td></tr>`).join('')}`; }).join('') || '<tr><td colspan="6" class="text-center">Aucune note</td></tr>'}
        </tbody><tfoot><tr class="fw-bold"><td colspan="4" class="text-end">Moyenne semestrielle</td><td class="text-center">${fmt.note(sem.moyenne)}</td><td class="text-center">${sem.credits} crédits</td></tr>
        <tr class="fw-bold"><td colspan="4" class="text-end">Décision</td><td colspan="2" class="text-center">${esc(sem.decision)}</td></tr></tfoot></table>
        ${foot(code('RN', e.id))}</div>`;
    },

    fiche(etuId) {
      const { db, esc, fmt, labels, rules, ui } = C360;
      const e = db.get('etudiants', etuId);
      const s = rules.situationFinanciere(e.id);
      const st = rules.statsPresence(e.id);
      return `<div class="doc-sheet">${head(`FI-${e.matricule}`)}
        <div class="doc-title">Fiche individuelle de l'étudiant</div>
        <div class="d-flex gap-4 mb-3">${ui.avatar(`${e.prenom} ${e.nom}`, 'xl', e.photo)}
          <table class="table table-sm table-borderless mb-0"><tr><th>Nom</th><td>${esc(e.nom.toUpperCase())}</td><th>Prénom(s)</th><td>${esc(e.prenom)}</td></tr>
          <tr><th>Matricule</th><td class="font-monospace">${esc(e.matricule)}</td><th>Sexe</th><td>${e.sexe === 'F' ? 'Féminin' : 'Masculin'}</td></tr>
          <tr><th>Né(e) le</th><td>${fmt.date(e.date_naissance)}</td><th>À</th><td>${esc(e.lieu_naissance || '—')}</td></tr>
          <tr><th>Nationalité</th><td>${esc(e.nationalite || '—')}</td><th>Statut</th><td>${esc(e.statut)}</td></tr></table></div>
        <h6 class="fw-bold">Coordonnées</h6>
        <table class="table table-sm table-bordered"><tr><th>Adresse</th><td>${esc(e.adresse || '—')}</td></tr><tr><th>Téléphone</th><td>${esc(e.telephone)}</td></tr><tr><th>E-mail</th><td>${esc(e.email)}</td></tr><tr><th>Parent / tuteur</th><td>${esc(e.tuteur_nom || '—')} — ${esc(e.tuteur_telephone || '')}</td></tr></table>
        <h6 class="fw-bold">Formation</h6>
        <table class="table table-sm table-bordered"><tr><th>Filière</th><td>${esc(labels.filiere(e.filiere_id))}</td><th>Niveau</th><td>${esc(db.get('niveaux', e.niveau_id).nom)}</td></tr><tr><th>Année</th><td>${esc(labels.annee(e.annee_id))}</td><th>Faculté</th><td>${esc(labels.faculte(db.get('filieres', e.filiere_id).faculte_id))}</td></tr></table>
        <h6 class="fw-bold">Situation financière</h6>
        <table class="table table-sm table-bordered text-center"><thead><tr><th>Total</th><th>Versé</th><th>Reste</th><th>Taux</th></tr></thead><tbody><tr><td>${fmt.money(s.total)}</td><td>${fmt.money(s.verse)}</td><td>${fmt.money(s.reste)}</td><td>${s.taux} %</td></tr></tbody></table>
        <h6 class="fw-bold">Assiduité</h6>
        <table class="table table-sm table-bordered text-center"><thead><tr><th>Présence</th><th>Absences</th><th>Non justifiées</th><th>Retards</th></tr></thead><tbody><tr><td>${st.taux} %</td><td>${st.absences}</td><td>${st.nonJustifiees}</td><td>${st.retards}</td></tr></tbody></table>
        ${foot(code('FI', e.id))}</div>`;
    },
  };

  C360.docs = { render: (type, id) => (T[type] ? T[type](id) : '<div class="alert alert-warning">Type de document inconnu.</div>'), types: Object.keys(T) };
})();
