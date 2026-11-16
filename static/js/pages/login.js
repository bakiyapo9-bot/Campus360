/* Page de connexion : affichage du mot de passe, validation, redirection selon le rôle. */
(function () {
  const form = document.getElementById('loginForm');
  const pwd = document.getElementById('password');
  document.getElementById('togglePwd').addEventListener('click', function () {
    const show = pwd.type === 'password';
    pwd.type = show ? 'text' : 'password';
    this.innerHTML = `<i class="bi bi-eye${show ? '-slash' : ''}"></i>`;
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    C360.ui.showErrors('#loginErrors', []);
    if (!C360.ui.validate(form)) return;
    const login = form.username.value.trim().toLowerCase();
    const user = C360.db.all('users').find((u) => u.username.toLowerCase() === login || u.email.toLowerCase() === login);
    if (user && user.statut !== 'Actif') {
      C360.ui.showErrors('#loginErrors', ['Ce compte est désactivé. Contactez l\'administrateur.']);
      return;
    }
    const role = user ? user.role : document.getElementById('demoRole').value;
    C360.session.setRole(role);
    window.location.href = C360.url(C360.ROLES[role].home);
  });
})();
