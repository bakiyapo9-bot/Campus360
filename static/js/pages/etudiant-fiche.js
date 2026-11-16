/* Fiche étudiant : affiche le dossier complet (composant C360.dossier). */
C360.page(function () {
  C360.dossier.render(document.getElementById('dossier'), Number(C360.param('id')) || 1, { mode: 'admin' });
});
