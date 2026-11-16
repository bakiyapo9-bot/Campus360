/* Reçu de paiement imprimable (contrôle d'accès pour le rôle étudiant). */
C360.page(function () {
  const id = Number(C360.param('id'));
  const p = C360.db.get('paiements', id);
  const role = C360.session.role();
  // Un étudiant ne peut consulter que ses propres reçus (contrôle à refaire côté serveur)
  if (role === 'etudiant') {
    document.getElementById('backLink').href = '../espace/etudiant.html#finances';
    if (!p || p.etudiant_id !== C360.ROLES.etudiant.etudiant_id) {
      document.getElementById('doc').innerHTML = '<div class="alert alert-danger">Vous n\'avez pas accès à ce reçu.</div>';
      return;
    }
  }
  document.getElementById('doc').innerHTML = C360.docs.render('recu', id);
});

// Bouton « Imprimer / PDF »
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-print]')) window.print();
});
