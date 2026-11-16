/* Saisie du nouveau mot de passe (robustesse + confirmation). */
(function () {
  const form = document.getElementById('resetForm');
  C360.passwordStrength('#new_password1', '#strengthBar', '#strengthText');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const p2 = form.new_password2;
    p2.setCustomValidity(p2.value !== form.new_password1.value ? 'mismatch' : '');
    if (!C360.ui.validate(form)) return;
    C360.ui.toast('Mot de passe mis à jour. Vous pouvez vous connecter.');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
  });
})();
