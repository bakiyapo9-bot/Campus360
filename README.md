# Campus360 — Front-end

Plateforme web centralisée de gestion universitaire : étudiants, inscriptions, structure académique,
enseignants, finances, emplois du temps, notes, présences, documents administratifs et rapports.

Ce dépôt contient **uniquement le front-end** (HTML, CSS/Bootstrap 5, JavaScript natif).
Le back-end **Django** sera branché ensuite : la structure `templates/` + `static/` suit déjà
les conventions Django.

---

## 1. Lancer la maquette

Aucune installation n'est nécessaire.

- **Option simple** : ouvrir `index.html` dans le navigateur (redirection vers la connexion).
- **Option recommandée** (serveur local) :
  ```bash
  python -m http.server 8000
  # puis ouvrir http://localhost:8000
  ```

### Comptes de démonstration

| Identifiant | Rôle                  | Espace d'arrivée         |
|-------------|-----------------------|--------------------------|
| `admin`     | Administrateur        | Tableau de bord          |
| `mdiallo`   | Responsable scolarité | Tableau de bord          |
| `fkone`     | Comptable             | Tableau de bord          |
| `isanogo`   | Enseignant            | Mon espace (enseignant)  |
| `idembele`  | Enseignant **désactivé** | Connexion refusée     |

N'importe quel mot de passe (≥ 4 caractères) est accepté en démo. Un identifiant inconnu utilise
le rôle choisi dans la liste « Mode démo ». On peut aussi **changer de rôle à tout moment** depuis
le menu utilisateur (en haut à droite), et **réinitialiser les données** de démonstration.

> Les données sont stockées dans le `localStorage` du navigateur : les ajouts et modifications
> persistent d'une page à l'autre, jusqu'à la réinitialisation.

---

## 2. Arborescence

```
Campus360/
├── index.html                          # Redirection vers la page de connexion
├── README.md
│
├── static/                             # → STATIC de Django
│   ├── css/
│   │   └── campus360.css               # Thème (surcouche Bootstrap), clair/sombre, impression
│   └── js/
│       ├── mock-data.js                # Données de démonstration (À SUPPRIMER avec Django)
│       ├── services.js                 # API simulée (C360.db) + RÈGLES DE GESTION (C360.rules)
│       ├── core.js                     # Mise en page (sidebar/topbar), rôles, toasts, tableaux, exports
│       ├── crud.js                     # Composant générique liste + modale d'édition
│       ├── charts.js                   # Configuration commune Chart.js
│       ├── timetable.js                # Rendu d'un emploi du temps hebdomadaire
│       ├── doc-templates.js            # Modèles imprimables : reçu, attestation, certificat, relevé, fiche
│       └── pages/                      # Un script par page (aucun JS dans les fichiers HTML)
│           ├── login.js
│           ├── mot-de-passe-oublie.js
│           ├── reinitialiser-mot-de-passe.js
│           ├── password-strength.js    # Indicateur de robustesse (réutilisé)
│           ├── dashboard.js
│           ├── utilisateurs.js
│           ├── roles.js
│           ├── connexions.js
│           ├── profil.js
│           ├── etudiants-liste.js
│           ├── etudiant-form.js
│           ├── etudiant-fiche.js
│           ├── dossier-etudiant.js     # Composant « dossier complet » (fiche + espace étudiant)
│           ├── inscriptions.js
│           ├── inscription-form.js
│           ├── academique.js
│           ├── cours.js
│           ├── enseignants.js
│           ├── enseignant-fiche.js
│           ├── frais.js
│           ├── paiements.js
│           ├── impayes.js
│           ├── recu.js
│           ├── salles.js
│           ├── emploi-du-temps.js
│           ├── evaluations.js
│           ├── saisie-notes.js
│           ├── resultats.js
│           ├── appel.js
│           ├── presences-suivi.js
│           ├── documents.js
│           ├── document-apercu.js
│           ├── rapports.js
│           ├── espace-enseignant.js
│           └── espace-etudiant.js
│
└── templates/                          # → TEMPLATES de Django
    ├── auth/                           # Module 1 — Authentification
    │   ├── login.html
    │   ├── mot-de-passe-oublie.html
    │   └── reinitialiser-mot-de-passe.html
    ├── comptes/                        # Module 1 — Comptes & permissions
    │   ├── utilisateurs.html           # Création, rôles, activation/désactivation, reset mdp
    │   ├── roles.html                  # Matrice des permissions par rôle
    │   ├── connexions.html             # Historique des connexions importantes
    │   └── profil.html                 # Modification du profil + changement de mot de passe
    ├── dashboard/                      # Module 2 — Tableau de bord
    │   └── index.html
    ├── etudiants/                      # Module 3 — Étudiants
    │   ├── liste.html                  # Recherche, filtres, export, archivage
    │   ├── formulaire.html             # Ajout / modification (+ photo)
    │   └── fiche.html                  # Dossier complet (7 onglets)
    ├── inscriptions/                   # Module 4 — Inscriptions
    │   ├── liste.html                  # Vérification du dossier, validation / rejet
    │   └── nouvelle.html               # Assistant 4 étapes (nouvelle / réinscription)
    ├── academique/                     # Module 5 — Gestion académique
    │   ├── structure.html              # Années, semestres, facultés, filières, niveaux
    │   └── cours.html                  # UE, matières, coefficients, crédits, volumes, enseignants
    ├── enseignants/                    # Module 6 — Enseignants
    │   ├── liste.html
    │   └── fiche.html                  # Cours, emploi du temps, classes, disponibilités
    ├── finances/                       # Module 7 — Finances & paiements
    │   ├── frais.html                  # Grille tarifaire filière × niveau
    │   ├── paiements.html              # Encaissement, annulation, correction, historique
    │   ├── impayes.html                # Étudiants en impayé + relances
    │   └── recu.html                   # Reçu imprimable à numéro unique
    ├── planning/                       # Module 8 — Planification
    │   ├── salles.html
    │   └── emploi-du-temps.html        # Par groupe / enseignant / salle, détection des conflits
    ├── notes/                          # Module 9 — Notes & résultats
    │   ├── evaluations.html
    │   ├── saisie.html
    │   └── resultats.html              # Moyennes, décisions, rang, publication
    ├── presences/                      # Module 10 — Présences
    │   ├── appel.html
    │   └── suivi.html                  # Statistiques, seuil d'absences, justifications
    ├── documents/                      # Module 11 — Documents administratifs
    │   ├── index.html                  # Génération + vérification des pièces justificatives
    │   └── apercu.html                 # Aperçu imprimable / PDF
    ├── rapports/                       # Module 12 — Rapports & statistiques
    │   └── index.html
    └── espace/                         # Espaces personnels
        ├── enseignant.html
        └── etudiant.html
```

