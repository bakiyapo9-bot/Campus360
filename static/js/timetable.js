/* Campus360 — Rendu d'un emploi du temps hebdomadaire (lundi → samedi, 07h30 → 19h00).
   Les séances sont positionnées en absolu selon leurs horaires réels. */
(function () {
  'use strict';
  const C360 = window.C360;
  const START = 7 * 60 + 30;
  const END = 19 * 60;
  const PX_PER_MIN = 0.9;
  const TYPE_COLORS = { CM: ['rgba(54,81,212,.12)', '#3651d4'], TD: ['rgba(15,163,154,.13)', '#0f8f87'], TP: ['rgba(240,140,0,.14)', '#c26d00'], Examen: ['rgba(214,51,108,.12)', '#c2255c'] };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  function render(container, seances, { onClick = null, subtitle = (s) => `${C360.labels.salle(s.salle_id)} · ${C360.labels.groupe(s.filiere_id, s.niveau_id)}`, days = [1, 2, 3, 4, 5, 6] } = {}) {
    const { esc, labels } = C360;
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    const height = (END - START) * PX_PER_MIN;
    let hours = '';
    for (let m = 8 * 60; m <= 18 * 60; m += 60) {
      hours += `<div class="position-absolute w-100 text-end pe-2 text-xs text-secondary" style="top:${(m - START) * PX_PER_MIN - 7}px">${String(m / 60).padStart(2, '0')}:00</div>`;
    }
    let lines = '';
    for (let m = 8 * 60; m <= 18 * 60; m += 60) lines += `<div class="position-absolute w-100 border-top" style="top:${(m - START) * PX_PER_MIN}px;opacity:.6"></div>`;

    const cols = days.map((d) => {
      const blocks = seances.filter((s) => s.jour === d).map((s) => {
        const [bg, fg] = TYPE_COLORS[s.type] || TYPE_COLORS.CM;
        const top = (toMin(s.debut) - START) * PX_PER_MIN;
        const h = (toMin(s.fin) - toMin(s.debut)) * PX_PER_MIN;
        return `<div class="session-block position-absolute" style="top:${top + 1}px;height:${h - 2}px;left:3px;right:3px;background:${bg};color:${fg};overflow:hidden" ${onClick ? `data-seance="${s.id}" role="button" tabindex="0"` : ''} title="${esc(labels.matiere(s.matiere_id))} — ${s.debut}-${s.fin}">
          <strong class="text-truncate">${esc(labels.matiere(s.matiere_id))}</strong>
          <span class="d-block text-body-secondary">${s.debut} – ${s.fin} · ${esc(s.type)}</span>
          <span class="d-block text-body-secondary text-truncate">${esc(subtitle(s))}</span>
        </div>`;
      }).join('');
      return `<div class="flex-fill border-start position-relative" style="min-width:130px">
        <div class="text-center fw-semibold text-sm py-2 border-bottom bg-body-tertiary">${labels.jour(d)}</div>
        <div class="position-relative" style="height:${height}px">${lines}${blocks}</div></div>`;
    }).join('');

    el.innerHTML = `<div class="overflow-auto"><div class="d-flex" style="min-width:${days.length * 130 + 60}px">
      <div style="width:60px;flex-shrink:0"><div class="py-2 border-bottom text-sm">&nbsp;</div><div class="position-relative" style="height:${height}px">${hours}</div></div>
      ${cols}</div></div>
      <div class="d-flex flex-wrap gap-3 mt-3 text-xs">${Object.entries(TYPE_COLORS).map(([k, [bg, fg]]) => `<span><span class="d-inline-block rounded me-1" style="width:12px;height:12px;background:${bg};border-left:3px solid ${fg};vertical-align:middle"></span>${k}</span>`).join('')}</div>`;

    if (onClick) {
      el.querySelectorAll('[data-seance]').forEach((b) => {
        const fire = () => onClick(Number(b.dataset.seance));
        b.addEventListener('click', fire);
        b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
      });
    }
  }

  C360.timetable = { render };
})();
