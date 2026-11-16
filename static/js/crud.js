/* ==========================================================================
   Campus360 — Composant CRUD générique (liste + recherche + modale d'édition)
   Utilisé pour les référentiels : années, facultés, filières, niveaux,
   semestres, UE, matières, salles, utilisateurs…
   Django : chaque instance correspond à un ModelForm + ListView/CreateView/UpdateView.
   ========================================================================== */
(function () {
  'use strict';
  const C360 = window.C360;
  let seq = 0;

  function fieldHtml(f, uid) {
    const id = `${uid}_${f.name}`;
    const req = f.required ? ' required' : '';
    const attrs = ['min', 'max', 'step', 'maxlength', 'pattern', 'placeholder'].filter((a) => f[a] !== undefined).map((a) => ` ${a}="${C360.esc(f[a])}"`).join('');
    const label = `<label class="form-label" for="${id}">${C360.esc(f.label)}${f.required ? ' *' : ''}</label>`;
    const help = f.help ? `<div class="form-text">${C360.esc(f.help)}</div>` : '';
    const fb = `<div class="invalid-feedback">${C360.esc(f.invalid || 'Valeur invalide ou manquante.')}</div>`;
    let input;
    if (f.type === 'select') {
      input = `<select class="form-select" id="${id}" name="${f.name}"${req}></select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="form-control" id="${id}" name="${f.name}" rows="3"${req}${attrs}></textarea>`;
    } else if (f.type === 'checkbox') {
      return `<div class="col-${f.col || 12}"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="${id}" name="${f.name}"><label class="form-check-label" for="${id}">${C360.esc(f.label)}</label></div>${help}</div>`;
    } else {
      input = `<input class="form-control" type="${f.type || 'text'}" id="${id}" name="${f.name}"${req}${attrs}>`;
    }
    return `<div class="col-md-${f.col || 12}">${label}${input}${fb}${help}</div>`;
  }

  C360.crud = function (cfg) {
    const { db, ui, esc } = C360;
    const uid = `crud${++seq}`;
    const mount = typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount;
    const readOnly = !!cfg.readOnly;
    const data = cfg.data || (() => db.all(cfg.collection));

    mount.innerHTML = `
      <div class="card">
        <div class="card-header d-flex flex-wrap align-items-center gap-2">
          <h5 class="me-auto">${esc(cfg.title)} <span class="badge text-bg-light border ms-1" id="${uid}_count">0</span></h5>
          ${cfg.search ? `<div class="search-box position-relative" style="min-width:220px"><i class="bi bi-search position-absolute top-50 translate-middle-y ms-2 text-secondary"></i><input type="search" class="form-control form-control-sm ps-4" id="${uid}_search" placeholder="Rechercher…" aria-label="Rechercher"></div>` : ''}
          ${cfg.toolbar || ''}
          ${readOnly ? '' : `<button class="btn btn-sm btn-primary" id="${uid}_add"><i class="bi bi-plus-lg me-1"></i>Ajouter</button>`}
        </div>
        ${cfg.intro ? `<div class="card-body border-bottom py-2 text-sm text-secondary">${cfg.intro}</div>` : ''}
        <div class="table-responsive"><table class="table table-hover">
          <thead><tr>${cfg.columns.map((c) => `<th class="${c.class || ''}">${esc(c.label)}</th>`).join('')}${readOnly && !cfg.extraActions ? '' : '<th class="text-end">Actions</th>'}</tr></thead>
          <tbody id="${uid}_tbody"></tbody>
        </table></div>
      </div>
      <div class="modal fade" id="${uid}_modal" tabindex="-1" aria-hidden="true"><div class="modal-dialog ${cfg.modalSize || ''} modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
        <form novalidate id="${uid}_form">
          <div class="modal-header"><h5 class="modal-title" id="${uid}_mtitle"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button></div>
          <div class="modal-body"><div id="${uid}_errors"></div><div class="row g-3">${cfg.fields.map((f) => fieldHtml(f, uid)).join('')}</div></div>
          <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div>
        </form>
      </div></div></div>`;

    const modalEl = mount.querySelector(`#${uid}_modal`);
    document.body.appendChild(modalEl); // évite les problèmes de z-index dans les onglets
    const modal = new bootstrap.Modal(modalEl);
    const form = modalEl.querySelector('form');
    let editing = null;

    const table = new C360.DataTable({
      tbody: `#${uid}_tbody`,
      data,
      search: cfg.search ? `#${uid}_search` : null,
      searchFields: cfg.search || [],
      filters: cfg.filters || [],
      sort: cfg.sort,
      pageSize: cfg.pageSize || 10,
      colspan: cfg.columns.length + 1,
      countEl: `#${uid}_count`,
      render: (row) => `<tr>${cfg.columns.map((c) => `<td class="${c.class || ''}">${c.render ? c.render(row) : esc(row[c.field] ?? '—')}</td>`).join('')}
        ${readOnly && !cfg.extraActions ? '' : `<td class="text-end text-nowrap">${cfg.extraActions ? cfg.extraActions(row) : ''}${readOnly ? '' : `<button class="btn btn-sm btn-light" data-edit="${row.id}" title="Modifier" aria-label="Modifier"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-light text-danger" data-del="${row.id}" title="Supprimer" aria-label="Supprimer"><i class="bi bi-trash"></i></button>`}</td>`}</tr>`,
    });

    function fillOptions() {
      cfg.fields.filter((f) => f.type === 'select').forEach((f) => {
        const opts = typeof f.options === 'function' ? f.options() : f.options;
        ui.fillSelect(form.elements[f.name], opts, { value: 'value', label: 'label', placeholder: f.required ? 'Choisir…' : '—' });
      });
    }

    function open(row, preset = null) {
      editing = row;
      form.reset(); form.classList.remove('was-validated');
      ui.showErrors(`#${uid}_errors`, []);
      fillOptions();
      modalEl.querySelector(`#${uid}_mtitle`).textContent = row ? `Modifier ${cfg.singular}` : `Ajouter ${cfg.singular}`;
      cfg.fields.forEach((f) => {
        const el = form.elements[f.name];
        const v = row ? row[f.name] : (typeof f.default === 'function' ? f.default() : f.default);
        if (f.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
      });
      if (preset) Object.entries(preset).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
      if (cfg.onOpen) cfg.onOpen(form, row);
      modal.show();
    }

    if (!readOnly) mount.querySelector(`#${uid}_add`).addEventListener('click', () => open(null));

    mount.addEventListener('click', async (ev) => {
      const e = ev.target.closest('[data-edit]');
      if (e) { open(db.get(cfg.collection, e.dataset.edit)); return; }
      const d = ev.target.closest('[data-del]');
      if (d) {
        const row = db.get(cfg.collection, d.dataset.del);
        const blocked = cfg.canDelete ? cfg.canDelete(row) : null;
        if (blocked) { ui.toast(blocked, 'warning'); return; }
        if (await ui.confirm(`Cette action est définitive.`, { title: `Supprimer ${cfg.singular} ?`, okLabel: 'Supprimer', okClass: 'btn-danger' })) {
          db.remove(cfg.collection, row.id);
          ui.toast(`${cfg.singular.charAt(0).toUpperCase()}${cfg.singular.slice(1)} supprimé(e).`);
          table.refresh();
          if (cfg.onChange) cfg.onChange();
        }
      }
    });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const raw = ui.formData(form);
      const out = {};
      cfg.fields.forEach((f) => {
        let v = raw[f.name];
        if (f.type === 'number' || f.numeric) v = v === '' ? null : Number(v);
        if (f.type === 'checkbox') v = !!v;
        out[f.name] = v;
      });
      const errors = cfg.validate ? cfg.validate(out, editing) : [];
      ui.showErrors(`#${uid}_errors`, errors);
      if (!ui.validate(form) || errors.length) return;
      const payload = cfg.beforeSave ? cfg.beforeSave(out, editing) : out;
      if (editing) db.update(cfg.collection, editing.id, payload); else db.insert(cfg.collection, payload);
      modal.hide();
      ui.toast(editing ? 'Modifications enregistrées.' : `${cfg.singular.charAt(0).toUpperCase()}${cfg.singular.slice(1)} ajouté(e).`);
      table.refresh();
      if (cfg.onChange) cfg.onChange();
    });

    return { table, open, refresh: () => table.refresh() };
  };

  /** Raccourcis pour les listes d'options. */
  C360.options = {
    from(collection, label = 'nom', filter = null) {
      return () => (filter ? C360.db.where(collection, filter) : C360.db.all(collection)).map((x) => ({ value: x.id, label: typeof label === 'function' ? label(x) : x[label] }));
    },
    list(values) { return values.map((v) => ({ value: v, label: v })); },
  };
})();
