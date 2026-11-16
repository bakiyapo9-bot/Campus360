/* Création / modification d'un étudiant (avec photo). */
C360.page(function () {
  'use strict';
  const { db, ui, rules, labels } = C360;
  const form = document.getElementById('studentForm');
  const id = Number(C360.param('id')) || null;
  const etu = id ? db.get('etudiants', id) : null;
  let photoData = etu ? etu.photo : null;

  ui.fillSelect('#filiere_id', db.all('filieres'), { label: (f) => `${f.code} — ${f.nom}`, placeholder: 'Choisir…' });
  ui.fillSelect('#niveau_id', db.all('niveaux'), { label: 'nom', placeholder: 'Choisir…' });
  ui.fillSelect('#annee_id', db.all('annees'), { label: 'libelle', selected: db.settings().annee_courante_id });

  const renderPhoto = () => {
    const name = `${form.prenom.value || 'Nouvel'} ${form.nom.value || 'Étudiant'}`;
    document.getElementById('photoPreview').innerHTML = photoData ? `<img src="${photoData}" alt="Photo de l'étudiant">` : ui.avatar(name, 'xl');
    document.getElementById('removePhoto').classList.toggle('d-none', !photoData);
  };

  if (etu) {
    document.getElementById('formTitle').textContent = `Modifier — ${etu.prenom} ${etu.nom}`;
    document.getElementById('crumb').textContent = 'Modification';
    document.getElementById('createInscriptionWrap').classList.add('d-none');
    Object.entries(etu).forEach(([k, v]) => { if (form.elements[k] && form.elements[k].type !== 'file') form.elements[k].value = v ?? ''; });
  } else {
    form.matricule.value = rules.genererMatricule(labels.annee(db.settings().annee_courante_id));
  }
  renderPhoto();
  ['nom', 'prenom'].forEach((f) => form[f].addEventListener('input', () => { if (!photoData) renderPhoto(); }));

  document.getElementById('photo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { ui.toast('Format d\'image non accepté.', 'danger'); return; }
    if (file.size > 1024 * 1024) { ui.toast('La photo dépasse 1 Mo.', 'danger'); return; }
    const reader = new FileReader();
    reader.onload = () => { photoData = reader.result; renderPhoto(); };
    reader.readAsDataURL(file);
  });
  document.getElementById('removePhoto').addEventListener('click', () => { photoData = null; document.getElementById('photo').value = ''; renderPhoto(); });

  // Date de naissance : l'étudiant doit avoir au moins 15 ans
  const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() - 15);
  form.date_naissance.max = maxDate.toISOString().slice(0, 10);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = [];
    const emailUsed = db.all('etudiants').find((x) => x.email.toLowerCase() === form.email.value.trim().toLowerCase() && x.id !== id);
    form.email.setCustomValidity(emailUsed ? 'used' : '');
    if (emailUsed) errors.push(`L'adresse e-mail est déjà utilisée par ${emailUsed.prenom} ${emailUsed.nom} (${emailUsed.matricule}).`);
    ui.showErrors('#formErrors', errors);
    if (!ui.validate(form) || errors.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    const d = ui.formData(form);
    const payload = {
      nom: d.nom, prenom: d.prenom, sexe: d.sexe, date_naissance: d.date_naissance, lieu_naissance: d.lieu_naissance,
      nationalite: d.nationalite, email: d.email, telephone: d.telephone, adresse: d.adresse, tuteur_nom: d.tuteur_nom,
      tuteur_telephone: d.tuteur_telephone, filiere_id: Number(d.filiere_id), niveau_id: Number(d.niveau_id), annee_id: Number(d.annee_id),
      statut: d.statut, photo: photoData,
    };
    let saved;
    if (etu) {
      saved = db.update('etudiants', etu.id, payload);
    } else {
      saved = db.insert('etudiants', Object.assign(payload, { matricule: rules.genererMatricule(labels.annee(payload.annee_id)), date_creation: C360.fmt.today() }));
      if (d.creer_inscription) {
        db.insert('inscriptions', {
          etudiant_id: saved.id, annee_id: payload.annee_id, filiere_id: payload.filiere_id, niveau_id: payload.niveau_id,
          type: 'Nouvelle', date: C360.fmt.today(), statut: 'En attente', pieces: { acte_naissance: false, diplome: false, photo: !!photoData, certificat_medical: false }, motif_rejet: '', derogation: false,
        });
      }
    }
    ui.toast(etu ? 'Modifications enregistrées.' : `Étudiant créé — matricule ${saved.matricule}.`);
    setTimeout(() => { window.location.href = `fiche.html?id=${saved.id}`; }, 700);
  });
});
