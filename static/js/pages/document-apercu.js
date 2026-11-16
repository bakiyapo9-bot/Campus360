/* Aperçu imprimable d'un document administratif (?type=attestation|certificat|releve|fiche&etudiant=ID). */
C360.page(function () {
  'use strict';
  const type = C360.param('type');
  const etuId = Number(C360.param('etudiant'));
  const role = C360.session.role();
  const doc = document.getElementById('doc');

  // Un étudiant ne peut générer que ses propres documents (contrôle à refaire côté serveur)
  if (role === 'etudiant' && etuId !== C360.ROLES.etudiant.etudiant_id) {
    doc.innerHTML = '<div class="alert alert-danger">Vous n\'avez pas accès à ce document.</div>';
    return;
  }
  if (!C360.db.get('etudiants', etuId)) {
    doc.innerHTML = '<div class="alert alert-warning">Étudiant introuvable.</div>';
    return;
  }
  doc.innerHTML = C360.docs.render(type, etuId);
  C360.audit('Document généré', `${type} — ${C360.labels.etudiant(etuId)}`);
});

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-print]')) window.print();
});
