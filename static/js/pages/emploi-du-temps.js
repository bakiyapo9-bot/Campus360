/* Emplois du temps : consultation par groupe / enseignant / salle, planification et
   modification des séances avec détection des conflits (enseignant, salle, groupe). */
C360.page(function () {
  'use strict';
  const { db, ui, labels, esc, rules } = C360;
  const role = C360.session.role();
  const canWrite = ['admin', 'scolarite'].includes(role);
  const form = document.getElementById('seanceForm');
  const modal = new bootstrap.Modal('#seanceModal');
  let editing = null;

  if (!canWrite) document.querySelectorAll('[data-perm="write"]').forEach((el) => el.remove());

  const groupes = () => {
    const seen = new Map();
    db.all('ues').forEach((u) => seen.set(`${u.filiere_id}-${u.niveau_id}`, { value: `${u.filiere_id}-${u.niveau_id}`, label: `${labels.groupe(u.filiere_id, u.niveau_id)} — ${labels.filiere(u.filiere_id)}` }));
    return [...seen.values()];
  };
  const vue = () => form.ownerDocument.querySelector('[name=vue]:checked').value;

  function fillCible() {
    const v = vue();
    const sel = document.getElementById('fCible');
    if (v === 'groupe') ui.fillSelect(sel, groupes(), { value: 'value', label: 'label' });
    if (v === 'enseignant') ui.fillSelect(sel, db.where('enseignants', (e) => e.statut === 'Actif'), { label: (e) => `${e.civilite} ${e.prenom} ${e.nom}` });
    if (v === 'salle') ui.fillSelect(sel, db.all('salles'), { label: (s) => `${s.code} — ${s.nom} (${s.capacite} pl.)` });
  }

  function seancesFiltrees() {
    const v = vue();
    const c = document.getElementById('fCible').value;
    return db.all('seances').filter((s) => {
      if (v === 'groupe') return `${s.filiere_id}-${s.niveau_id}` === c;
      if (v === 'enseignant') return s.enseignant_id === Number(c);
      return s.salle_id === Number(c);
    });
  }

  function render() {
    const v = vue();
    const list = seancesFiltrees();
    document.getElementById('nbSeances').textContent = `${list.length} séance(s) / semaine`;
    C360.timetable.render('#timetable', list, {
      onClick: canWrite ? openEdit : null,
      subtitle: (s) => (v === 'groupe' ? `${labels.salle(s.salle_id)} · ${labels.enseignant(s.enseignant_id)}` : v === 'enseignant' ? `${labels.salle(s.salle_id)} · ${labels.groupe(s.filiere_id, s.niveau_id)}` : `${labels.groupe(s.filiere_id, s.niveau_id)} · ${labels.enseignant(s.enseignant_id)}`),
    });
  }

  // Enseignant et étudiant : vue figée sur leur propre emploi du temps
  if (role === 'enseignant') {
    document.getElementById('vEns').checked = true; fillCible();
    document.getElementById('fCible').value = C360.ROLES.enseignant.enseignant_id;
    document.getElementById('filtersCard').classList.add('d-none');
  } else if (role === 'etudiant') {
    const e = db.get('etudiants', C360.ROLES.etudiant.etudiant_id);
    fillCible();
    document.getElementById('fCible').value = `${e.filiere_id}-${e.niveau_id}`;
    document.getElementById('filtersCard').classList.add('d-none');
  } else {
    fillCible();
  }
  document.querySelectorAll('[name=vue]').forEach((r) => r.addEventListener('change', () => { fillCible(); render(); }));
  document.getElementById('fCible').addEventListener('change', render);

  /* ------------------------------------------------------- Formulaire --- */
  function fillMatieres() {
    const [f, n] = (form.groupe.value || '-').split('-').map(Number);
    const uesIds = db.where('ues', (u) => u.filiere_id === f && u.niveau_id === n).map((u) => u.id);
    ui.fillSelect(form.matiere_id, db.where('matieres', (m) => uesIds.includes(m.ue_id)), { label: (m) => `${m.code} — ${m.intitule}`, placeholder: 'Choisir…' });
  }

  function payload() {
    const [filiere_id, niveau_id] = form.groupe.value.split('-').map(Number);
    return {
      id: editing ? editing.id : null, filiere_id, niveau_id, matiere_id: Number(form.matiere_id.value), enseignant_id: Number(form.enseignant_id.value),
      salle_id: Number(form.salle_id.value), jour: Number(form.jour.value), debut: form.debut.value, fin: form.fin.value, type: form.type.value,
    };
  }

  function liveCheck() {
    const box = document.getElementById('liveCheck');
    if (!form.groupe.value || !form.enseignant_id.value || !form.salle_id.value || !form.debut.value || !form.fin.value) { box.innerHTML = ''; return []; }
    const conflits = rules.conflitsSeance(payload());
    box.innerHTML = conflits.length
      ? `<div class="alert alert-danger mb-0"><strong><i class="bi bi-exclamation-octagon me-1"></i>Conflits détectés :</strong><ul class="mb-0 mt-1">${conflits.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`
      : '<div class="alert alert-success mb-0 py-2"><i class="bi bi-check-circle me-1"></i>Aucun conflit : créneau disponible.</div>';
    return conflits;
  }

  function open(seance, preset) {
    editing = seance;
    form.reset(); form.classList.remove('was-validated');
    ui.showErrors('#seanceErrors', []);
    ui.fillSelect(form.groupe, groupes(), { value: 'value', label: 'label', placeholder: 'Choisir…' });
    ui.fillSelect(form.enseignant_id, db.where('enseignants', (e) => e.statut === 'Actif'), { label: (e) => `${e.civilite} ${e.prenom} ${e.nom}`, placeholder: 'Choisir…' });
    ui.fillSelect(form.salle_id, db.all('salles'), { label: (s) => `${s.code} — ${s.nom} (${s.capacite} pl.)${s.statut !== 'Disponible' ? ` — ${s.statut}` : ''}`, placeholder: 'Choisir…' });
    const src = seance || preset || {};
    if (src.filiere_id) form.groupe.value = `${src.filiere_id}-${src.niveau_id}`;
    fillMatieres();
    ['matiere_id', 'enseignant_id', 'salle_id', 'jour', 'debut', 'fin', 'type'].forEach((k) => { if (src[k] !== undefined) form.elements[k].value = src[k]; });
    document.getElementById('seanceTitle').textContent = seance ? 'Modifier la séance' : 'Planifier une séance';
    document.getElementById('btnDelete').classList.toggle('d-none', !seance);
    liveCheck();
    modal.show();
  }
  function openEdit(id) { open(db.get('seances', id)); }

  form.groupe.addEventListener('change', fillMatieres);
  form.matiere_id.addEventListener('change', () => { const m = db.get('matieres', form.matiere_id.value); if (m && m.enseignant_id && !form.enseignant_id.value) form.enseignant_id.value = m.enseignant_id; liveCheck(); });
  form.addEventListener('change', liveCheck);

  if (canWrite) {
    document.getElementById('btnNew').addEventListener('click', () => {
      const preset = { jour: 1, debut: '08:00', fin: '10:00', type: 'CM' };
      if (vue() === 'groupe') { const [f, n] = document.getElementById('fCible').value.split('-').map(Number); Object.assign(preset, { filiere_id: f, niveau_id: n }); }
      if (vue() === 'enseignant') preset.enseignant_id = Number(document.getElementById('fCible').value);
      if (vue() === 'salle') preset.salle_id = Number(document.getElementById('fCible').value);
      open(null, preset);
    });
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!ui.validate(form)) return;
    const conflits = liveCheck();
    if (conflits.length) { ui.showErrors('#seanceErrors', ['Enregistrement impossible : résolvez les conflits ci-dessous.']); return; }
    const data = payload();
    delete data.id;
    if (editing) {
      const changes = [];
      if (editing.salle_id !== data.salle_id) changes.push(`salle ${labels.salle(editing.salle_id)} → ${labels.salle(data.salle_id)}`);
      if (editing.jour !== data.jour || editing.debut !== data.debut) changes.push(`horaire ${labels.jour(editing.jour)} ${editing.debut} → ${labels.jour(data.jour)} ${data.debut}`);
      db.update('seances', editing.id, data);
      if (changes.length) C360.audit('Séance modifiée', `${labels.matiere(data.matiere_id)} (${labels.groupe(data.filiere_id, data.niveau_id)}) : ${changes.join(', ')}`);
      ui.toast(changes.length ? 'Séance modifiée — les étudiants et l\'enseignant seront notifiés.' : 'Séance enregistrée.');
    } else {
      db.insert('seances', data);
      ui.toast('Séance planifiée.');
    }
    modal.hide();
    render();
  });

  document.getElementById('btnDelete').addEventListener('click', async () => {
    modal.hide();
    if (await ui.confirm('La séance sera retirée de l\'emploi du temps.', { title: 'Supprimer la séance ?', okLabel: 'Supprimer', okClass: 'btn-danger' })) {
      db.remove('seances', editing.id); ui.toast('Séance supprimée.'); render();
    }
  });

  document.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) window.print(); });
  render();
});
