/* ==========================================================================
   Campus360 — Noyau front-end
   - Construction de la mise en page (sidebar + topbar) selon le rôle
   - Utilitaires UI : échappement HTML, toasts, confirmation, tableaux,
     pagination, export CSV/Excel, validation de formulaires
   --------------------------------------------------------------------------
   Avec Django : la sidebar/topbar deviendront templates/partials/*.html inclus
   dans base.html, et le rôle viendra de request.user (groupes/permissions).
   ========================================================================== */
(function () {
  'use strict';
  const C360 = (window.C360 = window.C360 || {});
  const ROOT = document.body.dataset.root || '../../';
  C360.ROOT = ROOT;

  /* ------------------------------------------------------------ Sécurité --- */
  /** Échappe toute donnée dynamique avant de l'injecter dans le HTML (anti-XSS). */
  const esc = (C360.esc = function (value) {
    return String(value ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
  });

  /* --------------------------------------------------------------- Rôles --- */
  C360.ROLES = {
    admin: { label: 'Administrateur', nom: 'Awa Traoré', home: 'templates/dashboard/index.html' },
    scolarite: { label: 'Responsable scolarité', nom: 'Moussa Diallo', home: 'templates/dashboard/index.html' },
    comptable: { label: 'Comptable', nom: 'Fatou Koné', home: 'templates/dashboard/index.html' },
    enseignant: { label: 'Enseignant', nom: 'Dr. Ibrahim Sanogo', home: 'templates/espace/enseignant.html', enseignant_id: 1 },
    etudiant: { label: 'Étudiant', nom: 'Aminata Coulibaly', home: 'templates/espace/etudiant.html', etudiant_id: 1 },
  };

  C360.session = {
    role() { try { return localStorage.getItem('c360_role') || 'admin'; } catch (e) { return 'admin'; } },
    setRole(role) { try { localStorage.setItem('c360_role', role); } catch (e) { /* ignore */ } },
    user() {
      const role = this.role();
      const r = C360.ROLES[role] || C360.ROLES.admin;
      let nom = r.nom;
      if (role === 'etudiant' && C360.db) nom = C360.labels.etudiant(r.etudiant_id);
      return Object.assign({ role }, r, { nom });
    },
    logout() { try { localStorage.removeItem('c360_role'); } catch (e) { /* ignore */ } window.location.href = `${ROOT}templates/auth/login.html`; },
  };

  /* ---------------------------------------------------------------- Menu --- */
  const ALL = ['admin', 'scolarite', 'comptable', 'enseignant', 'etudiant'];
  const MENU = [
    { section: 'Principal' },
    { id: 'dashboard', label: 'Tableau de bord', icon: 'grid-1x2', href: 'templates/dashboard/index.html', roles: ['admin', 'scolarite', 'comptable'] },
    { id: 'espace-enseignant', label: 'Mon espace', icon: 'person-workspace', href: 'templates/espace/enseignant.html', roles: ['enseignant'] },
    { id: 'espace-etudiant', label: 'Mon dossier', icon: 'person-vcard', href: 'templates/espace/etudiant.html', roles: ['etudiant'] },
    { section: 'Scolarité' },
    { id: 'etudiants', label: 'Étudiants', icon: 'people', href: 'templates/etudiants/liste.html', roles: ['admin', 'scolarite', 'comptable'] },
    { id: 'inscriptions', label: 'Inscriptions', icon: 'person-plus', href: 'templates/inscriptions/liste.html', roles: ['admin', 'scolarite'], badge: 'pendingInscriptions' },
    { id: 'academique', label: 'Structure académique', icon: 'diagram-3', href: 'templates/academique/structure.html', roles: ['admin', 'scolarite'] },
    { id: 'cours', label: 'UE & matières', icon: 'journal-bookmark', href: 'templates/academique/cours.html', roles: ['admin', 'scolarite'] },
    { id: 'enseignants', label: 'Enseignants', icon: 'person-badge', href: 'templates/enseignants/liste.html', roles: ['admin', 'scolarite'] },
    { section: 'Finances' },
    { id: 'frais', label: 'Frais de scolarité', icon: 'tags', href: 'templates/finances/frais.html', roles: ['admin', 'comptable'] },
    { id: 'paiements', label: 'Paiements', icon: 'cash-coin', href: 'templates/finances/paiements.html', roles: ['admin', 'comptable'] },
    { id: 'impayes', label: 'Impayés', icon: 'exclamation-octagon', href: 'templates/finances/impayes.html', roles: ['admin', 'comptable'] },
    { section: 'Pédagogie' },
    { id: 'emploi-du-temps', label: 'Emplois du temps', icon: 'calendar-week', href: 'templates/planning/emploi-du-temps.html', roles: ALL },
    { id: 'salles', label: 'Salles', icon: 'door-open', href: 'templates/planning/salles.html', roles: ['admin', 'scolarite'] },
    { id: 'evaluations', label: 'Évaluations', icon: 'clipboard-check', href: 'templates/notes/evaluations.html', roles: ['admin', 'scolarite', 'enseignant'] },
    { id: 'saisie-notes', label: 'Saisie des notes', icon: 'pencil-square', href: 'templates/notes/saisie.html', roles: ['admin', 'scolarite', 'enseignant'] },
    { id: 'resultats', label: 'Résultats', icon: 'award', href: 'templates/notes/resultats.html', roles: ['admin', 'scolarite', 'enseignant'] },
    { id: 'appel', label: 'Faire l\'appel', icon: 'check2-square', href: 'templates/presences/appel.html', roles: ['admin', 'scolarite', 'enseignant'] },
    { id: 'presences', label: 'Suivi des présences', icon: 'clock-history', href: 'templates/presences/suivi.html', roles: ['admin', 'scolarite', 'enseignant'] },
    { section: 'Documents & rapports' },
    { id: 'documents', label: 'Documents', icon: 'file-earmark-text', href: 'templates/documents/index.html', roles: ['admin', 'scolarite', 'comptable', 'etudiant'] },
    { id: 'rapports', label: 'Rapports & statistiques', icon: 'bar-chart-line', href: 'templates/rapports/index.html', roles: ['admin', 'scolarite', 'comptable'] },
    { section: 'Administration' },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: 'person-gear', href: 'templates/comptes/utilisateurs.html', roles: ['admin'] },
    { id: 'roles', label: 'Rôles & permissions', icon: 'shield-lock', href: 'templates/comptes/roles.html', roles: ['admin'] },
    { id: 'connexions', label: 'Journal des connexions', icon: 'list-check', href: 'templates/comptes/connexions.html', roles: ['admin'] },
  ];
  C360.MENU = MENU;

  function badgeValue(key) {
    if (key === 'pendingInscriptions' && C360.db) {
      const n = C360.db.where('inscriptions', (i) => i.statut === 'En attente' && i.annee_id === C360.db.settings().annee_courante_id).length;
      return n ? `<span class="badge rounded-pill bg-warning text-dark">${n}</span>` : '';
    }
    return '';
  }

  function renderSidebar(el) {
    const role = C360.session.role();
    const active = document.body.dataset.page;
    let html = '';
    let pending = null;
    MENU.forEach((item) => {
      if (item.section) { pending = item.section; return; }
      if (!item.roles.includes(role)) return;
      if (pending) { html += `<li class="sidebar-section">${esc(pending)}</li>`; pending = null; }
      html += `<li><a class="sidebar-link${item.id === active ? ' active' : ''}" href="${ROOT}${item.href}"${item.id === active ? ' aria-current="page"' : ''}>
        <i class="bi bi-${item.icon}" aria-hidden="true"></i><span>${esc(item.label)}</span>${item.badge ? badgeValue(item.badge) : ''}</a></li>`;
    });
    el.innerHTML = `
      <a class="sidebar-brand" href="${ROOT}${C360.session.user().home}">
        <span class="brand-logo"><i class="bi bi-mortarboard-fill"></i></span><span>Campus<span style="color:#5eead4">360</span></span>
      </a>
      <ul class="sidebar-nav">${html}</ul>
      <div class="sidebar-footer">
        <div class="text-white-50">Année académique</div>
        <div class="text-white fw-semibold">${esc(C360.db ? C360.labels.annee(C360.db.settings().annee_courante_id) : '')}</div>
      </div>`;
  }

  function renderTopbar(el) {
    const user = C360.session.user();
    const title = document.body.dataset.title || document.title.split('·')[0].trim();
    const roleOptions = Object.entries(C360.ROLES).map(([k, r]) =>
      `<li><button class="dropdown-item d-flex justify-content-between align-items-center" data-switch-role="${k}">${esc(r.label)}${k === user.role ? '<i class="bi bi-check2 text-primary"></i>' : ''}</button></li>`).join('');
    el.innerHTML = `
      <button class="btn btn-icon btn-light d-lg-none" id="sidebarToggle" aria-label="Ouvrir le menu"><i class="bi bi-list fs-5"></i></button>
      <h1 class="topbar-title text-truncate">${esc(title)}</h1>
      <div class="topbar-actions">
        <button class="btn btn-icon btn-light" id="themeToggle" title="Basculer le thème" aria-label="Basculer le thème clair/sombre"><i class="bi bi-moon-stars"></i></button>
        <div class="dropdown">
          <button class="btn btn-icon btn-light" data-bs-toggle="dropdown" aria-label="Notifications"><i class="bi bi-bell"></i><span class="dot"></span></button>
          <div class="dropdown-menu dropdown-menu-end shadow p-0" style="width:320px">
            <div class="p-3 border-bottom fw-semibold">Notifications</div>
            <a class="dropdown-item py-2 text-wrap" href="${ROOT}templates/inscriptions/liste.html?statut=En%20attente"><i class="bi bi-person-plus text-warning me-2"></i>Des inscriptions attendent une validation</a>
            <a class="dropdown-item py-2 text-wrap" href="${ROOT}templates/finances/impayes.html"><i class="bi bi-cash-coin text-danger me-2"></i>Relances d'impayés à envoyer</a>
            <a class="dropdown-item py-2 text-wrap" href="${ROOT}templates/presences/suivi.html"><i class="bi bi-exclamation-triangle text-danger me-2"></i>Étudiants au-delà du seuil d'absences</a>
          </div>
        </div>
        <div class="dropdown">
          <button class="btn btn-light d-flex align-items-center gap-2 ps-1 pe-2 py-1" data-bs-toggle="dropdown" aria-label="Menu utilisateur">
            ${C360.ui.avatar(user.nom, 'sm')}
            <span class="d-none d-md-block text-start lh-sm"><span class="d-block fw-semibold text-sm">${esc(user.nom)}</span><span class="d-block text-xs text-secondary">${esc(user.label)}</span></span>
            <i class="bi bi-chevron-down text-xs"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow">
            <li><a class="dropdown-item" href="${ROOT}templates/comptes/profil.html"><i class="bi bi-person me-2"></i>Mon profil</a></li>
            <li><a class="dropdown-item" href="${ROOT}templates/comptes/profil.html#securite"><i class="bi bi-key me-2"></i>Changer le mot de passe</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><h6 class="dropdown-header">Simuler un rôle (démo)</h6></li>
            ${roleOptions}
            <li><button class="dropdown-item text-secondary" data-reset-demo><i class="bi bi-arrow-counterclockwise me-2"></i>Réinitialiser les données</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" data-logout><i class="bi bi-box-arrow-right me-2"></i>Déconnexion</button></li>
          </ul>
        </div>
      </div>`;

    el.querySelectorAll('[data-switch-role]').forEach((b) => b.addEventListener('click', () => {
      C360.session.setRole(b.dataset.switchRole);
      window.location.href = ROOT + C360.ROLES[b.dataset.switchRole].home;
    }));
    el.querySelector('[data-logout]').addEventListener('click', () => C360.session.logout());
    el.querySelector('[data-reset-demo]').addEventListener('click', async () => {
      if (await C360.ui.confirm('Toutes les modifications locales seront perdues.', { title: 'Réinitialiser les données de démo ?', okLabel: 'Réinitialiser', okClass: 'btn-danger' })) {
        C360.db.reset(); window.location.reload();
      }
    });
    el.querySelector('#sidebarToggle').addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    el.querySelector('#themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', next);
      try { localStorage.setItem('c360_theme', next); } catch (e) { /* ignore */ }
    });
  }

  /* ------------------------------------------------------------ Thème --- */
  (function applyTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem('c360_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('data-bs-theme', theme);
  })();

  /* --------------------------------------------------------------- UI --- */
  const PALETTE = ['#3651d4', '#0fa39a', '#e8590c', '#7c3aed', '#d6336c', '#1c7ed6', '#2b8a3e', '#f08c00'];
  const STATUS = {
    'Actif': 'success', 'Validée': 'success', 'Validé': 'success', 'Soldé': 'success', 'Présent': 'success', 'Vérifié': 'success', 'Disponible': 'success', 'En cours': 'primary', 'Publié': 'success', 'Notes saisies': 'success',
    'En attente': 'warning', 'Partiel': 'warning', 'Retard': 'warning', 'En cours de saisie': 'warning', 'En maintenance': 'warning', 'À venir': 'info', 'Planifiée': 'info',
    'Rejetée': 'danger', 'Impayé': 'danger', 'Absent': 'danger', 'Annulé': 'danger', 'Inactif': 'secondary', 'Archivé': 'secondary', 'Clôturée': 'secondary', 'Non publié': 'secondary', 'Ajourné': 'danger',
  };

  C360.ui = {
    avatar(name, size, photo) {
      const initials = String(name || '?').replace(/^(Dr\.|Pr\.|M\.|Mme|Me)\s+/, '').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
      const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : 'avatar';
      if (photo) return `<img src="${esc(photo)}" alt="" class="${cls}">`;
      const color = PALETTE[[...String(name)].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];
      return `<span class="${cls}" style="background:${color}" aria-hidden="true">${esc(initials)}</span>`;
    },

    badge(statut) {
      const s = STATUS[statut] || 'secondary';
      return `<span class="badge badge-status text-bg-${s}${s === 'warning' ? ' text-dark' : ''}">${esc(statut)}</span>`;
    },

    progress(value, cls) {
      const v = Math.max(0, Math.min(100, Number(value) || 0));
      const color = cls || (v >= 100 ? 'success' : v >= 50 ? 'primary' : v > 0 ? 'warning' : 'danger');
      return `<div class="d-flex align-items-center gap-2"><div class="progress progress-thin flex-grow-1" style="min-width:60px" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-${color}" style="width:${v}%"></div></div><span class="text-xs text-secondary">${v}%</span></div>`;
    },

    toast(message, type = 'success') {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = 1090;
        document.body.appendChild(container);
      }
      const icons = { success: 'check-circle-fill', danger: 'x-octagon-fill', warning: 'exclamation-triangle-fill', info: 'info-circle-fill' };
      const el = document.createElement('div');
      el.className = `toast align-items-center text-bg-${type} border-0`;
      el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
      el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi bi-${icons[type] || icons.info} me-2"></i>${esc(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button></div>`;
      container.appendChild(el);
      const t = new bootstrap.Toast(el, { delay: 4000 });
      el.addEventListener('hidden.bs.toast', () => el.remove());
      t.show();
    },

    /** Boîte de confirmation (Promise<boolean>). */
    confirm(message, { title = 'Confirmation', okLabel = 'Confirmer', okClass = 'btn-primary', input = null } = {}) {
      return new Promise((resolve) => {
        const wrap = document.createElement('div');
        wrap.innerHTML = `<div class="modal fade" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">${esc(title)}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button></div>
          <div class="modal-body"><p class="mb-0">${esc(message)}</p>${input ? `<label class="form-label mt-3">${esc(input)}</label><textarea class="form-control" rows="3" required></textarea><div class="invalid-feedback">Ce champ est obligatoire.</div>` : ''}</div>
          <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Annuler</button><button type="button" class="btn ${okClass}" data-ok>${esc(okLabel)}</button></div>
        </div></div></div>`;
        const modalEl = wrap.firstElementChild;
        document.body.appendChild(modalEl);
        const modal = new bootstrap.Modal(modalEl);
        let result = false;
        modalEl.querySelector('[data-ok]').addEventListener('click', () => {
          const ta = modalEl.querySelector('textarea');
          if (ta && !ta.value.trim()) { ta.classList.add('is-invalid'); return; }
          result = ta ? ta.value.trim() : true;
          modal.hide();
        });
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); resolve(result); });
        modal.show();
      });
    },

    /** Remplit un <select> à partir d'une liste. */
    fillSelect(select, items, { value = 'id', label = 'nom', placeholder = null, selected = null } = {}) {
      const el = typeof select === 'string' ? document.querySelector(select) : select;
      if (!el) return;
      const opts = items.map((it) => {
        const v = typeof value === 'function' ? value(it) : it[value];
        const l = typeof label === 'function' ? label(it) : it[label];
        return `<option value="${esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${esc(l)}</option>`;
      }).join('');
      el.innerHTML = (placeholder !== null ? `<option value="">${esc(placeholder)}</option>` : '') + opts;
    },

    /** Validation Bootstrap + retour booléen. */
    validate(form) {
      form.classList.add('was-validated');
      return form.checkValidity();
    },

    formData(form) {
      const out = {};
      new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
      form.querySelectorAll('input[type=checkbox][name]').forEach((cb) => { out[cb.name] = cb.checked; });
      return out;
    },

    showErrors(container, errors) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      el.innerHTML = errors.length ? `<div class="alert alert-danger d-flex gap-2 mb-3" role="alert"><i class="bi bi-exclamation-octagon-fill"></i><div>${errors.map((e) => `<div>${esc(e)}</div>`).join('')}</div></div>` : '';
    },

    empty(colspan, text = 'Aucun résultat') {
      return `<tr><td colspan="${colspan}"><div class="empty-state"><i class="bi bi-inbox"></i>${esc(text)}</div></td></tr>`;
    },
  };

  /* ------------------------------------------------------- DataTable --- */
  /**
   * Tableau avec recherche, filtres et pagination côté client.
   * Avec Django : remplacer par la pagination serveur (Paginator) + paramètres GET.
   */
  class DataTable {
    constructor({ tbody, data, render, pageSize = 10, search = null, searchFields = [], filters = [], emptyText = 'Aucun résultat', colspan = 8, countEl = null, sort = null }) {
      this.tbody = typeof tbody === 'string' ? document.querySelector(tbody) : tbody;
      this.source = data;
      this.render = render;
      this.pageSize = pageSize;
      this.searchInput = search ? document.querySelector(search) : null;
      this.searchFields = searchFields;
      this.filters = filters; // [{ el: '#selector', field: 'filiere_id' | fn(row, value) }]
      this.emptyText = emptyText;
      this.colspan = colspan;
      this.countEl = countEl ? document.querySelector(countEl) : null;
      this.sort = sort;
      this.page = 1;
      const tableWrap = this.tbody.closest('.table-responsive') || this.tbody.closest('table');
      this.footer = document.createElement('div');
      this.footer.className = 'dt-footer';
      tableWrap.after(this.footer);
      if (this.searchInput) this.searchInput.addEventListener('input', () => { this.page = 1; this.refresh(); });
      this.filters.forEach((f) => {
        const el = document.querySelector(f.el);
        if (el) el.addEventListener('change', () => { this.page = 1; this.refresh(); });
      });
      this.refresh();
    }

    get data() { return typeof this.source === 'function' ? this.source() : this.source; }

    filtered() {
      const q = this.searchInput ? this.searchInput.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
      let rows = this.data.filter((row) => {
        if (q) {
          const hay = this.searchFields.map((f) => (typeof f === 'function' ? f(row) : row[f])).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          if (!hay.includes(q)) return false;
        }
        return this.filters.every((f) => {
          const el = document.querySelector(f.el);
          const v = el ? el.value : '';
          if (v === '' || v === null) return true;
          return typeof f.field === 'function' ? f.field(row, v) : String(row[f.field]) === String(v);
        });
      });
      if (this.sort) rows = rows.slice().sort(this.sort);
      return rows;
    }

    refresh() {
      const rows = this.filtered();
      this.lastRows = rows;
      const pages = Math.max(1, Math.ceil(rows.length / this.pageSize));
      this.page = Math.min(this.page, pages);
      const start = (this.page - 1) * this.pageSize;
      const slice = rows.slice(start, start + this.pageSize);
      this.tbody.innerHTML = slice.length ? slice.map(this.render).join('') : C360.ui.empty(this.colspan, this.emptyText);
      if (this.countEl) this.countEl.textContent = rows.length;
      const btn = (p, label, disabled, active) => `<li class="page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}"><button class="page-link" data-page="${p}"${disabled ? ' tabindex="-1"' : ''}>${label}</button></li>`;
      let pager = btn(this.page - 1, '<i class="bi bi-chevron-left"></i>', this.page === 1);
      for (let p = 1; p <= pages; p++) {
        if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - this.page) > 1) { if (!pager.endsWith('…</span></li>')) pager += '<li class="page-item disabled"><span class="page-link">…</span></li>'; continue; }
        pager += btn(p, p, false, p === this.page);
      }
      pager += btn(this.page + 1, '<i class="bi bi-chevron-right"></i>', this.page === pages);
      this.footer.innerHTML = `<span class="text-secondary">${rows.length ? `${start + 1}–${Math.min(start + this.pageSize, rows.length)} sur ${rows.length}` : '0 résultat'}</span><ul class="pagination pagination-sm">${pager}</ul>`;
      this.footer.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => { this.page = Number(b.dataset.page); this.refresh(); }));
    }
  }
  C360.DataTable = DataTable;

  /* ---------------------------------------------------------- Exports --- */
  C360.exporter = {
    /** Export CSV lisible par Excel (séparateur « ; » + BOM UTF-8). */
    csv(filename, headers, rows) {
      const cell = (v) => {
        let s = String(v ?? '');
        if (/^[=+\-@]/.test(s)) s = `'${s}`; // protection contre l'injection de formules
        return `"${s.replace(/"/g, '""')}"`;
      };
      const content = [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
      const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    /** PDF : impression du navigateur (le back-end pourra générer de vrais PDF via WeasyPrint/xhtml2pdf). */
    pdf() { window.print(); },
  };

  /* -------------------------------------------------------- Helpers --- */
  C360.param = (name) => new URLSearchParams(window.location.search).get(name);
  C360.url = (path) => ROOT + path;

  /* ----------------------------------------------------- Initialisation --- */
  function guard() {
    const allowed = (document.body.dataset.roles || '').split(',').map((s) => s.trim()).filter(Boolean);
    const role = C360.session.role();
    if (allowed.length && !allowed.includes(role)) {
      const main = document.querySelector('.app-content');
      if (main) {
        main.innerHTML = `<div class="card mx-auto mt-5" style="max-width:520px"><div class="card-body text-center p-5">
          <div class="stat-icon soft-danger mx-auto mb-3"><i class="bi bi-shield-lock"></i></div>
          <h2 class="h5">Accès refusé</h2><p class="text-secondary">Votre rôle (<strong>${esc(C360.ROLES[role].label)}</strong>) ne dispose pas des permissions nécessaires pour cette page.</p>
          <a class="btn btn-primary" href="${ROOT}${C360.ROLES[role].home}">Retour à mon espace</a></div></div>`;
      }
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('c360-sidebar');
    const topbar = document.getElementById('c360-topbar');
    if (sidebar) renderSidebar(sidebar);
    if (topbar) renderTopbar(topbar);
    if (sidebar) {
      const backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
      document.body.appendChild(backdrop);
    }
    const footer = document.querySelector('.app-footer');
    if (footer) footer.innerHTML = `© ${new Date().getFullYear()} Campus360 — Plateforme de gestion universitaire`;
    C360.allowed = guard();
    if (C360.allowed && typeof C360.onReady === 'function') C360.onReady();
  });

  /** Chaque page enregistre son initialisation via C360.page(fn). */
  C360.page = function (fn) { C360.onReady = fn; };
})();
