/* Rapports & statistiques : effectifs, niveaux, réussite, absences, recettes, impayés.
   Chaque bloc est exportable en Excel (CSV) ; la page entière s'imprime en PDF. */
C360.page(function () {
  'use strict';
  const { db, fmt, labels, rules, esc } = C360;
  const role = C360.session.role();
  const colors = C360.charts.colors;
  const exportsData = {};

  // Le comptable ne voit que les rapports financiers ; la scolarité, que les rapports académiques
  if (role === 'comptable') document.querySelectorAll('[data-section="academique"]').forEach((el) => el.remove());
  if (role === 'scolarite') document.querySelectorAll('[data-section="finance"]').forEach((el) => el.remove());
  const has = (id) => !!document.getElementById(id);

  const actifs = db.where('etudiants', (e) => e.statut === 'Actif');

  if (has('cAnnees')) {
    const annees = db.all('annees');
    const data = annees.map((a) => db.where('inscriptions', (i) => i.annee_id === a.id && i.statut === 'Validée').length);
    exportsData.annees = { headers: ['Année académique', 'Inscriptions validées'], rows: annees.map((a, i) => [a.libelle, data[i]]) };
    new Chart(document.getElementById('cAnnees'), { type: 'bar', data: { labels: annees.map((a) => a.libelle), datasets: [{ label: 'Inscriptions validées', data, backgroundColor: colors[0], borderRadius: 6, maxBarThickness: 60 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } } });
  }

  if (has('cFilieres')) {
    const fil = db.all('filieres');
    const data = fil.map((f) => actifs.filter((e) => e.filiere_id === f.id).length);
    exportsData.filieres = { headers: ['Filière', 'Étudiants actifs'], rows: fil.map((f, i) => [f.nom, data[i]]) };
    new Chart(document.getElementById('cFilieres'), { type: 'bar', data: { labels: fil.map((f) => f.code), datasets: [{ label: 'Étudiants', data, backgroundColor: colors[1], borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } } });
  }

  if (has('cNiveaux')) {
    const niv = db.all('niveaux');
    const data = niv.map((n) => actifs.filter((e) => e.niveau_id === n.id).length);
    exportsData.niveaux = { headers: ['Niveau', 'Étudiants actifs'], rows: niv.map((n, i) => [n.nom, data[i]]) };
    new Chart(document.getElementById('cNiveaux'), { type: 'pie', data: { labels: niv.map((n) => n.code), datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] }, options: { plugins: { legend: { position: 'right' } } } });
  }

  if (has('tReussite')) {
    const groupes = new Map();
    db.all('ues').filter((u) => u.semestre_id === 1).forEach((u) => groupes.set(`${u.filiere_id}-${u.niveau_id}`, u));
    const rows = [...groupes.values()].map((u) => {
      const res = actifs.filter((e) => e.filiere_id === u.filiere_id && e.niveau_id === u.niveau_id).map((e) => rules.moyenneSemestre(e.id, 1)).filter((r) => r.moyenne !== null);
      const admis = res.filter((r) => r.moyenne >= db.settings().moyenne_validation).length;
      return { groupe: labels.groupe(u.filiere_id, u.niveau_id), evalues: res.length, admis, taux: res.length ? Math.round((admis / res.length) * 100) : null };
    });
    exportsData.reussite = { headers: ['Groupe', 'Évalués', 'Admis', 'Taux de réussite'], rows: rows.map((r) => [r.groupe, r.evalues, r.admis, r.taux === null ? '—' : `${r.taux}%`]) };
    document.getElementById('tReussite').innerHTML = rows.map((r) => `<div class="mb-3"><div class="d-flex justify-content-between text-sm mb-1"><strong>${esc(r.groupe)}</strong><span class="text-secondary">${r.admis}/${r.evalues} admis</span></div>${r.taux === null ? '<span class="text-secondary text-sm">Pas encore de notes</span>' : C360.ui.progress(r.taux, r.taux >= 60 ? 'success' : r.taux >= 40 ? 'warning' : 'danger')}</div>`).join('') || '<div class="empty-state">Aucune donnée</div>';
  }

  if (has('cAbsences')) {
    const mats = [...new Set(db.all('presences').map((p) => db.get('seances', p.seance_id).matiere_id))];
    const stat = mats.map((m) => {
      const pres = db.all('presences').filter((p) => db.get('seances', p.seance_id).matiere_id === m);
      return { m, abs: pres.filter((p) => p.statut === 'Absent').length, ret: pres.filter((p) => p.statut === 'Retard').length };
    });
    exportsData.absences = { headers: ['Matière', 'Absences', 'Retards'], rows: stat.map((s) => [labels.matiere(s.m), s.abs, s.ret]) };
    new Chart(document.getElementById('cAbsences'), { type: 'bar', data: { labels: stat.map((s) => db.get('matieres', s.m).code), datasets: [{ label: 'Absences', data: stat.map((s) => s.abs), backgroundColor: '#d6336c', borderRadius: 4 }, { label: 'Retards', data: stat.map((s) => s.ret), backgroundColor: '#f08c00', borderRadius: 4 }] }, options: { scales: { y: { ticks: { precision: 0 } } } } });
  }

  if (has('cRecettes')) {
    const du = document.getElementById('rDu');
    const au = document.getElementById('rAu');
    du.value = '2026-09-01'; au.value = fmt.today();
    let chart = null;
    const renderRecettes = () => {
      const pays = db.where('paiements', (p) => p.statut === 'Validé' && p.date >= du.value && p.date <= au.value);
      const parSemaine = {};
      pays.forEach((p) => {
        const d = new Date(`${p.date}T00:00:00`);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi de la semaine
        const k = d.toISOString().slice(0, 10);
        parSemaine[k] = (parSemaine[k] || 0) + p.montant;
      });
      const keys = Object.keys(parSemaine).sort();
      const modes = ['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque'];
      exportsData.recettes = { headers: ['Semaine du', 'Recettes (FCFA)'], rows: keys.map((k) => [fmt.date(k), parSemaine[k]]) };
      if (chart) chart.destroy();
      chart = new Chart(document.getElementById('cRecettes'), { type: 'line', data: { labels: keys.map((k) => `Sem. du ${fmt.date(k)}`), datasets: [{ label: 'Recettes', data: keys.map((k) => parSemaine[k]), borderColor: colors[0], backgroundColor: 'rgba(54,81,212,.12)', fill: true, tension: .3 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: C360.charts.moneyTooltip } } }, scales: { y: { ticks: { callback: C360.charts.moneyTick } } } } });
      const total = pays.reduce((s, p) => s + p.montant, 0);
      document.getElementById('recettesTotal').innerHTML = `Total de la période : <strong>${fmt.money(total)}</strong> · ${modes.map((m) => `${m} : ${fmt.money(pays.filter((p) => p.mode === m).reduce((s, p) => s + p.montant, 0))}`).join(' · ')}`;
    };
    du.addEventListener('change', renderRecettes);
    au.addEventListener('change', renderRecettes);
    renderRecettes();
  } else {
    document.getElementById('rDu').remove();
    document.getElementById('rAu').remove();
  }

  if (has('tImpayes')) {
    const rows = db.all('filieres').map((f) => {
      const list = actifs.filter((e) => e.filiere_id === f.id).map((e) => rules.situationFinanciere(e.id)).filter((s) => s.reste > 0);
      return { f, n: list.length, reste: list.reduce((s, x) => s + x.reste, 0) };
    });
    exportsData.impayes = { headers: ['Filière', 'Étudiants avec impayés', 'Reste dû (FCFA)'], rows: rows.map((r) => [r.f.nom, r.n, r.reste]) };
    const total = rows.reduce((s, r) => s + r.reste, 0);
    document.getElementById('tImpayes').innerHTML = rows.map((r) => `<tr><td>${esc(r.f.code)}</td><td class="text-center">${r.n}</td><td class="text-end text-nowrap">${fmt.money(r.reste)}</td></tr>`).join('')
      + `<tr class="fw-bold"><td>Total</td><td class="text-center">${rows.reduce((s, r) => s + r.n, 0)}</td><td class="text-end text-nowrap text-danger">${fmt.money(total)}</td></tr>`;
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-export]');
    if (b && exportsData[b.dataset.export]) { const x = exportsData[b.dataset.export]; C360.exporter.csv(`rapport-${b.dataset.export}`, x.headers, x.rows); }
    if (e.target.closest('[data-print]')) window.print();
  });
});
