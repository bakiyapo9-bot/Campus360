/* Espace étudiant : indicateurs personnels, prochains cours, emploi du temps et dossier complet
   (les résultats ne sont visibles qu'une fois publiés par la scolarité). */
C360.page(function () {
  'use strict';
  const { db, fmt, labels, rules, esc } = C360;
  const etuId = C360.ROLES.etudiant.etudiant_id;
  const e = db.get('etudiants', etuId);
  const sit = rules.situationFinanciere(etuId);
  const pres = rules.statsPresence(etuId);
  const publie = !!(db.settings().resultats_publies || {})[1];
  const sem = rules.moyenneSemestre(etuId, 1);

  document.getElementById('greeting').textContent = `Bonjour, ${e.prenom}`;
  const kpis = [
    ['Moyenne S1', publie ? `${fmt.note(sem.moyenne)} / 20` : 'Non publiée', 'award', 'soft-primary', '#notes'],
    ['Reste à payer', fmt.money(sit.reste), 'wallet2', sit.reste ? 'soft-danger' : 'soft-success', '#finances'],
    ['Taux de paiement', `${sit.taux} %`, 'pie-chart', 'soft-purple', '#finances'],
    ['Taux de présence', `${pres.taux} %`, 'clock-history', pres.nonJustifiees >= db.settings().seuil_absences ? 'soft-danger' : 'soft-teal', '#presences'],
  ];
  document.getElementById('kpis').innerHTML = kpis.map(([l, v, i, c, h]) => `<div class="col-6 col-xl-3"><a class="card h-100 text-decoration-none text-body" href="${h}" data-tab="${h.slice(1)}"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div class="min-w-0"><div class="stat-value text-truncate">${esc(v)}</div><div class="stat-label">${l}</div></div></div></a></div>`).join('');

  const seances = db.where('seances', (s) => s.filiere_id === e.filiere_id && s.niveau_id === e.niveau_id);
  const now = new Date();
  const nowKey = (now.getDay() || 7) * 10000 + now.getHours() * 100 + now.getMinutes();
  const key = (s) => s.jour * 10000 + Number(s.debut.replace(':', ''));
  const next = seances.slice().sort((a, b) => ((key(a) - nowKey + 70000) % 70000) - ((key(b) - nowKey + 70000) % 70000)).slice(0, 4);
  document.getElementById('nextCourses').innerHTML = next.map((s) => `<li class="list-group-item d-flex gap-3 align-items-center">
      <div class="text-center" style="min-width:64px"><div class="text-xs text-secondary">${labels.jour(s.jour)}</div><div class="fw-bold">${s.debut}</div></div>
      <div><div class="fw-semibold">${esc(labels.matiere(s.matiere_id))}</div><div class="text-xs text-secondary">${esc(s.type)} · Salle ${esc(labels.salle(s.salle_id))} · ${esc(labels.enseignant(s.enseignant_id))}</div></div></li>`).join('')
    || '<li class="list-group-item text-secondary text-sm">Aucun cours planifié.</li>';

  C360.timetable.render('#edt', seances, { subtitle: (s) => `${labels.salle(s.salle_id)} · ${labels.enseignant(s.enseignant_id)}` });
  C360.dossier.render(document.getElementById('dossier'), etuId, { mode: 'etudiant' });

  // Les cartes indicateurs ouvrent l'onglet correspondant du dossier
  document.getElementById('kpis').addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-tab]');
    if (!a) return;
    ev.preventDefault();
    const btn = document.querySelector(`[data-bs-target="#tab-${a.dataset.tab}"]`);
    if (btn) { bootstrap.Tab.getOrCreateInstance(btn).show(); btn.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