**Règle d'organisation :** aucun fichier HTML ne contient de JavaScript (ni balise `<script>` inline,
ni attribut `onclick`). Chaque page charge ses scripts via `<script src="...">`, dans cet ordre :

```
bootstrap.bundle → (chart.js) → mock-data.js → services.js → core.js → (composants) → pages/<page>.js
```

---

## 3. Rôles et accès

| Page / module          | Admin | Scolarité | Comptable | Enseignant | Étudiant |
|------------------------|:-----:|:---------:|:---------:|:----------:|:--------:|
| Tableau de bord        | ✔ | ✔ | ✔ |   |   |
| Étudiants              | ✔ | ✔ | lecture |   |   |
| Inscriptions           | ✔ | ✔ |   |   |   |
| Structure académique   | ✔ | ✔ |   |   |   |
| Enseignants            | ✔ | ✔ |   |   |   |
| Frais / paiements / impayés | ✔ |   | ✔ |   |   |
| Emplois du temps       | ✔ | ✔ | ✔ | le sien | le sien |
| Salles                 | ✔ | ✔ |   |   |   |
| Évaluations / notes / résultats | ✔ | ✔ |   | ses matières |   |
| Présences              | ✔ | ✔ |   | ses séances |   |
| Documents              | ✔ | ✔ | ✔ |   | les siens |
| Rapports               | ✔ | académiques | financiers |   |   |
| Utilisateurs / rôles / journal | ✔ |   |   |   |   |

Chaque page déclare les rôles autorisés via `<body data-roles="admin,scolarite">` ; `core.js`
affiche « Accès refusé » sinon. **Côté Django, ce contrôle doit être refait** (`@login_required`,
`PermissionRequiredMixin`, groupes) : le front n'est jamais une garantie de sécurité.

---

## 4. Règles de gestion implémentées (à reproduire côté serveur)

Toutes sont centralisées dans `static/js/services.js` (`C360.rules`) :

