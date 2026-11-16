/* ==========================================================================
   Campus360 — Données de démonstration
   --------------------------------------------------------------------------
   Ce fichier simule la base de données en attendant le back-end Django.
   Chaque collection correspond à un futur modèle Django (voir README.md).
   Il sera supprimé lorsque les pages consommeront les vraies vues / API.
   ========================================================================== */
(function () {
  'use strict';

  // Générateur pseudo-aléatoire déterministe : mêmes données à chaque chargement.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(360);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pad = (n, l) => String(n).padStart(l, '0');
  const isoDate = (d) => d.toISOString().slice(0, 10);

  const annees = [
    { id: 1, libelle: '2024-2025', date_debut: '2024-10-01', date_fin: '2025-07-31', statut: 'Clôturée' },
    { id: 2, libelle: '2025-2026', date_debut: '2025-10-01', date_fin: '2026-07-31', statut: 'Clôturée' },
    { id: 3, libelle: '2026-2027', date_debut: '2026-10-01', date_fin: '2027-07-31', statut: 'En cours' },
  ];

  const facultes = [
    { id: 1, code: 'FST', nom: 'Faculté des Sciences et Techniques', responsable: 'Pr. Seydou Keïta' },
    { id: 2, code: 'FSEG', nom: 'Faculté des Sciences Économiques et de Gestion', responsable: 'Pr. Mariam Touré' },
    { id: 3, code: 'FLSH', nom: 'Faculté des Lettres et Sciences Humaines', responsable: 'Pr. Adama Ouédraogo' },
    { id: 4, code: 'FDSP', nom: 'Faculté de Droit et Science Politique', responsable: 'Pr. Kadiatou Sow' },
  ];

  const filieres = [
    { id: 1, code: 'INF', nom: 'Informatique', faculte_id: 1 },
    { id: 2, code: 'MATH', nom: 'Mathématiques appliquées', faculte_id: 1 },
    { id: 3, code: 'GEST', nom: 'Gestion des entreprises', faculte_id: 2 },
    { id: 4, code: 'ECO', nom: 'Économie', faculte_id: 2 },
    { id: 5, code: 'COM', nom: 'Communication', faculte_id: 3 },
    { id: 6, code: 'DRT', nom: 'Droit privé', faculte_id: 4 },
  ];

  const niveaux = [
    { id: 1, code: 'L1', nom: 'Licence 1', ordre: 1 },
    { id: 2, code: 'L2', nom: 'Licence 2', ordre: 2 },
    { id: 3, code: 'L3', nom: 'Licence 3', ordre: 3 },
    { id: 4, code: 'M1', nom: 'Master 1', ordre: 4 },
    { id: 5, code: 'M2', nom: 'Master 2', ordre: 5 },
  ];

  const semestres = [
    { id: 1, libelle: 'Semestre 1', annee_id: 3, date_debut: '2026-10-05', date_fin: '2027-02-15', statut: 'En cours' },
    { id: 2, libelle: 'Semestre 2', annee_id: 3, date_debut: '2027-02-22', date_fin: '2027-07-15', statut: 'À venir' },
  ];

  // Grille tarifaire : frais par filière et niveau (FCFA)
  const frais = [];
  let fraisId = 1;
  filieres.forEach((f) => {
    niveaux.forEach((n) => {
      const base = { INF: 450000, MATH: 380000, GEST: 420000, ECO: 380000, COM: 350000, DRT: 360000 }[f.code];
      frais.push({
        id: fraisId++, annee_id: 3, filiere_id: f.id, niveau_id: n.id,
        frais_inscription: n.ordre >= 4 ? 75000 : 50000,
        frais_scolarite: base + (n.ordre - 1) * 25000 + (n.ordre >= 4 ? 100000 : 0),
        nb_tranches: 3,
      });
    });
  });

  const prenomsF = ['Aminata', 'Fatoumata', 'Aïssata', 'Mariam', 'Kadiatou', 'Awa', 'Salimata', 'Rokia', 'Djeneba', 'Oumou', 'Assétou', 'Nafissatou', 'Hawa', 'Bintou'];
  const prenomsM = ['Moussa', 'Ibrahim', 'Seydou', 'Abdoulaye', 'Mamadou', 'Oumar', 'Souleymane', 'Boubacar', 'Adama', 'Lassina', 'Yacouba', 'Drissa', 'Issa', 'Karim'];
  const noms = ['Traoré', 'Coulibaly', 'Diarra', 'Keïta', 'Konaté', 'Sangaré', 'Diallo', 'Touré', 'Cissé', 'Ouattara', 'Sanogo', 'Koné', 'Dembélé', 'Sidibé', 'Bamba', 'Kaboré', 'Ouédraogo', 'Sow'];
  const villes = ['Bamako', 'Ouagadougou', 'Abidjan', 'Dakar', 'Bobo-Dioulasso', 'Sikasso', 'Ségou', 'Bouaké'];
  const quartiers = ['Hamdallaye', 'Badalabougou', 'Kalaban Coura', 'Cocody', 'Plateau', 'Médina', 'Koulouba', 'Sébénikoro'];

  const etudiants = [];
  const inscriptions = [];
  const paiements = [];
  let recuSeq = 1;
  let paiementId = 1;
  let inscriptionId = 1;

  for (let i = 1; i <= 48; i++) {
    const sexe = rand() > 0.5 ? 'F' : 'M';
    const prenom = pick(sexe === 'F' ? prenomsF : prenomsM);
    const nom = pick(noms);
    const filiere = pick(filieres);
    const niveau = niveaux[Math.min(4, Math.floor(rand() * rand() * 5.5))];
    const anneeEntree = niveau.ordre >= 3 ? 1 : (niveau.ordre === 2 ? 2 : 3);
    const naissance = new Date(1998 + between(0, 9), between(0, 11), between(1, 28));
    const archive = i % 23 === 0;
    const etu = {
      id: i,
      matricule: `C360-${annees[anneeEntree - 1].libelle.slice(0, 4)}-${pad(i, 4)}`,
      nom, prenom, sexe,
      date_naissance: isoDate(naissance),
      lieu_naissance: pick(villes),
      nationalite: pick(['Malienne', 'Burkinabè', 'Ivoirienne', 'Sénégalaise']),
      email: `${prenom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i}@etu.campus360.edu`,
      telephone: `+223 ${between(60, 99)} ${pad(between(0, 99), 2)} ${pad(between(0, 99), 2)} ${pad(between(0, 99), 2)}`,
      adresse: `${pick(quartiers)}, ${pick(villes)}`,
      tuteur_nom: `${pick(prenomsM)} ${nom}`,
      tuteur_telephone: `+223 ${between(60, 99)} ${pad(between(0, 99), 2)} ${pad(between(0, 99), 2)} ${pad(between(0, 99), 2)}`,
      filiere_id: filiere.id,
      niveau_id: niveau.id,
      annee_id: 3,
      photo: null,
      statut: archive ? 'Archivé' : 'Actif',
      date_creation: `${annees[anneeEntree - 1].libelle.slice(0, 4)}-10-${pad(between(1, 28), 2)}`,
    };
    etudiants.push(etu);

    // Historique d'inscriptions (années précédentes + année en cours)
    for (let a = anneeEntree; a <= 3; a++) {
      const niv = niveaux[Math.max(0, niveau.ordre - 1 - (3 - a))];
      const courante = a === 3;
      let statut = 'Validée';
      if (courante) statut = i % 7 === 0 ? 'En attente' : (i % 19 === 0 ? 'Rejetée' : (i % 11 === 0 ? 'En attente' : 'Validée'));
      inscriptions.push({
        id: inscriptionId++,
        etudiant_id: i,
        annee_id: a,
        filiere_id: filiere.id,
        niveau_id: niv.id,
        type: a === anneeEntree ? 'Nouvelle' : 'Réinscription',
        date: `${annees[a - 1].libelle.slice(0, 4)}-${pick(['09', '10'])}-${pad(between(1, 28), 2)}`,
        statut,
        pieces: { acte_naissance: true, diplome: rand() > 0.15, photo: rand() > 0.1, certificat_medical: rand() > 0.3 },
        motif_rejet: statut === 'Rejetée' ? 'Diplôme non conforme' : '',
        derogation: false,
      });
    }

    // Paiements de l'année en cours pour les inscriptions validées
    const fr = frais.find((x) => x.filiere_id === filiere.id && x.niveau_id === niveau.id);
    const total = fr.frais_inscription + fr.frais_scolarite;
    const ratio = archive ? 0 : pick([1, 1, 0.6, 0.6, 0.4, 0.3, 0.8, 0.1, 1, 0.5]);
    let restantAPayer = Math.round((total * ratio) / 5000) * 5000;
    const nbVersements = restantAPayer === 0 ? 0 : between(1, 3);
    for (let p = 0; p < nbVersements && restantAPayer > 0; p++) {
      const montant = p === nbVersements - 1 ? restantAPayer : Math.round(restantAPayer / (nbVersements - p) / 5000) * 5000;
      restantAPayer -= montant;
      const d = new Date(2026, 9 + p, between(1, 28));
      if (d > new Date(2026, 10, 15)) d.setMonth(10, between(1, 14));
      paiements.push({
        id: paiementId++,
        reference: `PAY-${pad(paiementId, 6)}`,
        numero_recu: `REC-2026-${pad(recuSeq++, 6)}`,
        etudiant_id: i,
        annee_id: 3,
        montant,
        mode: pick(['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque']),
        motif: p === 0 ? 'Frais d\'inscription + 1re tranche' : `Tranche ${p + 1}`,
        date: isoDate(d),
        statut: 'Validé',
        saisi_par: 'Fatou Koné',
        observation: '',
      });
    }
  }
  // Une annulation tracée pour l'exemple
  paiements.push({
    id: paiementId++, reference: `PAY-${pad(paiementId, 6)}`, numero_recu: `REC-2026-${pad(recuSeq++, 6)}`,
    etudiant_id: 3, annee_id: 3, montant: 100000, mode: 'Espèces', motif: 'Tranche 2',
    date: '2026-11-03', statut: 'Annulé', saisi_par: 'Fatou Koné', observation: 'Doublon de saisie — annulé par la comptabilité',
  });

  const enseignants = [
    { id: 1, matricule: 'ENS-001', civilite: 'Dr.', nom: 'Sanogo', prenom: 'Ibrahim', specialite: 'Génie logiciel', grade: 'Maître de conférences', statut_contrat: 'Permanent', email: 'i.sanogo@campus360.edu', telephone: '+223 76 12 45 89', faculte_id: 1, statut: 'Actif' },
    { id: 2, matricule: 'ENS-002', civilite: 'Pr.', nom: 'Diarra', prenom: 'Mariam', specialite: 'Analyse numérique', grade: 'Professeur titulaire', statut_contrat: 'Permanent', email: 'm.diarra@campus360.edu', telephone: '+223 66 22 31 07', faculte_id: 1, statut: 'Actif' },
    { id: 3, matricule: 'ENS-003', civilite: 'M.', nom: 'Konaté', prenom: 'Lassina', specialite: 'Réseaux et systèmes', grade: 'Assistant', statut_contrat: 'Vacataire', email: 'l.konate@campus360.edu', telephone: '+223 79 45 10 33', faculte_id: 1, statut: 'Actif' },
    { id: 4, matricule: 'ENS-004', civilite: 'Dr.', nom: 'Cissé', prenom: 'Awa', specialite: 'Bases de données', grade: 'Maître-assistant', statut_contrat: 'Permanent', email: 'a.cisse@campus360.edu', telephone: '+223 65 90 12 44', faculte_id: 1, statut: 'Actif' },
    { id: 5, matricule: 'ENS-005', civilite: 'Dr.', nom: 'Ouattara', prenom: 'Karim', specialite: 'Comptabilité', grade: 'Maître de conférences', statut_contrat: 'Permanent', email: 'k.ouattara@campus360.edu', telephone: '+223 74 33 21 98', faculte_id: 2, statut: 'Actif' },
    { id: 6, matricule: 'ENS-006', civilite: 'Mme', nom: 'Sidibé', prenom: 'Rokia', specialite: 'Marketing', grade: 'Assistante', statut_contrat: 'Vacataire', email: 'r.sidibe@campus360.edu', telephone: '+223 70 11 56 72', faculte_id: 2, statut: 'Actif' },
    { id: 7, matricule: 'ENS-007', civilite: 'Pr.', nom: 'Touré', prenom: 'Boubacar', specialite: 'Macroéconomie', grade: 'Professeur titulaire', statut_contrat: 'Permanent', email: 'b.toure@campus360.edu', telephone: '+223 66 78 09 21', faculte_id: 2, statut: 'Actif' },
    { id: 8, matricule: 'ENS-008', civilite: 'Dr.', nom: 'Kaboré', prenom: 'Salimata', specialite: 'Sociolinguistique', grade: 'Maître-assistante', statut_contrat: 'Permanent', email: 's.kabore@campus360.edu', telephone: '+223 76 54 32 10', faculte_id: 3, statut: 'Actif' },
    { id: 9, matricule: 'ENS-009', civilite: 'Me', nom: 'Bamba', prenom: 'Yacouba', specialite: 'Droit des affaires', grade: 'Maître de conférences', statut_contrat: 'Vacataire', email: 'y.bamba@campus360.edu', telephone: '+223 69 87 65 43', faculte_id: 4, statut: 'Actif' },
    { id: 10, matricule: 'ENS-010', civilite: 'M.', nom: 'Dembélé', prenom: 'Issa', specialite: 'Algorithmique', grade: 'Assistant', statut_contrat: 'Permanent', email: 'i.dembele@campus360.edu', telephone: '+223 78 21 43 65', faculte_id: 1, statut: 'Inactif' },
  ];

  const ues = [
    { id: 1, code: 'UE-INF101', intitule: 'Fondamentaux de l\'informatique', filiere_id: 1, niveau_id: 1, semestre_id: 1, credits: 12 },
    { id: 2, code: 'UE-INF102', intitule: 'Mathématiques pour l\'informatique', filiere_id: 1, niveau_id: 1, semestre_id: 1, credits: 8 },
    { id: 3, code: 'UE-INF103', intitule: 'Langues et communication', filiere_id: 1, niveau_id: 1, semestre_id: 1, credits: 4 },
    { id: 4, code: 'UE-INF301', intitule: 'Développement web', filiere_id: 1, niveau_id: 3, semestre_id: 1, credits: 10 },
    { id: 5, code: 'UE-GES101', intitule: 'Comptabilité et gestion', filiere_id: 3, niveau_id: 1, semestre_id: 1, credits: 10 },
    { id: 6, code: 'UE-ECO101', intitule: 'Principes d\'économie', filiere_id: 4, niveau_id: 1, semestre_id: 1, credits: 10 },
  ];

  const matieres = [
    { id: 1, code: 'INF1011', intitule: 'Algorithmique et programmation', ue_id: 1, coefficient: 4, credits: 6, volume_cm: 30, volume_td: 20, volume_tp: 20, enseignant_id: 10 },
    { id: 2, code: 'INF1012', intitule: 'Architecture des ordinateurs', ue_id: 1, coefficient: 3, credits: 3, volume_cm: 24, volume_td: 12, volume_tp: 0, enseignant_id: 3 },
    { id: 3, code: 'INF1013', intitule: 'Introduction aux bases de données', ue_id: 1, coefficient: 3, credits: 3, volume_cm: 20, volume_td: 10, volume_tp: 10, enseignant_id: 4 },
    { id: 4, code: 'INF1021', intitule: 'Algèbre linéaire', ue_id: 2, coefficient: 3, credits: 4, volume_cm: 24, volume_td: 24, volume_tp: 0, enseignant_id: 2 },
    { id: 5, code: 'INF1022', intitule: 'Logique et mathématiques discrètes', ue_id: 2, coefficient: 3, credits: 4, volume_cm: 24, volume_td: 18, volume_tp: 0, enseignant_id: 2 },
    { id: 6, code: 'INF1031', intitule: 'Anglais technique', ue_id: 3, coefficient: 2, credits: 2, volume_cm: 0, volume_td: 24, volume_tp: 0, enseignant_id: 8 },
    { id: 7, code: 'INF1032', intitule: 'Techniques d\'expression', ue_id: 3, coefficient: 1, credits: 2, volume_cm: 12, volume_td: 12, volume_tp: 0, enseignant_id: 8 },
    { id: 8, code: 'INF3011', intitule: 'Frameworks web (Django)', ue_id: 4, coefficient: 4, credits: 5, volume_cm: 20, volume_td: 10, volume_tp: 30, enseignant_id: 1 },
    { id: 9, code: 'INF3012', intitule: 'Conception d\'interfaces', ue_id: 4, coefficient: 3, credits: 5, volume_cm: 18, volume_td: 12, volume_tp: 20, enseignant_id: 1 },
    { id: 10, code: 'GES1011', intitule: 'Comptabilité générale', ue_id: 5, coefficient: 4, credits: 6, volume_cm: 30, volume_td: 20, volume_tp: 0, enseignant_id: 5 },
    { id: 11, code: 'GES1012', intitule: 'Introduction au marketing', ue_id: 5, coefficient: 3, credits: 4, volume_cm: 24, volume_td: 12, volume_tp: 0, enseignant_id: 6 },
    { id: 12, code: 'ECO1011', intitule: 'Microéconomie', ue_id: 6, coefficient: 4, credits: 5, volume_cm: 30, volume_td: 20, volume_tp: 0, enseignant_id: 7 },
    { id: 13, code: 'ECO1012', intitule: 'Macroéconomie', ue_id: 6, coefficient: 4, credits: 5, volume_cm: 30, volume_td: 20, volume_tp: 0, enseignant_id: 7 },
  ];

  const salles = [
    { id: 1, code: 'A101', nom: 'Amphi Kankou Moussa', type: 'Amphithéâtre', capacite: 300, batiment: 'Bâtiment A', equipements: 'Vidéoprojecteur, sonorisation', statut: 'Disponible' },
    { id: 2, code: 'A102', nom: 'Amphi Soundiata', type: 'Amphithéâtre', capacite: 180, batiment: 'Bâtiment A', equipements: 'Vidéoprojecteur', statut: 'Disponible' },
    { id: 3, code: 'B201', nom: 'Salle B201', type: 'Salle de cours', capacite: 60, batiment: 'Bâtiment B', equipements: 'Tableau interactif', statut: 'Disponible' },
    { id: 4, code: 'B202', nom: 'Salle B202', type: 'Salle de cours', capacite: 45, batiment: 'Bâtiment B', equipements: 'Vidéoprojecteur', statut: 'Disponible' },
    { id: 5, code: 'L01', nom: 'Labo informatique 1', type: 'Laboratoire', capacite: 35, batiment: 'Bâtiment C', equipements: '35 postes, réseau', statut: 'Disponible' },
    { id: 6, code: 'L02', nom: 'Labo informatique 2', type: 'Laboratoire', capacite: 30, batiment: 'Bâtiment C', equipements: '30 postes', statut: 'En maintenance' },
    { id: 7, code: 'B105', nom: 'Salle B105', type: 'Salle de TD', capacite: 40, batiment: 'Bâtiment B', equipements: '—', statut: 'Disponible' },
  ];

  // Groupes = filière + niveau (ex. INF-L1)
  const seances = [
    { id: 1, matiere_id: 1, enseignant_id: 10, salle_id: 1, filiere_id: 1, niveau_id: 1, jour: 1, debut: '08:00', fin: '10:00', type: 'CM' },
    { id: 2, matiere_id: 4, enseignant_id: 2, salle_id: 1, filiere_id: 1, niveau_id: 1, jour: 1, debut: '10:15', fin: '12:15', type: 'CM' },
    { id: 3, matiere_id: 2, enseignant_id: 3, salle_id: 3, filiere_id: 1, niveau_id: 1, jour: 2, debut: '08:00', fin: '10:00', type: 'CM' },
    { id: 4, matiere_id: 1, enseignant_id: 10, salle_id: 5, filiere_id: 1, niveau_id: 1, jour: 2, debut: '14:00', fin: '16:00', type: 'TP' },
    { id: 5, matiere_id: 3, enseignant_id: 4, salle_id: 3, filiere_id: 1, niveau_id: 1, jour: 3, debut: '08:00', fin: '10:00', type: 'CM' },
    { id: 6, matiere_id: 5, enseignant_id: 2, salle_id: 7, filiere_id: 1, niveau_id: 1, jour: 3, debut: '10:15', fin: '12:15', type: 'TD' },
    { id: 7, matiere_id: 6, enseignant_id: 8, salle_id: 4, filiere_id: 1, niveau_id: 1, jour: 4, debut: '08:00', fin: '10:00', type: 'TD' },
    { id: 8, matiere_id: 7, enseignant_id: 8, salle_id: 4, filiere_id: 1, niveau_id: 1, jour: 4, debut: '10:15', fin: '12:15', type: 'CM' },
    { id: 9, matiere_id: 3, enseignant_id: 4, salle_id: 5, filiere_id: 1, niveau_id: 1, jour: 5, debut: '14:00', fin: '16:00', type: 'TP' },
    { id: 10, matiere_id: 8, enseignant_id: 1, salle_id: 5, filiere_id: 1, niveau_id: 3, jour: 1, debut: '14:00', fin: '17:00', type: 'TP' },
    { id: 11, matiere_id: 9, enseignant_id: 1, salle_id: 3, filiere_id: 1, niveau_id: 3, jour: 3, debut: '14:00', fin: '16:00', type: 'CM' },
    { id: 12, matiere_id: 8, enseignant_id: 1, salle_id: 3, filiere_id: 1, niveau_id: 3, jour: 5, debut: '08:00', fin: '10:00', type: 'CM' },
    { id: 13, matiere_id: 10, enseignant_id: 5, salle_id: 2, filiere_id: 3, niveau_id: 1, jour: 1, debut: '08:00', fin: '10:00', type: 'CM' },
    { id: 14, matiere_id: 12, enseignant_id: 7, salle_id: 2, filiere_id: 4, niveau_id: 1, jour: 2, debut: '10:15', fin: '12:15', type: 'CM' },
  ];

  const disponibilites = [
    { id: 1, enseignant_id: 1, jour: 1, debut: '08:00', fin: '18:00' },
    { id: 2, enseignant_id: 1, jour: 3, debut: '08:00', fin: '18:00' },
    { id: 3, enseignant_id: 1, jour: 5, debut: '08:00', fin: '12:00' },
    { id: 4, enseignant_id: 3, jour: 2, debut: '08:00', fin: '12:00' },
  ];

  // Évaluations et notes (matières INF L1 et INF L3)
  const evaluations = [
    { id: 1, matiere_id: 1, libelle: 'Contrôle continu 1', type: 'Devoir', date: '2026-10-28', poids: 40, note_max: 20, statut: 'Notes saisies' },
    { id: 2, matiere_id: 1, libelle: 'Examen final', type: 'Examen', date: '2027-01-20', poids: 60, note_max: 20, statut: 'Planifiée' },
    { id: 3, matiere_id: 4, libelle: 'Contrôle continu 1', type: 'Devoir', date: '2026-11-04', poids: 40, note_max: 20, statut: 'Notes saisies' },
    { id: 4, matiere_id: 2, libelle: 'Interrogation', type: 'Interrogation', date: '2026-11-06', poids: 40, note_max: 20, statut: 'Notes saisies' },
    { id: 5, matiere_id: 8, libelle: 'Projet Django', type: 'Projet', date: '2026-11-10', poids: 50, note_max: 20, statut: 'Notes saisies' },
    { id: 6, matiere_id: 8, libelle: 'Examen final', type: 'Examen', date: '2027-01-22', poids: 50, note_max: 20, statut: 'Planifiée' },
    { id: 7, matiere_id: 9, libelle: 'TP noté', type: 'TP', date: '2026-11-12', poids: 40, note_max: 20, statut: 'En cours de saisie' },
  ];

  const notes = [];
  let noteId = 1;
  evaluations.filter((e) => e.statut !== 'Planifiée').forEach((ev) => {
    const mat = matieres.find((m) => m.id === ev.matiere_id);
    const ue = ues.find((u) => u.id === mat.ue_id);
    etudiants
      .filter((e) => e.filiere_id === ue.filiere_id && e.niveau_id === ue.niveau_id && e.statut === 'Actif')
      .forEach((e) => {
        if (ev.statut === 'En cours de saisie' && rand() > 0.6) return;
        notes.push({ id: noteId++, evaluation_id: ev.id, etudiant_id: e.id, valeur: Math.round((between(40, 190) / 10) * 4) / 4, absent: false });
      });
  });

  // Présences (séances passées)
  const presences = [];
  let presId = 1;
  const datesSeances = ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
  [1, 3, 5, 10].forEach((seanceId) => {
    const s = seances.find((x) => x.id === seanceId);
    datesSeances.forEach((d) => {
      etudiants
        .filter((e) => e.filiere_id === s.filiere_id && e.niveau_id === s.niveau_id && e.statut === 'Actif')
        .forEach((e) => {
          const r = rand();
          const statut = r < 0.82 ? 'Présent' : (r < 0.92 ? 'Absent' : 'Retard');
          presences.push({
            id: presId++, seance_id: s.id, etudiant_id: e.id, date: d, statut,
            justifiee: statut === 'Absent' && rand() > 0.6,
            motif: '', minutes_retard: statut === 'Retard' ? between(5, 30) : 0,
          });
        });
    });
  });

  const users = [
    { id: 1, username: 'admin', nom: 'Traoré', prenom: 'Awa', email: 'admin@campus360.edu', role: 'admin', statut: 'Actif', derniere_connexion: '2026-11-16 08:12' },
    { id: 2, username: 'mdiallo', nom: 'Diallo', prenom: 'Moussa', email: 'scolarite@campus360.edu', role: 'scolarite', statut: 'Actif', derniere_connexion: '2026-11-16 07:58' },
    { id: 3, username: 'fkone', nom: 'Koné', prenom: 'Fatou', email: 'compta@campus360.edu', role: 'comptable', statut: 'Actif', derniere_connexion: '2026-11-15 16:40' },
    { id: 4, username: 'isanogo', nom: 'Sanogo', prenom: 'Ibrahim', email: 'i.sanogo@campus360.edu', role: 'enseignant', statut: 'Actif', derniere_connexion: '2026-11-14 10:05', enseignant_id: 1 },
    { id: 5, username: 'mdiarra', nom: 'Diarra', prenom: 'Mariam', email: 'm.diarra@campus360.edu', role: 'enseignant', statut: 'Actif', derniere_connexion: '2026-11-13 09:21', enseignant_id: 2 },
    { id: 6, username: 'idembele', nom: 'Dembélé', prenom: 'Issa', email: 'i.dembele@campus360.edu', role: 'enseignant', statut: 'Inactif', derniere_connexion: '2026-06-02 11:00', enseignant_id: 10 },
    { id: 7, username: 'C360-2024-0001', nom: etudiants[0].nom, prenom: etudiants[0].prenom, email: etudiants[0].email, role: 'etudiant', statut: 'Actif', derniere_connexion: '2026-11-15 20:14', etudiant_id: 1 },
    { id: 8, username: 'skeita', nom: 'Keïta', prenom: 'Seydou', email: 's.keita@campus360.edu', role: 'scolarite', statut: 'Actif', derniere_connexion: '2026-11-12 14:32' },
  ];

  const connexions = [
    { id: 1, user_id: 1, date: '2026-11-16 08:12', ip: '196.200.54.12', navigateur: 'Chrome 131 / Windows', evenement: 'Connexion réussie', niveau: 'info' },
    { id: 2, user_id: 2, date: '2026-11-16 07:58', ip: '196.200.54.31', navigateur: 'Firefox 132 / Windows', evenement: 'Connexion réussie', niveau: 'info' },
    { id: 3, user_id: 3, date: '2026-11-15 16:40', ip: '196.200.54.40', navigateur: 'Edge 131 / Windows', evenement: 'Connexion réussie', niveau: 'info' },
    { id: 4, user_id: null, date: '2026-11-15 03:14', ip: '41.73.112.9', navigateur: 'curl/8.4', evenement: 'Échec de connexion (admin) — 5 tentatives', niveau: 'danger' },
    { id: 5, user_id: 7, date: '2026-11-15 20:14', ip: '41.221.18.77', navigateur: 'Chrome Mobile / Android', evenement: 'Connexion réussie', niveau: 'info' },
    { id: 6, user_id: 6, date: '2026-11-14 11:02', ip: '196.200.54.12', navigateur: 'Chrome 131 / Windows', evenement: 'Compte désactivé par admin', niveau: 'warning' },
    { id: 7, user_id: 4, date: '2026-11-14 10:05', ip: '196.200.54.88', navigateur: 'Safari / macOS', evenement: 'Connexion réussie', niveau: 'info' },
    { id: 8, user_id: 5, date: '2026-11-13 09:25', ip: '196.200.54.90', navigateur: 'Chrome 131 / Linux', evenement: 'Mot de passe modifié', niveau: 'warning' },
    { id: 9, user_id: 3, date: '2026-11-12 18:30', ip: '196.200.54.40', navigateur: 'Edge 131 / Windows', evenement: 'Annulation du paiement REC-2026-000049', niveau: 'warning' },
    { id: 10, user_id: 8, date: '2026-11-12 14:32', ip: '196.200.54.35', navigateur: 'Chrome 131 / Windows', evenement: 'Réinitialisation de mot de passe demandée', niveau: 'warning' },
    { id: 11, user_id: 1, date: '2026-11-11 09:00', ip: '196.200.54.12', navigateur: 'Chrome 131 / Windows', evenement: 'Rôle « comptable » attribué à fkone', niveau: 'warning' },
  ];

  // Matrice des permissions par rôle (module -> droits)
  const permissions = {
    modules: [
      { code: 'comptes', nom: 'Comptes & permissions' },
      { code: 'etudiants', nom: 'Étudiants' },
      { code: 'inscriptions', nom: 'Inscriptions' },
      { code: 'academique', nom: 'Gestion académique' },
      { code: 'enseignants', nom: 'Enseignants' },
      { code: 'finances', nom: 'Finances & paiements' },
      { code: 'planning', nom: 'Planification' },
      { code: 'notes', nom: 'Notes & résultats' },
      { code: 'presences', nom: 'Présences' },
      { code: 'documents', nom: 'Documents' },
      { code: 'rapports', nom: 'Rapports' },
    ],
    droits: ['voir', 'ajouter', 'modifier', 'supprimer'],
    roles: {
      admin: { '*': ['voir', 'ajouter', 'modifier', 'supprimer'] },
      scolarite: {
        etudiants: ['voir', 'ajouter', 'modifier', 'supprimer'], inscriptions: ['voir', 'ajouter', 'modifier', 'supprimer'],
        academique: ['voir', 'ajouter', 'modifier'], enseignants: ['voir', 'ajouter', 'modifier'], planning: ['voir', 'ajouter', 'modifier'],
        notes: ['voir', 'modifier'], presences: ['voir', 'modifier'], documents: ['voir', 'ajouter'], rapports: ['voir'],
      },
      comptable: { etudiants: ['voir'], finances: ['voir', 'ajouter', 'modifier'], documents: ['voir', 'ajouter'], rapports: ['voir'] },
      enseignant: { planning: ['voir'], notes: ['voir', 'ajouter', 'modifier'], presences: ['voir', 'ajouter', 'modifier'] },
      etudiant: { documents: ['voir'] },
    },
  };

  const documents_etudiants = [
    { id: 1, etudiant_id: 1, type: 'Acte de naissance', fichier: 'acte_naissance.pdf', date: '2024-09-12', statut: 'Vérifié' },
    { id: 2, etudiant_id: 1, type: 'Diplôme du baccalauréat', fichier: 'bac.pdf', date: '2024-09-12', statut: 'Vérifié' },
    { id: 3, etudiant_id: 1, type: 'Certificat médical', fichier: 'certificat_medical.jpg', date: '2026-09-30', statut: 'En attente' },
  ];

  window.C360_SEED = {
    version: 3,
    annees, facultes, filieres, niveaux, semestres, frais, etudiants, inscriptions, paiements,
    enseignants, ues, matieres, salles, seances, disponibilites, evaluations, notes, presences,
    users, connexions, permissions, documents_etudiants,
    audit: [
      { id: 1, date: '2026-11-03 10:42', utilisateur: 'Fatou Koné', action: 'Paiement enregistré', details: `REC-2026-${pad(recuSeq - 1, 6)} — 100 000 FCFA (${etudiants[2].prenom} ${etudiants[2].nom})` },
      { id: 2, date: '2026-11-03 11:05', utilisateur: 'Fatou Koné', action: 'Paiement annulé', details: `REC-2026-${pad(recuSeq - 1, 6)} — motif : Doublon de saisie` },
    ],
    parametres: { annee_courante_id: 3, seuil_absences: 3, moyenne_validation: 10, nom_universite: 'Université Campus360', ville: 'Bamako' },
  };
})();
