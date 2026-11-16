/* Espace enseignant : cours du jour, classes, évaluations à saisir, emploi du temps. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, esc } = C360;
  const ensId = C360.ROLES.enseignant.enseignant_id;
  const ens = db.get('enseignants', ensId);
  const seances = db.where('seances', (s) => s.enseignant_id === ensId);
  const mats = db.where('matieres', (m) => m.enseignant_id === ensId);
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  document.getElementById('greeting').textContent = `Bonjour, ${ens.civilite} ${ens.nom}`;
  document.getElementById('subtitle').textContent = `${ens.specialite} · ${labels.faculte(ens.faculte_id)}`;

  const evals = db.where('evaluations', (e) => mats.some((m) => m.id === e.matiere_id));
  const aSaisir = evals.filter((e) => e.statut !== 'Notes saisies' && e.date <= fmt.today());
  const groupes = new Set(seances.map((s) => `${s.filiere_id}-${s.niveau_id}`));
  const heures = seances.reduce((s, x) => s + (toMin(x.fin) - toMin(x.debut)) / 60, 0);
  const kpis = [['Matières enseignées', mats.length, 'book', 'soft-primary'], ['Classes', groupes.size, 'people', 'soft-teal'], ['Heures / semaine', heures, 'clock', 'soft-info'], ['Notes à saisir', aSaisir.length, 'pencil-square', aSaisir.length ? 'soft-warning' : 'soft-success']];
  document.getElementById('kpis').innerHTML = kpis.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');

  const jour = new Date().getDay();
  const today = seances.filter((s) => s.jour === jour).sort((a, b) => a.debut.localeCompare(b.debut));
  document.getElementById('today').innerHTML = today.map((s) => `<li class="list-group-item d-flex gap-3 align-items-center">
      <div class="text-center" style="min-width:56px"><div class="fw-bold">${s.debut}</div><div class="text-xs text-secondary">${s.fin}</div></div>
      <div class="flex-grow-1"><div class="fw-semibold">${esc(labels.matiere(s.matiere_id))}</div><div class="text-xs text-secondary">${esc(s.type)} · ${esc(labels.groupe(s.filiere_id, s.niveau_id))} · Salle ${esc(labels.salle(s.salle_id))}</div></div>
      <a class="btn btn-sm btn-light" href="../presences/appel.html" title="Faire l'appel"><i class="bi bi-check2-square"></i></a></li>`).join('')
    || `<li class="list-group-item"><div class="empty-state py-3"><i class="bi bi-cup-hot"></i>Aucun cours aujourd'hui (${labels.jour(jour) === '—' ? 'dimanche' : labels.jour(jour).toLowerCase()}).</div></li>`;

  document.getElementById('evals').innerHTML = evals.filter((e) => e.statut !== 'Notes saisies').sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
    const total = C360.notes.etudiantsDeMatiere(e.matiere_id).length;
    const saisies = db.where('notes', (n) => n.evaluation_id === e.id).length;
    return `<tr><td class="fw-semibold">${esc(e.libelle)}</td><td>${esc(labels.matiere(e.matiere_id))}</td><td class="text-nowrap">${fmt.date(e.date)}</td>
      <td style="min-width:120px">${ui.progress(total ? Math.round((saisies / total) * 100) : 0)}</td>
      <td class="text-end"><a class="btn btn-sm btn-primary" href="../notes/saisie.html?evaluation=${e.id}">Saisir</a></td></tr>`;
  }).join('') || ui.empty(5, 'Toutes les notes sont saisies');

  document.getElementById('cours').innerHTML = mats.map((m) => {
    const u = db.get('ues', m.ue_id);
    return `<tr><td><div class="fw-semibold">${esc(m.intitule)}</div><div class="text-xs text-secondary font-monospace">${esc(m.code)}</div></td>
      <td>${esc(labels.groupe(u.filiere_id, u.niveau_id))}</td><td class="text-center">${C360.notes.etudiantsDeMatiere(m.id).length}</td><td class="text-center">${m.coefficient}</td>
      <td class="text-sm">${m.volume_cm} h CM · ${m.volume_td} h TD · ${m.volume_tp} h TP</td>
      <td class="text-end text-nowrap"><a class="btn btn-sm btn-light" href="../notes/evaluations.html" title="Évaluations"><i class="bi bi-clipboard-check"></i></a> <a class="btn btn-sm btn-light" href="../notes/resultats.html" title="Résultats"><i class="bi bi-award"></i></a> <a class="btn btn-sm btn-light" href="../presences/suivi.html" title="Présences"><i class="bi bi-clock-history"></i></a></td></tr>`;
  }).join('') || ui.empty(6, 'Aucun cours affecté');

  C360.timetable.render('#edt', seances);
});
