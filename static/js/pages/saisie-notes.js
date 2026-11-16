/* Saisie des notes d'une évaluation : contrôle du barème, absents, statistiques en direct. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, esc } = C360;
  const selMat = document.getElementById('sMatiere');
  const selEval = document.getElementById('sEval');
  const body = document.getElementById('gradesBody');
  const mats = C360.notes.matieresAccessibles();

  ui.fillSelect(selMat, mats, { label: (m) => `${m.code} — ${m.intitule}` });
  const preEval = db.get('evaluations', C360.param('evaluation'));
  if (preEval && mats.some((m) => m.id === preEval.matiere_id)) selMat.value = preEval.matiere_id;

  const parse = (v) => { const s = String(v).trim().replace(',', '.'); return s === '' ? null : Number(s); };

  function fillEvals() {
    ui.fillSelect(selEval, db.where('evaluations', (e) => e.matiere_id === Number(selMat.value)), { label: (e) => `${e.libelle} — ${fmt.date(e.date)} (${e.poids} %)`, placeholder: db.where('evaluations', (e) => e.matiere_id === Number(selMat.value)).length ? null : 'Aucune évaluation' });
    if (preEval && preEval.matiere_id === Number(selMat.value)) selEval.value = preEval.id;
  }

  function stats() {
    const ev = db.get('evaluations', selEval.value);
    if (!ev) return;
    const vals = [...body.querySelectorAll('[data-note]')].map((i) => ({ v: parse(i.value), abs: body.querySelector(`[data-abs="${i.dataset.note}"]`).checked, el: i }));
    const notes = vals.filter((x) => !x.abs && x.v !== null && !Number.isNaN(x.v) && x.v >= 0 && x.v <= ev.note_max).map((x) => (x.v / ev.note_max) * 20);
    vals.forEach((x) => {
      const out = body.querySelector(`[data-sur20="${x.el.dataset.note}"]`);
      out.textContent = x.abs ? 'ABS' : (x.v === null || Number.isNaN(x.v) ? '—' : fmt.note((x.v / ev.note_max) * 20));
      out.className = `text-center fw-semibold ${!x.abs && x.v !== null && (x.v / ev.note_max) * 20 < 10 ? 'text-danger' : ''}`;
    });
    const moy = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
    document.getElementById('gradeStats').innerHTML = `Saisies : <strong>${vals.filter((x) => x.abs || x.v !== null).length}/${vals.length}</strong> · Moyenne : <strong>${fmt.note(moy)}</strong> · Min : <strong>${notes.length ? fmt.note(Math.min(...notes)) : '—'}</strong> · Max : <strong>${notes.length ? fmt.note(Math.max(...notes)) : '—'}</strong> · ≥ 10 : <strong>${notes.filter((n) => n >= 10).length}</strong>`;
  }

  function render() {
    const ev = db.get('evaluations', selEval.value);
    const info = document.getElementById('evalInfo');
    if (!ev) { body.innerHTML = ui.empty(6, 'Sélectionnez une évaluation'); info.innerHTML = ''; return; }
    const m = db.get('matieres', ev.matiere_id);
    const u = db.get('ues', m.ue_id);
    const locked = ev.statut === 'Notes saisies' && C360.session.role() === 'enseignant';
    info.innerHTML = `<div class="d-flex flex-wrap gap-3 text-sm"><span><i class="bi bi-people me-1"></i>${esc(labels.groupe(u.filiere_id, u.niveau_id))}</span><span><i class="bi bi-calendar me-1"></i>${fmt.date(ev.date)}</span><span><i class="bi bi-percent me-1"></i>Poids ${ev.poids} %</span><span><i class="bi bi-rulers me-1"></i>Noté sur ${ev.note_max}</span><span>${ui.badge(ev.statut)}</span></div>
      ${locked ? '<div class="alert alert-info py-2 mt-2 mb-0 text-sm"><i class="bi bi-lock me-1"></i>Notes validées : la modification nécessite l\'intervention de la scolarité.</div>' : ''}`;
    const etus = C360.notes.etudiantsDeMatiere(m.id);
    body.innerHTML = etus.map((e, idx) => {
      const n = db.all('notes').find((x) => x.evaluation_id === ev.id && x.etudiant_id === e.id);
      return `<tr><td class="text-secondary">${idx + 1}</td><td class="fw-medium">${esc(e.nom.toUpperCase())} ${esc(e.prenom)}</td><td class="font-monospace text-sm">${esc(e.matricule)}</td>
        <td class="text-center"><input type="text" inputmode="decimal" class="form-control form-control-sm grade-input mx-auto" data-note="${e.id}" value="${n && !n.absent ? String(n.valeur).replace('.', ',') : ''}" ${n && n.absent ? 'disabled' : ''} ${locked ? 'readonly' : ''} aria-label="Note de ${esc(e.prenom)} ${esc(e.nom)}"></td>
        <td class="text-center"><input type="checkbox" class="form-check-input" data-abs="${e.id}" ${n && n.absent ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="Absent"></td>
        <td class="text-center fw-semibold" data-sur20="${e.id}">—</td></tr>`;
    }).join('') || ui.empty(6, 'Aucun étudiant inscrit');
    document.querySelectorAll('#gradesForm button').forEach((b) => { b.disabled = locked; });
    stats();
  }

  function validateInputs(ev) {
    let ok = true;
    body.querySelectorAll('[data-note]').forEach((i) => {
      const v = parse(i.value);
      const bad = v !== null && (Number.isNaN(v) || v < 0 || v > ev.note_max);
      i.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    return ok;
  }

  function save(final) {
    const ev = db.get('evaluations', selEval.value);
    if (!ev) return;
    if (!validateInputs(ev)) { ui.toast(`Certaines notes sont invalides (attendu : 0 à ${ev.note_max}).`, 'danger'); return; }
    const missing = [...body.querySelectorAll('[data-note]')].filter((i) => parse(i.value) === null && !body.querySelector(`[data-abs="${i.dataset.note}"]`).checked).length;
    if (final && missing) { ui.toast(`${missing} étudiant(s) sans note : saisissez une note ou cochez « Absent ».`, 'warning'); return; }
    body.querySelectorAll('[data-note]').forEach((i) => {
      const etuId = Number(i.dataset.note);
      const abs = body.querySelector(`[data-abs="${etuId}"]`).checked;
      const v = parse(i.value);
      const existing = db.all('notes').find((x) => x.evaluation_id === ev.id && x.etudiant_id === etuId);
      if (!abs && v === null) { if (existing) db.remove('notes', existing.id); return; }
      const data = { evaluation_id: ev.id, etudiant_id: etuId, valeur: abs ? 0 : v, absent: abs };
      if (existing) db.update('notes', existing.id, data); else db.insert('notes', data);
    });
    db.update('evaluations', ev.id, { statut: final ? 'Notes saisies' : 'En cours de saisie' });
    C360.audit(final ? 'Notes validées' : 'Brouillon de notes', `${ev.libelle} — ${labels.matiere(ev.matiere_id)}`);
    ui.toast(final ? 'Notes validées.' : 'Brouillon enregistré.');
    render();
  }

  body.addEventListener('input', (e) => { if (e.target.matches('[data-note]')) { e.target.classList.remove('is-invalid'); stats(); } });
  body.addEventListener('change', (e) => {
    if (!e.target.matches('[data-abs]')) return;
    const input = body.querySelector(`[data-note="${e.target.dataset.abs}"]`);
    input.disabled = e.target.checked;
    if (e.target.checked) input.value = '';
    stats();
  });
  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('[data-note]')) return;
    e.preventDefault();
    const inputs = [...body.querySelectorAll('[data-note]:not([disabled])')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus();
  });

  selMat.addEventListener('change', () => { fillEvals(); render(); });
  selEval.addEventListener('change', render);
  document.getElementById('btnDraft').addEventListener('click', () => save(false));
  document.getElementById('gradesForm').addEventListener('submit', (e) => { e.preventDefault(); save(true); });

  fillEvals();
  render();
});
