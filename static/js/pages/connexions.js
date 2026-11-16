/* Historique des connexions importantes et événements de sécurité (lecture seule). */
C360.page(function () {
  'use strict';
  const { db, esc } = C360;
  const userLabel = (id) => { const u = db.get('users', id); return u ? `${u.prenom} ${u.nom} (${u.username})` : 'Inconnu'; };
  const ICON = { info: 'box-arrow-in-right text-success', warning: 'exclamation-circle text-warning', danger: 'shield-exclamation text-danger' };

  const table = new C360.DataTable({
    tbody: '#tbody', data: () => db.all('connexions'), search: '#search',
    searchFields: ['ip', 'evenement', 'navigateur', (c) => userLabel(c.user_id)],
    filters: [{ el: '#fNiveau', field: 'niveau' }, { el: '#fDate', field: (c, v) => c.date.startsWith(v) }],
    sort: (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    pageSize: 15, colspan: 5,
    render: (c) => `<tr class="${c.niveau === 'danger' ? 'table-danger' : ''}">
      <td class="text-nowrap">${esc(c.date)}</td>
      <td>${c.user_id ? esc(userLabel(c.user_id)) : '<span class="text-secondary">—</span>'}</td>
      <td><i class="bi bi-${ICON[c.niveau] || ICON.info} me-2"></i>${esc(c.evenement)}</td>
      <td class="font-monospace text-sm">${esc(c.ip)}</td>
      <td class="text-sm text-secondary">${esc(c.navigateur)}</td></tr>`,
  });

  document.getElementById('btnExport').addEventListener('click', () => C360.exporter.csv('journal-connexions', ['Date', 'Utilisateur', 'Événement', 'IP', 'Navigateur', 'Niveau'],
    table.lastRows.map((c) => [c.date, c.user_id ? userLabel(c.user_id) : '', c.evenement, c.ip, c.navigateur, c.niveau])));
});
