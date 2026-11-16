/* ==========================================================================
   Campus360 — Couche "services" (API simulée + règles de gestion)
   --------------------------------------------------------------------------
   En attendant Django, les données sont persistées dans le localStorage du
   navigateur. Toutes les pages passent par C360.db / C360.rules : pour brancher
   le back-end, il suffira de remplacer ces fonctions par des appels fetch()
   vers les vues Django (ou de rendre les données côté serveur).

   IMPORTANT : les règles de gestion ci-dessous sont implémentées ici pour
   l'ergonomie (retour immédiat à l'utilisateur), mais elles DOIVENT être
   ré-appliquées côté serveur (Django) : le front n'est jamais une garantie.
   ========================================================================== */
(function () {
  'use strict';
  const STORAGE_KEY = 'c360_db';
  const C360 = (window.C360 = window.C360 || {});

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === window.C360_SEED.version) return parsed;
      }
    } catch (e) { /* stockage indisponible : on repart des données de démo */ }
    return clone(window.C360_SEED);
  }

  let state = load();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* mode privé */ }
  }

  /* ---------------------------------------------------------------- db --- */
  C360.db = {
    all(collection) { return state[collection] || []; },
    get(collection, id) { return (state[collection] || []).find((x) => x.id === Number(id)) || null; },
    where(collection, predicate) { return (state[collection] || []).filter(predicate); },
    nextId(collection) { return (state[collection] || []).reduce((m, x) => Math.max(m, x.id), 0) + 1; },
    insert(collection, obj) {
      const row = Object.assign({ id: this.nextId(collection) }, obj);
      if (!state[collection]) state[collection] = [];
      state[collection].push(row);
      persist();
      return row;
    },
    update(collection, id, patch) {
      const row = this.get(collection, id);
      if (!row) return null;
      Object.assign(row, patch);
      persist();
      return row;
    },
    remove(collection, id) {
      state[collection] = (state[collection] || []).filter((x) => x.id !== Number(id));
      persist();
    },
    settings() { return state.parametres; },
    raw() { return state; },
    save: persist,
    reset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      state = clone(window.C360_SEED);
    },
  };

  /* ---------------------------------------------------- libellés utiles --- */
  const L = (C360.labels = {
    filiere(id) { const f = C360.db.get('filieres', id); return f ? f.nom : '—'; },
    filiereCode(id) { const f = C360.db.get('filieres', id); return f ? f.code : '—'; },
    niveau(id) { const n = C360.db.get('niveaux', id); return n ? n.code : '—'; },
    annee(id) { const a = C360.db.get('annees', id); return a ? a.libelle : '—'; },
    faculte(id) { const f = C360.db.get('facultes', id); return f ? f.nom : '—'; },
    salle(id) { const s = C360.db.get('salles', id); return s ? s.code : '—'; },
    matiere(id) { const m = C360.db.get('matieres', id); return m ? m.intitule : '—'; },
    enseignant(id) { const e = C360.db.get('enseignants', id); return e ? `${e.civilite} ${e.prenom} ${e.nom}` : '—'; },
    etudiant(id) { const e = C360.db.get('etudiants', id); return e ? `${e.prenom} ${e.nom}` : '—'; },
    groupe(filiereId, niveauId) { return `${L.filiereCode(filiereId)}-${L.niveau(niveauId)}`; },
    jour(n) { return ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][n] || '—'; },
  });

  /* --------------------------------------------------- règles de gestion --- */
  const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  C360.rules = {
    /** Frais applicables (inscription + scolarité) selon filière / niveau / année. */
    fraisPour(filiereId, niveauId, anneeId) {
      const annee = anneeId || C360.db.settings().annee_courante_id;
      return C360.db.all('frais').find((f) => f.filiere_id === Number(filiereId) && f.niveau_id === Number(niveauId) && f.annee_id === Number(annee)) || null;
    },

    /** Situation financière : total, versé, reste (= total − versé), taux. */
    situationFinanciere(etudiantId, anneeId) {
      const annee = anneeId || C360.db.settings().annee_courante_id;
      const etu = C360.db.get('etudiants', etudiantId);
      if (!etu) return null;
      const fr = this.fraisPour(etu.filiere_id, etu.niveau_id, annee);
      const total = fr ? fr.frais_inscription + fr.frais_scolarite : 0;
      const verse = C360.db
        .where('paiements', (p) => p.etudiant_id === etu.id && p.annee_id === annee && p.statut === 'Validé')
        .reduce((s, p) => s + p.montant, 0);
      const reste = Math.max(0, total - verse);
      const taux = total > 0 ? Math.round((verse / total) * 100) : 0;
      let statut = 'Impayé';
      if (reste === 0 && total > 0) statut = 'Soldé';
      else if (verse > 0) statut = 'Partiel';
      return { total, verse, reste, taux, statut };
    },

    /**
     * Contrôle d'un paiement avant enregistrement.
     * - montant > 0
     * - pas supérieur au solde (sauf opération exceptionnelle autorisée)
     * - pas de doublon (même étudiant, même montant, même date, même référence externe)
     */
    verifierPaiement({ etudiant_id, montant, date, reference_externe, exceptionnel }) {
      const errors = [];
      const m = Number(montant);
      if (!etudiant_id) errors.push('Veuillez sélectionner un étudiant.');
      if (!Number.isFinite(m) || m <= 0) errors.push('Le montant doit être strictement positif.');
      const sit = etudiant_id ? this.situationFinanciere(etudiant_id) : null;
      if (sit && m > sit.reste && !exceptionnel) {
        errors.push(`Le montant (${C360.fmt.money(m)}) dépasse le solde restant (${C360.fmt.money(sit.reste)}). Cochez « opération exceptionnelle » si elle est autorisée.`);
      }
      const doublon = C360.db.all('paiements').find((p) => p.statut === 'Validé' && p.etudiant_id === Number(etudiant_id) && p.montant === m && p.date === date &&
        (!reference_externe || p.reference_externe === reference_externe));
      if (doublon) errors.push(`Un paiement identique existe déjà (reçu ${doublon.numero_recu}). Enregistrement bloqué pour éviter un doublon.`);
      return { ok: errors.length === 0, errors, situation: sit };
    },

    /** Numéro de reçu unique et séquentiel. */
    prochainNumeroRecu() {
      const year = new Date().getFullYear();
      const max = C360.db.all('paiements').reduce((acc, p) => {
        const n = Number(String(p.numero_recu).split('-').pop());
        return Number.isFinite(n) ? Math.max(acc, n) : acc;
      }, 0);
      return `REC-${year}-${String(max + 1).padStart(6, '0')}`;
    },

    /** Un étudiant ne peut avoir deux inscriptions identiques (même année + même formation), sauf dérogation. */
    verifierInscription({ etudiant_id, annee_id, filiere_id, niveau_id, derogation, ignoreId }) {
      const existante = C360.db.all('inscriptions').find((i) => i.id !== ignoreId && i.etudiant_id === Number(etudiant_id) &&
        i.annee_id === Number(annee_id) && i.filiere_id === Number(filiere_id) && i.niveau_id === Number(niveau_id) && i.statut !== 'Rejetée');
      if (existante && !derogation) {
        return { ok: false, errors: [`Cet étudiant possède déjà une inscription ${L.groupe(filiere_id, niveau_id)} pour ${L.annee(annee_id)} (statut : ${existante.statut}).`] };
      }
      return { ok: true, errors: [] };
    },

    /** Matricule unique : C360-<année>-<séquence>. */
    genererMatricule(anneeLibelle) {
      const prefix = `C360-${String(anneeLibelle).slice(0, 4)}-`;
      const max = C360.db.all('etudiants').reduce((acc, e) => Math.max(acc, Number(e.matricule.split('-').pop()) || 0), 0);
      return prefix + String(max + 1).padStart(4, '0');
    },

    /** Conflits d'horaires : même enseignant, même salle ou même groupe au même moment. */
    conflitsSeance(seance) {
      const debut = toMinutes(seance.debut);
      const fin = toMinutes(seance.fin);
      const conflits = [];
      if (fin <= debut) conflits.push('L\'heure de fin doit être postérieure à l\'heure de début.');
      C360.db.all('seances').forEach((s) => {
        if (s.id === seance.id || s.jour !== Number(seance.jour)) return;
        const chevauche = toMinutes(s.debut) < fin && debut < toMinutes(s.fin);
        if (!chevauche) return;
        const creneau = `${L.jour(s.jour)} ${s.debut}–${s.fin}`;
        if (s.enseignant_id === Number(seance.enseignant_id)) conflits.push(`Enseignant déjà occupé (${L.matiere(s.matiere_id)}, ${creneau}).`);
        if (s.salle_id === Number(seance.salle_id)) conflits.push(`Salle ${L.salle(s.salle_id)} déjà réservée (${creneau}).`);
        if (s.filiere_id === Number(seance.filiere_id) && s.niveau_id === Number(seance.niveau_id)) conflits.push(`Le groupe ${L.groupe(s.filiere_id, s.niveau_id)} a déjà cours (${creneau}).`);
      });
      const salle = C360.db.get('salles', seance.salle_id);
      if (salle) {
        const effectif = C360.db.where('etudiants', (e) => e.statut === 'Actif' && e.filiere_id === Number(seance.filiere_id) && e.niveau_id === Number(seance.niveau_id)).length;
        if (effectif > salle.capacite) conflits.push(`Capacité insuffisante : ${effectif} étudiants pour ${salle.capacite} places.`);
        if (salle.statut !== 'Disponible') conflits.push(`La salle ${salle.code} est indisponible (${salle.statut}).`);
      }
      return conflits;
    },

    /** Moyenne d'un étudiant dans une matière (pondérée par le poids des évaluations). */
    moyenneMatiere(etudiantId, matiereId) {
      const evals = C360.db.where('evaluations', (e) => e.matiere_id === Number(matiereId));
      let somme = 0; let poids = 0;
      evals.forEach((ev) => {
        const n = C360.db.all('notes').find((x) => x.evaluation_id === ev.id && x.etudiant_id === Number(etudiantId));
        if (!n) return;
        const val = n.absent ? 0 : (n.valeur / ev.note_max) * 20;
        somme += val * ev.poids; poids += ev.poids;
      });
      return poids ? Math.round((somme / poids) * 100) / 100 : null;
    },

    /** Moyenne semestrielle pondérée par les coefficients des matières. */
    moyenneSemestre(etudiantId, semestreId) {
      const etu = C360.db.get('etudiants', etudiantId);
      if (!etu) return null;
      const uesIds = C360.db.where('ues', (u) => u.filiere_id === etu.filiere_id && u.niveau_id === etu.niveau_id && u.semestre_id === Number(semestreId)).map((u) => u.id);
      const mats = C360.db.where('matieres', (m) => uesIds.includes(m.ue_id));
      let somme = 0; let coefs = 0; let credits = 0;
      const detail = mats.map((m) => {
        const moy = this.moyenneMatiere(etudiantId, m.id);
        if (moy !== null) {
          somme += moy * m.coefficient; coefs += m.coefficient;
          if (moy >= C360.db.settings().moyenne_validation) credits += m.credits;
        }
        return { matiere: m, moyenne: moy };
      });
      const moyenne = coefs ? Math.round((somme / coefs) * 100) / 100 : null;
      return { moyenne, credits, detail, decision: this.decision(moyenne) };
    },

    decision(moyenne) {
      if (moyenne === null) return 'Non évalué';
      if (moyenne >= 16) return 'Admis — Très bien';
      if (moyenne >= 14) return 'Admis — Bien';
      if (moyenne >= 12) return 'Admis — Assez bien';
      if (moyenne >= 10) return 'Admis — Passable';
      return 'Ajourné';
    },

    /** Statistiques de présence d'un étudiant. */
    statsPresence(etudiantId) {
      const rows = C360.db.where('presences', (p) => p.etudiant_id === Number(etudiantId));
      const absences = rows.filter((p) => p.statut === 'Absent');
      return {
        total: rows.length,
        presents: rows.filter((p) => p.statut === 'Présent').length,
        absences: absences.length,
        nonJustifiees: absences.filter((p) => !p.justifiee).length,
        retards: rows.filter((p) => p.statut === 'Retard').length,
        taux: rows.length ? Math.round((rows.filter((p) => p.statut !== 'Absent').length / rows.length) * 100) : 100,
      };
    },
  };

  /** Montant en toutes lettres (reçus) — ex. 125000 → « cent vingt-cinq mille ». */
  C360.rules.montantEnLettres = function (n) {
    const u = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
    const d = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    function sous100(x) {
      if (x <= 16) return u[x];
      if (x < 20) return `dix-${u[x - 10]}`;
      if (x < 70) { const t = Math.floor(x / 10); const r = x % 10; return d[t] + (r === 0 ? '' : r === 1 ? '-et-un' : `-${u[r]}`); }
      if (x < 80) return x === 71 ? 'soixante-et-onze' : `soixante-${sous100(x - 60)}`;
      if (x === 80) return 'quatre-vingts';
      return `quatre-vingt-${sous100(x - 80)}`;
    }
    function sous1000(x) {
      const c = Math.floor(x / 100); const r = x % 100;
      let s = c === 0 ? '' : c === 1 ? 'cent' : `${u[c]} cent${r === 0 ? 's' : ''}`;
      if (r) s += (s ? ' ' : '') + sous100(r);
      return s || 'zéro';
    }
    n = Math.round(Number(n) || 0);
    if (n === 0) return 'zéro';
    const parts = [];
    const millions = Math.floor(n / 1e6); const milliers = Math.floor((n % 1e6) / 1000); const reste = n % 1000;
    if (millions) parts.push(`${sous1000(millions)} million${millions > 1 ? 's' : ''}`);
    if (milliers) parts.push(milliers === 1 ? 'mille' : `${sous1000(milliers).replace(/cents$/, 'cent')} mille`);
    if (reste) parts.push(sous1000(reste));
    return parts.join(' ');
  };

  /** Journal d'audit (paiements, annulations, corrections…). */
  C360.audit = function (action, details) {
    C360.db.insert('audit', { date: new Date().toISOString().slice(0, 16).replace('T', ' '), utilisateur: C360.session ? C360.session.user().nom : '—', action, details });
  };

  /* ------------------------------------------------------------- formats --- */
  C360.fmt = {
    money(n) { return `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ /g, ' ')} FCFA`; },
    number(n) { return new Intl.NumberFormat('fr-FR').format(Number(n) || 0).replace(/ /g, ' '); },
    date(iso) {
      if (!iso) return '—';
      const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso.replace(' ', 'T'));
      return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
    },
    dateLong(iso) {
      const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    today() { return new Date().toISOString().slice(0, 10); },
    note(v) { return v === null || v === undefined ? '—' : Number(v).toFixed(2).replace('.', ','); },
  };
})();
