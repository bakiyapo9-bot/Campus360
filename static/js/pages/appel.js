/* Appel : enregistrement des présences, absences et retards pour une séance et une date. */
C360.page(function () {
  'use strict';
  const { db, ui, fmt, labels, esc } = C360;
  const role = C360.session.role();
  const selSeance = document.getElementById('aSeance');
  const inputDate = document.getElementById('aDate');
  const body = document.getElementById('appelBody');

  const seances = db.where('seances', (s) => role !== 'enseignant' || s.enseignant_id === C360.ROLES.enseignant.enseignant_id)
    .sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut));
  ui.fillSelect(selSeance, seances, { label: (s) => `${labels.jour(s.jour)} ${s.debut}–${s.fin} · ${labels.matiere(s.matiere_id)} (${s.type}) · ${labels.groupe(s.filiere_id, s.niveau_id)} · ${labels.salle(s.salle_id)}` });

  // Date par défaut : dernière occurrence du jour de la séance (jusqu'à aujourd'hui)
  function defaultDate() {
    const s = db.get('seances', selSeance.value);
    if (!s) return;
    const d = new Date();
    const diff = (d.getDay() - s.jour + 7) % 7;
    d.setDate(d.getDate() - diff);
    inputDate.value = d.toISOString().slice(0, 10);
  }
  inputDate.max = fmt.today();

  function render() {
    const s = db.get('seances', selSeance.value);
    if (!s) { body.innerHTML = ui.empty(5, 'Aucune séance'); return; }
    const d = new Date(`${inputDate.value}T00:00:00`);
    document.getElementById('dateWarning').innerHTML = inputDate.value && d.getDay() !== s.jour
      ? `<div class="alert alert-warning py-2 mb-0 text-sm"><i class="bi bi-exclamation-triangle me-1"></i>Cette séance a lieu le ${labels.jour(s.jour).toLowerCase()} ; la date choisie est un ${d.toLocaleDateString('fr-FR', { weekday: 'long' })}.</div>` : '';
    const etus = db.where('etudiants', (e) => e.statut === 'Actif' && e.filiere_id === s.filiere_id && e.niveau_id === s.niveau_id).sort((a, b) => a.nom.localeCompare(b.nom));
    body.innerHTML = etus.map((e, i) => {
      const p = db.all('presences').find((x) => x.seance_id === s.id && x.etudiant_id === e.id && x.date === inputDate.value);
      const st = p ? p.statut : 'Présent';
      const radio = (val, cls, icon) => `<input type="radio" class="btn-check" name="st_${e.id}" id="st_${e.id}_${val}" value="${val}" ${st === val ? 'checked' : ''}><label class="btn btn-sm btn-outline-${cls}" for="st_${e.id}_${val}" title="${val}"><i class="bi bi-${icon}"></i><span class="d-none d-md-inline ms-1">${val}</span></label>`;
      return `<tr data-etu="${e.id}"><td class="text-secondary">${i + 1}</td>
        <td><div class="d-flex align-items-center gap-2">${ui.avatar(`${e.prenom} ${e.nom}`, null, e.photo)}<div><div class="fw-medium">${esc(e.nom.toUpperCase())} ${esc(e.prenom)}</div><div class="text-xs text-secondary font-monospace">${esc(e.matricule)}</div></div></div></td>
        <td class="text-center"><div class="btn-group" role="group" aria-label="Statut de présence">${radio('Présent', 'success', 'check-lg')}${radio('Absent', 'danger', 'x-lg')}${radio('Retard', 'warning', 'clock')}</div></td>
        <td><input type="number" class="form-control form-control-sm" style="width:90px" name="retard_${e.id}" min="1" max="240" value="${p && p.minutes_retard ? p.minutes_retard : ''}" ${st === 'Retard' ? '' : 'disabled'} aria-label="Minutes de retard"></td>
        <td><input type="text" class="form-control form-control-sm" name="obs_${e.id}" value="${esc(p ? p.motif : '')}" maxlength="120" aria-label="Observation"></td></tr>`;
    }).join('') || ui.empty(5, 'Aucun étudiant dans ce groupe');
    stats();
  }

  function stats() {
    const rows = [...body.querySelectorAll('tr[data-etu]')];
    const c = (v) => rows.filter((r) => r.querySelector(`input[type=radio][value="${v}"]`).checked).length;
    document.getElementById('appelStats').innerHTML = `<span class="text-success me-3"><i class="bi bi-check-circle me-1"></i>${c('Présent')} présents</span><span class="text-danger me-3"><i class="bi bi-x-circle me-1"></i>${c('Absent')} absents</span><span class="text-warning"><i class="bi bi-clock me-1"></i>${c('Retard')} retards</span>`;
  }

  body.addEventListener('change', (e) => {
    if (e.target.type === 'radio') {
      const tr = e.target.closest('tr');
      const retard = tr.querySelector('input[name^="retard_"]');
      retard.disabled = e.target.value !== 'Retard';
      retard.required = e.target.value === 'Retard';
      if (retard.disabled) retard.value = '';
      stats();
    }
  });
  document.getElementById('btnAllPresent').addEventListener('click', () => {
    body.querySelectorAll('input[type=radio][value="Présent"]').forEach((r) => { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
  });

  document.getElementById('appelForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = ev.target;
    if (!inputDate.value) { ui.toast('Choisissez la date de la séance.', 'warning'); return; }
    if (!ui.validate(form)) { ui.toast('Indiquez la durée des retards.', 'warning'); return; }
    const s = db.get('seances', selSeance.value);
    body.querySelectorAll('tr[data-etu]').forEach((tr) => {
      const etuId = Number(tr.dataset.etu);
      const statut = tr.querySelector('input[type=radio]:checked').value;
      const existing = db.all('presences').find((x) => x.seance_id === s.id && x.etudiant_id === etuId && x.date === inputDate.value);
      const data = { seance_id: s.id, etudiant_id: etuId, date: inputDate.value, statut, minutes_retard: statut === 'Retard' ? Number(tr.querySelector('input[name^="retard_"]').value) : 0, motif: tr.querySelector('input[name^="obs_"]').value.trim(), justifiee: existing ? existing.justifiee && statut === 'Absent' : false };
      if (existing) db.update('presences', existing.id, data); else db.insert('presences', data);
    });
    form.classList.remove('was-validated');
    ui.toast(`Appel enregistré pour le ${fmt.date(inputDate.value)}.`);
  });

  selSeance.addEventListener('change', () => { defaultDate(); render(); });
  inputDate.addEventListener('change', render);
  defaultDate();
  render();
});
