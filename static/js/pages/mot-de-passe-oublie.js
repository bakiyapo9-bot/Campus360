/* Demande de réinitialisation du mot de passe. */
document.getElementById('forgotForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!C360.ui.validate(this)) return;
  document.getElementById('step-request').classList.add('d-none');
  document.getElementById('step-sent').classList.remove('d-none');
});
