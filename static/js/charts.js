/* Campus360 — Configuration commune Chart.js (couleurs, police, thème). */
(function () {
  'use strict';
  if (!window.Chart) return;
  const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = dark ? '#9aa4bf' : '#667085';
  Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.07)' : 'rgba(16,24,40,.07)';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.maintainAspectRatio = false;

  window.C360 = window.C360 || {};
  C360.charts = {
    colors: ['#3651d4', '#0fa39a', '#f08c00', '#7c3aed', '#d6336c', '#1c7ed6', '#2b8a3e', '#868e96'],
    moneyTick: (v) => `${(v / 1000000).toLocaleString('fr-FR')} M`,
    moneyTooltip: (ctx) => `${ctx.dataset.label ? `${ctx.dataset.label} : ` : ''}${C360.fmt.money(ctx.parsed.y ?? ctx.parsed)}`,
  };
})();
