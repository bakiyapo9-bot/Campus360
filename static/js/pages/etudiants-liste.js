/* Liste des étudiants : recherche, filtres, export, archivage. */
C360.page(function () {
  'use strict';
  const { db, ui, labels, fmt, rules, esc } = C360;
  const canWrite = ['admin', 'scolarite'].includes(C360.session.role());
  if (!canWrite) document.querySelectorAll('[data-perm="write"]').forEach((el) => el.remove());

  ui.fillSelect('#fFiliere', db.all('filieres'), { placeholder: 'Toutes les filières', selected: C360.param('filiere') });
  ui.fillSelect('#fNiveau', db.all('niveaux'), { label: 'nom', placeholder: 'Tous les niveaux' });
  ui.fillSelect('#fAnnee', db.all('annees'), { label: 'libelle', placeholder: 'Toutes les années', selected: db.settings().annee_courante_id });

  const inscritEn = (etuId, anneeId) => db.all('inscriptions').some((i) => i.etudiant_id === etuId && i.annee_id === Number(anneeId) && i.statut !== 'Rejetée');

  const table = new C360.DataTable({
    tbody: '#tbody',
    data: () => db.all('etudiants'),
    search: '#search',
    searchFields: ['nom', 'prenom', 'matricule', (r) => `${r.prenom} ${r.nom}`, 'email'],
    filters: [
      { el: '#fFiliere', field: 'filiere_id' },
      { el: '#fNiveau', field: 'niveau_id' },
      { el: '#fAnnee', field: (row, v) => inscritEn(row.id, v) },
      { el: '#fStatut', field: 'statut' },
    ],
    sort: (a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom),
    colspan: 7,
    countEl: '#count',
    emptyText: 'Aucun étudiant ne correspond à vos critères',
    render: (e) => {
      const s = rules.situationFinanciere(e.id);
      return `<tr>
        <td><a href="fiche.html?id=${e.id}" class="d-flex align-items-center gap-2 text-decoration-none text-body">${ui.avatar(`${e.prenom} ${e.nom}`, null, e.photo)}
          <div><div class="fw-semibold">${esc(e.nom.toUpperCase())} ${esc(e.prenom)}</div><div class="text-xs text-secondary">${e.sexe === 'F' ? 'Féminin' : 'Masculin'} · né(e) le ${fmt.date(e.date_naissance)}</div></div></a></td>
        <td class="font-monospace text-sm">${esc(e.matricule)}</td>
        <td><div class="fw-medium">${esc(labels.filiere(e.filiere_id))}</div><div class="text-xs text-secondary">${esc(labels.niveau(e.niveau_id))}</div></td>
        <td class="text-sm"><div>${esc(e.telephone)}</div><div class="text-secondary text-xs text-truncate" style="max-width:200px">${esc(e.email)}</div></td>
        <td style="min-width:130px">${ui.progress(s.taux)}</td>
        <td>${ui.badge(e.statut)}</td>
        <td class="text-end">
          <div class="dropdown">
            <button class="btn btn-sm btn-light" data-bs-toggle="dropdown" aria-label="Actions"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end shadow">
              <li><a class="dropdown-item" href="fiche.html?id=${e.id}"><i class="bi bi-folder2-open me-2"></i>Dossier complet</a></li>
              ${canWrite ? `<li><a class="dropdown-item" href="formulaire.html?id=${e.id}"><i class="bi bi-pencil me-2"></i>Modifier</a></li>` : ''}
              <li><a class="dropdown-item" href="../documents/apercu.html?type=fiche&etudiant=${e.id}"><i class="bi bi-download me-2"></i>Télécharger la fiche</a></li>
              ${canWrite ? `<li><hr class="dropdown-divider"></li><li><button class="dropdown-item ${e.statut === 'Archivé' ? '' : 'text-danger'}" data-archive="${e.id}"><i class="bi bi-${e.statut === 'Archivé' ? 'arrow-counterclockwise' : 'archive'} me-2"></i>${e.statut === 'Archivé' ? 'Désarchiver' : 'Archiver'}</button></li>` : ''}
            </ul>
          </div>
        </td>
      </tr>`;
    },
  });

  document.getElementById('tbody').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-archive]');
    if (!btn) return;
    const etu = db.get('etudiants', btn.dataset.archive);
    const archiver = etu.statut !== 'Archivé';
    const ok = await ui.confirm(
      archiver ? `${etu.prenom} ${etu.nom} n'apparaîtra plus dans les listes actives. Son dossier est conservé et peut être restauré.` : `Le dossier de ${etu.prenom} ${etu.nom} sera de nouveau actif.`,
      { title: archiver ? 'Archiver l\'étudiant ?' : 'Désarchiver l\'étudiant ?', okLabel: archiver ? 'Archiver' : 'Désarchiver', okClass: archiver ? 'btn-danger' : 'btn-primary' },
    );
    if (!ok) return;
    db.update('etudiants', etu.id, { statut: archiver ? 'Archivé' : 'Actif' });
    ui.toast(archiver ? 'Étudiant archivé.' : 'Étudiant restauré.');
    table.refresh();
  });

  document.getElementById('btnExport').addEventListener('click', () => {
    C360.exporter.csv('etudiants', ['Matricule', 'Nom', 'Prénom', 'Sexe', 'Date de naissance', 'Filière', 'Niveau', 'Téléphone', 'E-mail', 'Statut', 'Taux de paiement'],
      table.lastRows.map((e) => [e.matricule, e.nom, e.prenom, e.sexe, fmt.date(e.date_naissance), labels.filiere(e.filiere_id), labels.niveau(e.niveau_id), e.telephone, e.email, e.statut, `${rules.situationFinanciere(e.id).taux}%`]));
    ui.toast('Export généré.');
  });
});
