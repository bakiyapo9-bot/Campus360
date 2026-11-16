/* Résultats : moyennes par matière, moyenne semestrielle (pondérée par les coefficients),
   décision, classement, publication selon les autorisations, bulletins. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, rules, esc } = C360;
  const role = C360.session.role();
  const canPublish = ['admin', 'scolarite'].includes(role);
  if (!canPublish) document.querySelectorAll('[data-perm="publish"]').forEach((el) => el.remove());

  // Groupes accessibles (un enseignant ne voit que les groupes de ses matières)
  const groupes = new Map();
  C360.notes.matieresAccessibles().forEach((m) => { const u = db.get('ues', m.ue_id); groupes.set(`${u.filiere_id}-${u.niveau_id}`, { value: `${u.filiere_id}-${u.niveau_id}`, label: `${labels.groupe(u.filiere_id, u.niveau_id)} — ${labels.filiere(u.filiere_id)}` }); });
  ui.fillSelect('#fGroupe', [...groupes.values()], { value: 'value', label: 'label' });
  ui.fillSelect('#fSemestre', db.all('semestres'), { label: 'libelle' });

  let lastRows = [];
  let lastMats = [];

  function render() {
    const [f, n] = document.getElementById('fGroupe').value.split('-').map(Number);
    const sem = Number(document.getElementById('fSemestre').value);
    const uesIds = db.where('ues', (u) => u.filiere_id === f && u.niveau_id === n && u.semestre_id === sem).map((u) => u.id);
    lastMats = db.where('matieres', (m) => uesIds.includes(m.ue_id));
    const etus = db.where('etudiants', (e) => e.statut === 'Actif' && e.filiere_id === f && e.niveau_id === n);
    lastRows = etus.map((e) => Object.assign({ etu: e }, rules.moyenneSemestre(e.id, sem)))
      .sort((a, b) => (b.moyenne ?? -1) - (a.moyenne ?? -1));
    let rang = 0;
    lastRows.forEach((r, i) => { if (r.moyenne !== null) { rang = i > 0 && lastRows[i - 1].moyenne === r.moyenne ? rang : i + 1; r.rang = rang; } });

    const publie = !!(db.settings().resultats_publies || {})[sem];
    document.getElementById('publishState').innerHTML = publie ? '<span class="badge text-bg-success"><i class="bi bi-eye me-1"></i>Publiés aux étudiants</span>' : '<span class="badge text-bg-secondary"><i class="bi bi-eye-slash me-1"></i>Non publiés</span>';
    const btn = document.getElementById('btnPublish');
    if (btn) btn.innerHTML = publie ? '<i class="bi bi-eye-slash me-1"></i>Retirer la publication' : '<i class="bi bi-megaphone me-1"></i>Publier les résultats';

    const evalues = lastRows.filter((r) => r.moyenne !== null);
    const admis = evalues.filter((r) => r.moyenne >= db.settings().moyenne_validation);
    const moyG = evalues.length ? evalues.reduce((s, r) => s + r.moyenne, 0) / evalues.length : null;
    const cards = [
      ['Étudiants', lastRows.length, 'people', 'soft-primary'], ['Moyenne de la promotion', fmt.note(moyG), 'graph-up', 'soft-info'],
      ['Admis', `${admis.length} (${evalues.length ? Math.round((admis.length / evalues.length) * 100) : 0} %)`, 'award', 'soft-success'], ['Ajournés', evalues.length - admis.length, 'x-circle', 'soft-danger'],
    ];
    document.getElementById('stats').innerHTML = cards.map(([l, v, i, c]) => `<div class="col-6 col-xl-3"><div class="card"><div class="card-body stat-card py-3"><div class="stat-icon ${c}"><i class="bi bi-${i}"></i></div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div></div></div>`).join('');

    document.getElementById('resHead').innerHTML = `<tr><th>Rang</th><th>Étudiant</th>${lastMats.map((m) => `<th class="text-center" title="${esc(m.intitule)}">${esc(m.code)}<div class="text-xs fw-normal text-lowercase">coef. ${m.coefficient}</div></th>`).join('')}<th class="text-center">Moyenne</th><th class="text-center">Crédits</th><th>Décision</th><th class="no-print"></th></tr>`;
    document.getElementById('resBody').innerHTML = lastRows.map((r) => `<tr>
      <td class="fw-bold">${r.rang || '—'}</td>
      <td><div class="fw-medium">${esc(r.etu.nom.toUpperCase())} ${esc(r.etu.prenom)}</div><div class="text-xs text-secondary font-monospace">${esc(r.etu.matricule)}</div></td>
      ${r.detail.map((d) => `<td class="text-center ${d.moyenne !== null && d.moyenne < 10 ? 'text-danger' : ''}">${fmt.note(d.moyenne)}</td>`).join('')}
      <td class="text-center fw-bold ${r.moyenne !== null && r.moyenne < 10 ? 'text-danger' : 'text-success'}">${fmt.note(r.moyenne)}</td>
      <td class="text-center">${r.credits}</td>
      <td>${r.moyenne === null ? ui.badge('Non évalué') : `<span class="badge badge-status text-bg-${r.moyenne >= 10 ? 'success' : 'danger'}">${esc(r.decision)}</span>`}</td>
      <td class="text-end no-print"><a class="btn btn-sm btn-light" href="../documents/apercu.html?type=releve&etudiant=${r.etu.id}" title="Bulletin / relevé" aria-label="Bulletin"><i class="bi bi-file-earmark-text"></i></a></td>
    </tr>`).join('') || ui.empty(lastMats.length + 6, 'Aucun étudiant');
  }

  document.getElementById('fGroupe').addEventListener('change', render);
  document.getElementById('fSemestre').addEventListener('change', render);

  if (canPublish) {
    document.getElementById('btnPublish').addEventListener('click', async () => {
      const sem = Number(document.getElementById('fSemestre').value);
      const p = db.settings();
      p.resultats_publies = p.resultats_publies || {};
      const publie = !!p.resultats_publies[sem];
      const ok = await ui.confirm(publie ? 'Les étudiants ne verront plus leurs résultats.' : 'Les étudiants pourront consulter leurs notes, moyennes et décisions dans leur espace.', { title: publie ? 'Retirer la publication ?' : 'Publier les résultats ?', okLabel: publie ? 'Retirer' : 'Publier', okClass: publie ? 'btn-danger' : 'btn-success' });
      if (!ok) return;
      p.resultats_publies[sem] = !publie;
      db.save();
      C360.audit(publie ? 'Résultats dépubliés' : 'Résultats publiés', labels.annee(p.annee_courante_id));
      ui.toast(publie ? 'Publication retirée.' : 'Résultats publiés.');
      render();
    });
  }

  document.getElementById('btnExport').addEventListener('click', () => {
    C360.exporter.csv('resultats', ['Rang', 'Matricule', 'Nom', 'Prénom', ...lastMats.map((m) => m.code), 'Moyenne', 'Crédits', 'Décision'],
      lastRows.map((r) => [r.rang || '', r.etu.matricule, r.etu.nom, r.etu.prenom, ...r.detail.map((d) => fmt.note(d.moyenne)), fmt.note(r.moyenne), r.credits, r.decision]));
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); });
  render();
});
