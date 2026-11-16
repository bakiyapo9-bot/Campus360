/* Tableau de bord administrateur.
   Django : la vue fournira ces agrégats (Count / Sum) dans le contexte ou via une API JSON. */
C360.page(function () {
  'use strict';
  const { db, rules, fmt, ui, labels, esc } = C360;
  const anneeId = db.settings().annee_courante_id;
  const user = C360.session.user();

  document.getElementById('greeting').textContent = `Bonjour, ${user.nom.split(' ')[0]} 👋`;
  document.getElementById('anneeCourante').textContent = labels.annee(anneeId);

  const actifs = db.where('etudiants', (e) => e.statut === 'Actif');
  const inscCourantes = db.where('inscriptions', (i) => i.annee_id === anneeId);
  const nouveaux = inscCourantes.filter((i) => i.type === 'Nouvelle' && i.statut !== 'Rejetée');
  const attente = inscCourantes.filter((i) => i.statut === 'En attente');

  let attendu = 0; let recu = 0;
  actifs.forEach((e) => { const s = rules.situationFinanciere(e.id, anneeId); attendu += s.total; recu += s.verse; });
  const solde = attendu - recu;

  const kpis = [
    { label: 'Étudiants actifs', value: fmt.number(actifs.length), icon: 'people', cls: 'soft-primary', href: '../etudiants/liste.html' },
    { label: 'Nouveaux inscrits', value: fmt.number(nouveaux.length), icon: 'person-plus', cls: 'soft-teal', href: '../inscriptions/liste.html' },
    { label: 'Enseignants', value: fmt.number(db.where('enseignants', (e) => e.statut === 'Actif').length), icon: 'person-badge', cls: 'soft-purple', href: '../enseignants/liste.html' },
    { label: 'Formations (filières)', value: fmt.number(db.all('filieres').length), icon: 'diagram-3', cls: 'soft-info', href: '../academique/structure.html' },
    { label: 'Inscriptions en attente', value: fmt.number(attente.length), icon: 'hourglass-split', cls: 'soft-warning', href: '../inscriptions/liste.html?statut=En%20attente' },
    { label: 'Total des frais attendus', value: fmt.money(attendu), icon: 'wallet2', cls: 'soft-primary', href: '../finances/frais.html' },
    { label: 'Total des paiements reçus', value: fmt.money(recu), icon: 'cash-stack', cls: 'soft-success', href: '../finances/paiements.html' },
    { label: 'Soldes restant à payer', value: fmt.money(solde), icon: 'exclamation-octagon', cls: 'soft-danger', href: '../finances/impayes.html' },
  ];
  document.getElementById('kpis').innerHTML = kpis.map((k) => `
    <div class="col-sm-6 col-xl-3">
      <a class="card h-100 text-decoration-none text-body" href="${k.href}">
        <div class="card-body stat-card">
          <div class="stat-icon ${k.cls}"><i class="bi bi-${k.icon}"></i></div>
          <div class="min-w-0"><div class="stat-value text-truncate">${esc(k.value)}</div><div class="stat-label">${esc(k.label)}</div></div>
        </div>
      </a>
    </div>`).join('');

  // Évolution mensuelle (sept., oct., nov.)
  const mois = [{ k: '2026-09', l: 'Septembre' }, { k: '2026-10', l: 'Octobre' }, { k: '2026-11', l: 'Novembre' }];
  const inscParMois = mois.map((m) => inscCourantes.filter((i) => i.date.startsWith(m.k)).length);
  const paieParMois = mois.map((m) => db.where('paiements', (p) => p.statut === 'Validé' && p.date.startsWith(m.k)).reduce((s, p) => s + p.montant, 0));
  new Chart(document.getElementById('chartEvolution'), {
    data: {
      labels: mois.map((m) => m.l),
      datasets: [
        { type: 'bar', label: 'Paiements reçus', data: paieParMois, backgroundColor: 'rgba(54,81,212,.85)', borderRadius: 6, yAxisID: 'y', maxBarThickness: 48 },
        { type: 'line', label: 'Inscriptions', data: inscParMois, borderColor: '#0fa39a', backgroundColor: '#0fa39a', tension: .35, yAxisID: 'y1' },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { ticks: { callback: C360.charts.moneyTick }, title: { display: true, text: 'FCFA' } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Inscriptions' } },
      },
      plugins: { tooltip: { callbacks: { label: (ctx) => (ctx.dataset.yAxisID === 'y' ? C360.charts.moneyTooltip(ctx) : `Inscriptions : ${ctx.parsed.y}`) } } },
    },
  });

  // Recouvrement
  const taux = attendu ? Math.round((recu / attendu) * 100) : 0;
  new Chart(document.getElementById('chartRecouvrement'), {
    type: 'doughnut',
    data: { labels: ['Reçu', 'Reste à payer'], datasets: [{ data: [recu, solde], backgroundColor: ['#0fa39a', '#e9ecef'], borderWidth: 0 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label} : ${fmt.money(c.parsed)}` } } } },
    plugins: [{
      id: 'center',
      afterDraw(chart) {
        const { ctx, chartArea: a } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = Chart.defaults.color;
        ctx.font = '700 26px Inter';
        ctx.fillText(`${taux}%`, (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 4);
        ctx.font = '12px Inter';
        ctx.fillText('recouvré', (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 24);
        ctx.restore();
      },
    }],
  });
  document.getElementById('recouvrementLegend').innerHTML = `
    <div><div class="text-xs text-secondary">Reçu</div><div class="fw-semibold text-success">${fmt.money(recu)}</div></div>
    <div><div class="text-xs text-secondary">Restant</div><div class="fw-semibold text-danger">${fmt.money(solde)}</div></div>`;

  // Par filière (stacked par niveau)
  const filieres = db.all('filieres');
  const niveaux = db.all('niveaux');
  new Chart(document.getElementById('chartFilieres'), {
    type: 'bar',
    data: {
      labels: filieres.map((f) => f.code),
      datasets: niveaux.map((n, idx) => ({
        label: n.code,
        data: filieres.map((f) => actifs.filter((e) => e.filiere_id === f.id && e.niveau_id === n.id).length),
        backgroundColor: C360.charts.colors[idx], borderRadius: 4, maxBarThickness: 42,
      })),
    },
    options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { precision: 0 } } }, plugins: { tooltip: { callbacks: { title: (items) => labels.filiere(filieres[items[0].dataIndex].id) } } } },
  });

  new Chart(document.getElementById('chartNiveaux'), {
    type: 'doughnut',
    data: { labels: niveaux.map((n) => n.nom), datasets: [{ data: niveaux.map((n) => actifs.filter((e) => e.niveau_id === n.id).length), backgroundColor: C360.charts.colors, borderWidth: 0 }] },
    options: { cutout: '60%', plugins: { legend: { position: 'right' } } },
  });

  // Tables
  document.getElementById('pendingTable').innerHTML = attente.slice(0, 6).map((i) => {
    const e = db.get('etudiants', i.etudiant_id);
    return `<tr>
      <td><div class="d-flex align-items-center gap-2">${ui.avatar(`${e.prenom} ${e.nom}`)}<div><div class="fw-semibold">${esc(e.prenom)} ${esc(e.nom)}</div><div class="text-xs text-secondary">${esc(e.matricule)}</div></div></div></td>
      <td>${esc(labels.groupe(i.filiere_id, i.niveau_id))}</td>
      <td class="text-nowrap">${fmt.date(i.date)}</td>
      <td class="text-end"><a class="btn btn-sm btn-light" href="../inscriptions/liste.html?statut=En%20attente">Traiter</a></td>
    </tr>`;
  }).join('') || ui.empty(4, 'Aucune inscription en attente');

  const derniers = db.where('paiements', (p) => p.statut === 'Validé').sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 6);
  document.getElementById('paymentsTable').innerHTML = derniers.map((p) => `<tr>
      <td><a href="../finances/recu.html?id=${p.id}" class="fw-semibold">${esc(p.numero_recu)}</a></td>
      <td>${esc(labels.etudiant(p.etudiant_id))}</td>
      <td class="text-end fw-semibold text-nowrap">${fmt.money(p.montant)}</td>
      <td class="text-nowrap">${fmt.date(p.date)}</td></tr>`).join('') || ui.empty(4);
});
