/* Création des évaluations (devoirs, examens, TP…) avec leur poids dans la moyenne. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, esc } = C360;
  const mesMatieres = C360.notes.matieresAccessibles();
  const ids = mesMatieres.map((m) => m.id);
  ui.fillSelect('#fMatiere', mesMatieres, { label: (m) => `${m.code} — ${m.intitule}`, placeholder: 'Toutes mes matières' });

  C360.crud({
    mount: '#crud', collection: 'evaluations', title: 'Évaluations', singular: 'une évaluation', search: ['libelle', 'type'],
    data: () => db.where('evaluations', (e) => ids.includes(e.matiere_id)),
    filters: [{ el: '#fMatiere', field: 'matiere_id' }],
    sort: (a, b) => a.matiere_id - b.matiere_id || a.date.localeCompare(b.date),
    columns: [
      { label: 'Matière', render: (e) => { const m = db.get('matieres', e.matiere_id); const u = db.get('ues', m.ue_id); return `<div class="fw-semibold">${esc(m.intitule)}</div><div class="text-xs text-secondary">${esc(labels.groupe(u.filiere_id, u.niveau_id))}</div>`; } },
      { label: 'Évaluation', render: (e) => `<strong>${esc(e.libelle)}</strong>` },
      { label: 'Type', field: 'type' },
      { label: 'Date', render: (e) => fmt.date(e.date) },
      { label: 'Poids', class: 'text-center', render: (e) => `${e.poids} %` },
      { label: 'Barème', class: 'text-center', render: (e) => `/${e.note_max}` },
      { label: 'Notes saisies', class: 'text-center', render: (e) => `${db.where('notes', (n) => n.evaluation_id === e.id).length} / ${C360.notes.etudiantsDeMatiere(e.matiere_id).length}` },
      { label: 'Statut', render: (e) => ui.badge(e.statut) },
    ],
    extraActions: (e) => `<a class="btn btn-sm btn-light" href="saisie.html?evaluation=${e.id}" title="Saisir les notes" aria-label="Saisir les notes"><i class="bi bi-pencil-square"></i></a> `,
    fields: [
      { name: 'matiere_id', label: 'Matière', type: 'select', numeric: true, required: true, options: () => mesMatieres.map((m) => ({ value: m.id, label: `${m.code} — ${m.intitule}` })), col: 12, default: () => document.getElementById('fMatiere').value },
      { name: 'libelle', label: 'Libellé', required: true, placeholder: 'ex. Contrôle continu 2', col: 8 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: C360.options.list(['Devoir', 'Interrogation', 'TP', 'Projet', 'Examen', 'Rattrapage']), col: 4 },
      { name: 'date', label: 'Date', type: 'date', required: true, col: 4 },
      { name: 'poids', label: 'Poids dans la moyenne (%)', type: 'number', required: true, min: 1, max: 100, col: 4 },
      { name: 'note_max', label: 'Noté sur', type: 'number', required: true, min: 1, max: 100, default: 20, col: 4 },
      { name: 'statut', label: 'Statut', type: 'select', required: true, options: C360.options.list(['Planifiée', 'En cours de saisie', 'Notes saisies']), default: 'Planifiée', col: 12 },
    ],
    validate: (d, row) => {
      const total = db.where('evaluations', (e) => e.matiere_id === d.matiere_id && (!row || e.id !== row.id)).reduce((s, e) => s + e.poids, 0) + (d.poids || 0);
      return total > 100 ? [`La somme des poids des évaluations de cette matière dépasserait 100 % (${total} %).`] : [];
    },
    canDelete: (e) => (db.all('notes').some((n) => n.evaluation_id === e.id) ? 'Impossible : des notes ont déjà été saisies pour cette évaluation.' : null),
  });
});