| Règle | Fonction | Côté Django (suggestion) |
|-------|----------|---------------------------|
| Reste à payer = total − versé, taux de paiement | `situationFinanciere()` | Propriété/annotation sur le modèle |
| Refus d'un paiement supérieur au solde (sauf exception autorisée + justification) | `verifierPaiement()` | `clean()` du formulaire + transaction |
| Paiement jamais enregistré deux fois | `verifierPaiement()` + `idempotency_key` + bouton désactivé | Contrainte `unique` sur la clé d'idempotence |
| Paiement validé jamais modifié : annulation / correction tracées | `paiements.js` + `C360.audit()` | Modèle `AuditLog`, pas d'`UPDATE` du montant |
| Reçu à numéro unique (`REC-AAAA-000123`) | `prochainNumeroRecu()` | Séquence en base (`select_for_update`) |
| Pas deux inscriptions identiques (étudiant + année + filière + niveau), sauf dérogation | `verifierInscription()` | `UniqueConstraint` conditionnelle |
| Matricule unique (`C360-AAAA-0001`) | `genererMatricule()` | Champ `unique=True` |
| Pas de conflit d'horaire (enseignant, salle, groupe) + capacité de salle | `conflitsSeance()` | Validation dans `clean()` |
| Moyenne matière (pondérée par le poids des évaluations), semestrielle (coefficients), décision, crédits | `moyenneMatiere()`, `moyenneSemestre()`, `decision()` | Service métier / `annotate` |
| Seuil d'absences non justifiées | `statsPresence()` + `parametres.seuil_absences` | Paramètre en base |
| Montant en lettres sur les reçus | `montantEnLettres()` | `num2words(lang='fr')` |

---

## 5. Brancher le back-end Django

### 5.1 Fichiers statiques et templates

```python
# settings.py
TEMPLATES[0]["DIRS"] = [BASE_DIR / "templates"]
STATICFILES_DIRS = [BASE_DIR / "static"]
```

Dans chaque template, remplacer les chemins relatifs par `{% static %}` et `{% url %}` :

```html
{% load static %}
<link href="{% static 'css/campus360.css' %}" rel="stylesheet">
<script src="{% static 'js/core.js' %}"></script>
<a href="{% url 'etudiants:liste' %}">Étudiants</a>
```

### 5.2 Gabarit commun

Toutes les pages partagent la même structure ; il suffit d'en faire un `base.html` :

```html
<body data-page="{% block page_id %}{% endblock %}">
<div class="app-shell">
  <aside id="c360-sidebar" class="app-sidebar"></aside>   {# ou {% include 'partials/sidebar.html' %} #}
  <div class="app-main">
    <header id="c360-topbar" class="app-topbar"></header>
    <main class="app-content">{% block content %}{% endblock %}</main>
    <footer class="app-footer"></footer>
  </div>
</div>
{% block scripts %}{% endblock %}
</body>
```

### 5.3 Remplacer les données simulées

1. Supprimer `mock-data.js`.
2. Deux approches possibles :
   - **Rendu serveur** : les tableaux deviennent des `{% for %}` ; recherche, filtres et pagination
     passent en paramètres GET (`Paginator`). Les formulaires (`method="post"`, commentaires
     `{% csrf_token %}` déjà placés) deviennent des `ModelForm`.
   - **API JSON** (Django REST Framework) : garder les scripts de page et remplacer `C360.db.*`
     dans `services.js` par des appels `fetch()` (en envoyant l'en-tête `X-CSRFToken`).
3. Les `name` des champs de formulaire correspondent aux futurs champs de modèles
   (`nom`, `prenom`, `filiere_id`, `niveau_id`, `montant`, `mode`, …).

### 5.4 Modèles suggérés (d'après `mock-data.js`)

`AnneeAcademique`, `Semestre`, `Faculte`, `Filiere`, `Niveau`, `UniteEnseignement`, `Matiere`,
`Enseignant`, `Disponibilite`, `Etudiant`, `Inscription`, `PieceJustificative`, `Frais`,
`Paiement`, `Salle`, `Seance`, `Evaluation`, `Note`, `Presence`, `AuditLog`, `JournalConnexion`,
et `User` + `Group` (rôles) de `django.contrib.auth`.

### 5.5 PDF et Excel

En maquette, les exports « Excel » produisent un CSV compatible Excel (séparateur `;`, UTF-8)
et les PDF passent par l'impression du navigateur. En production : **WeasyPrint** ou
**xhtml2pdf** (PDF à partir des mêmes modèles HTML) et **openpyxl** (vrais fichiers `.xlsx`).

---

## 6. Technologies

- **Bootstrap 5.3.3** + **Bootstrap Icons 1.11.3** (CDN jsDelivr)
- **Chart.js 4.4.1** (graphiques du tableau de bord et des rapports)
- Police **Inter** (Google Fonts)
- JavaScript natif (ES2020), sans framework ni étape de build
- Thème clair / sombre, mise en page responsive, styles d'impression dédiés

## 7. Sécurité côté front

- Toute donnée dynamique est échappée (`C360.esc`) avant insertion dans le HTML (anti-XSS).
- Les exports CSV neutralisent les formules (`=`, `+`, `-`, `@`) pour éviter l'injection dans Excel.
- Uploads : contrôle du type et de la taille côté client (à revalider côté serveur, ainsi que le type MIME réel).
- Message neutre sur « mot de passe oublié » (on ne révèle pas si un compte existe).
