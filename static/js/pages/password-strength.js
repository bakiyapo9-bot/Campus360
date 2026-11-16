/* Indicateur de robustesse du mot de passe (réutilisé : réinitialisation, profil). */
(function () {
  'use strict';
  window.C360 = window.C360 || {};
  C360.passwordStrength = function (inputSel, barSel, textSel) {
    const input = document.querySelector(inputSel);
    const bar = document.querySelector(barSel);
    const text = document.querySelector(textSel);
    if (!input) return;
    input.addEventListener('input', () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const levels = [
        { w: 10, c: 'bg-danger', t: 'Très faible' },
        { w: 30, c: 'bg-danger', t: 'Faible' },
        { w: 55, c: 'bg-warning', t: 'Moyen' },
        { w: 80, c: 'bg-info', t: 'Bon' },
        { w: 100, c: 'bg-success', t: 'Excellent' },
      ];
      const l = levels[score];
      bar.style.width = v ? `${l.w}%` : '0';
      bar.className = `progress-bar ${l.c}`;
      text.textContent = v ? `Robustesse : ${l.t}` : '8 caractères minimum, avec majuscule, chiffre et caractère spécial.';
      input.setCustomValidity(v && score < 3 ? 'faible' : '');
    });
  };
})();
