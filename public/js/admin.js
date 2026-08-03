/* ============================================================
   LOTTUS · Panel administrativo
   Vanilla JS — sin dependencias externas.
   ============================================================ */
'use strict';

(function () {
  // ---------- Estado global ----------
  const state = {
    products: [],
    categories: [],
    search: '',
    categoryFilter: '',
    section: 'products',
    editing: null, // producto en edición o null si es nuevo
    drawerImages: [], // URLs de imágenes del producto en el drawer
    drawerVariants: [], // Variantes del producto en el drawer
    settingsLoaded: false,
  };

  const MAX_FEATURES = 12;

  const COP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  // ---------- Utilidades ----------
  const $ = (sel) => document.querySelector(sel);

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  }

  // ---------- Capa de red ----------
  async function api(path, options) {
    const opts = Object.assign({ credentials: 'same-origin' }, options || {});
    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      if (typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, opts);
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      /* respuesta sin cuerpo JSON */
    }
    if (res.status === 401 && !path.endsWith('/login') && !path.endsWith('/me')) {
      showLogin();
      throw new Error(data.error || 'Sesión expirada');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Error inesperado (' + res.status + ')');
    }
    return data;
  }

  // ---------- Toasts ----------
  const TOAST_ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14l-3-3"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  function toast(msg, type) {
    const kind = TOAST_ICONS[type] ? type : 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = TOAST_ICONS[kind] + '<span></span>';
    el.querySelector('span').textContent = msg;
    $('#toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    }, 3500);
  }

  // ---------- Vistas: login / panel ----------
  function showLogin() {
    $('#panelView').hidden = true;
    $('#loginView').hidden = false;
    closeDrawer(true);
    closeSidebar();
    const userInput = $('#loginUser');
    if (userInput) userInput.focus();
  }

  function showPanel() {
    $('#loginView').hidden = true;
    $('#panelView').hidden = false;
    switchSection('products');
  }

  async function boot() {
    try {
      await api('/api/admin/me');
      showPanel();
    } catch (_) {
      showLogin();
    }
  }

  // ---------- Login / logout ----------
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#loginError');
    errBox.hidden = true;
    const btn = $('#loginBtn');
    btn.disabled = true;
    btn.textContent = 'Ingresando…';
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: {
          username: $('#loginUser').value.trim(),
          password: $('#loginPass').value,
        },
      });
      $('#loginPass').value = '';
      toast('Bienvenido al panel', 'success');
      showPanel();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch (_) {
      /* aunque falle la red, volvemos al login */
    }
    toast('Sesión cerrada', 'info');
    showLogin();
  });

  // ---------- Navegación ----------
  const SECTION_TITLES = {
    products: 'Productos',
    settings: 'Ajustes del sitio',
    password: 'Contraseña',
  };

  function switchSection(name) {
    state.section = name;
    document.querySelectorAll('.nav-item[data-section]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === name);
    });
    ['products', 'settings', 'password'].forEach((s) => {
      $('#section-' + s).hidden = s !== name;
    });
    $('#topbarTitle').textContent = SECTION_TITLES[name] || '';
    $('#topbarSearchWrap').hidden = name !== 'products';
    closeSidebar();
    if (name === 'products') loadProducts();
    if (name === 'settings') loadSettings();
  }

  document.querySelectorAll('.nav-item[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Sidebar móvil
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').hidden = true;
    $('#hamburger').setAttribute('aria-expanded', 'false');
  }

  $('#hamburger').addEventListener('click', () => {
    const open = $('#sidebar').classList.toggle('open');
    $('#sidebarOverlay').hidden = !open;
    $('#hamburger').setAttribute('aria-expanded', String(open));
  });
  $('#sidebarOverlay').addEventListener('click', closeSidebar);

  // ---------- Productos: carga y render ----------
  let productsLoading = false;

  async function loadProducts() {
    if (productsLoading) return;
    productsLoading = true;
    $('#productsLoading').hidden = false;
    $('#productsTable').hidden = true;
    $('#productsCards').innerHTML = '';
    $('#productsEmpty').hidden = true;
    try {
      const data = await api('/api/admin/products');
      state.products = data.products || [];
      state.categories = data.categories || [];
      renderCategoryOptions();
      renderProducts();
    } catch (err) {
      if (!err.message.includes('Sesión')) toast(err.message, 'error');
    } finally {
      productsLoading = false;
      $('#productsLoading').hidden = true;
    }
  }

  function renderCategoryOptions() {
    const filterSel = $('#categoryFilter');
    const formSel = $('#pfCategory');
    const currentFilter = filterSel.value;
    const currentForm = formSel.value;

    filterSel.innerHTML = '<option value="">Todas las categorías</option>';
    formSel.innerHTML = '<option value="">Selecciona…</option>';
    state.categories.forEach((c) => {
      const o1 = document.createElement('option');
      o1.value = c.slug;
      o1.textContent = c.name;
      filterSel.appendChild(o1);
      const o2 = document.createElement('option');
      o2.value = c.slug;
      o2.textContent = c.name;
      formSel.appendChild(o2);
    });
    filterSel.value = currentFilter;
    formSel.value = currentForm;
  }

  function categoryName(slug) {
    const c = state.categories.find((x) => x.slug === slug);
    return c ? c.name : slug;
  }

  function filteredProducts() {
    const q = state.search.trim().toLowerCase();
    return state.products.filter((p) => {
      if (state.categoryFilter && p.category !== state.categoryFilter) return false;
      if (q && !String(p.name).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function thumbHtml(p) {
    const src = p.images && p.images[0];
    if (src) {
      return (
        '<img class="prod-thumb" src="' +
        escapeHtml(src) +
        '" alt="" loading="lazy" data-initials="' +
        escapeHtml(initials(p.name)) +
        '">'
      );
    }
    return '<div class="prod-thumb-ph" aria-hidden="true">' + escapeHtml(initials(p.name)) + '</div>';
  }

  // Si la imagen falla, se reemplaza por el placeholder con iniciales
  function wireThumbFallbacks(root) {
    root.querySelectorAll('img.prod-thumb').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          const ph = document.createElement('div');
          ph.className = 'prod-thumb-ph';
          ph.setAttribute('aria-hidden', 'true');
          ph.textContent = img.dataset.initials || '?';
          img.replaceWith(ph);
        },
        { once: true }
      );
    });
  }

  function priceHtml(p) {
    if (p.priceRange && (p.priceRange.min || p.priceRange.label)) {
      const label = p.priceRange.label || '';
      const min = p.priceRange.min ? COP.format(p.priceRange.min) : '';
      const max = p.priceRange.max && p.priceRange.max !== p.priceRange.min ? COP.format(p.priceRange.max) : '';
      let rangeText = label || (min ? 'Desde ' + min : '');
      if (!label && max) rangeText += ' \u2013 ' + max;
      return '<span class="price-now price-range">' + escapeHtml(rangeText) + '</span>';
    }
    let html = '<span class="price-now">' + escapeHtml(COP.format(p.price || 0)) + '</span>';
    if (p.oldPrice) {
      html += '<span class="price-old">' + escapeHtml(COP.format(p.oldPrice)) + '</span>';
    }
    return html;
  }

  function renderProducts() {
    const list = filteredProducts();
    const tbody = $('#productsTbody');
    const cards = $('#productsCards');
    const empty = $('#productsEmpty');
    const table = $('#productsTable');

    tbody.innerHTML = '';
    cards.innerHTML = '';

    if (!list.length) {
      table.hidden = true;
      empty.hidden = false;
      $('#productsEmptyText').textContent = state.products.length
        ? 'Ningún producto coincide con la búsqueda o el filtro.'
        : 'Crea tu primer producto con el botón «Nuevo producto».';
      return;
    }

    empty.hidden = true;
    table.hidden = false;

    list.forEach((p) => {
      // Fila de tabla (desktop)
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td><div class="prod-cell">' +
        thumbHtml(p) +
        '<div><div class="prod-name"></div><div class="prod-slug"></div></div></div></td>' +
        '<td><span class="chip"></span></td>' +
        '<td class="price-cell">' +
        priceHtml(p) +
        '</td>' +
        '<td><label class="switch"><input type="checkbox" data-toggle="featured"><span class="switch-track"></span></label></td>' +
        '<td><label class="switch"><input type="checkbox" data-toggle="active"><span class="switch-track"></span></label></td>' +
        '<td><div class="row-actions">' +
        '<button class="icon-btn" data-action="edit" aria-label="Editar" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>' +
        '<button class="icon-btn danger" data-action="delete" aria-label="Eliminar" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg></button>' +
        '</div></td>';
      tr.querySelector('.prod-name').textContent = p.name;
      tr.querySelector('.prod-slug').textContent = p.slug;
      tr.querySelector('.chip').textContent = categoryName(p.category);
      wireRowControls(tr, p);
      tbody.appendChild(tr);

      // Tarjeta (móvil)
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML =
        '<div class="product-card-top">' +
        thumbHtml(p) +
        '<div><div class="prod-name"></div><div class="prod-slug"></div></div></div>' +
        '<div class="product-card-meta"><span class="chip"></span><span class="price-cell">' +
        priceHtml(p) +
        '</span></div>' +
        '<div class="product-card-meta">' +
        '<div class="product-card-toggles">' +
        '<span class="toggle-label"><label class="switch"><input type="checkbox" data-toggle="featured"><span class="switch-track"></span></label>Destacado</span>' +
        '<span class="toggle-label"><label class="switch"><input type="checkbox" data-toggle="active"><span class="switch-track"></span></label>Activo</span>' +
        '</div>' +
        '<div class="product-card-actions">' +
        '<button class="icon-btn" data-action="edit" aria-label="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>' +
        '<button class="icon-btn danger" data-action="delete" aria-label="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg></button>' +
        '</div></div>';
      card.querySelector('.prod-name').textContent = p.name;
      card.querySelector('.prod-slug').textContent = p.slug;
      card.querySelector('.chip').textContent = categoryName(p.category);
      wireRowControls(card, p);
      cards.appendChild(card);
    });
  }

  function wireRowControls(root, p) {
    wireThumbFallbacks(root);
    const featuredInput = root.querySelector('input[data-toggle="featured"]');
    const activeInput = root.querySelector('input[data-toggle="active"]');
    featuredInput.checked = !!p.featured;
    activeInput.checked = p.active !== false;

    featuredInput.addEventListener('change', () => toggleField(p, 'featured', featuredInput));
    activeInput.addEventListener('change', () => toggleField(p, 'active', activeInput));

    root.querySelector('button[data-action="edit"]').addEventListener('click', () => openDrawer(p));
    root.querySelector('button[data-action="delete"]').addEventListener('click', () => openConfirm(p));
  }

  async function toggleField(p, field, input) {
    const desired = input.checked;
    input.disabled = true;
    try {
      const body = Object.assign({}, p, { [field]: desired });
      const data = await api('/api/admin/products/' + encodeURIComponent(p.id), {
        method: 'PUT',
        body,
      });
      Object.assign(p, data.product);
      input.checked = !!p[field];
      toast(
        field === 'featured'
          ? p.featured
            ? 'Marcado como destacado'
            : 'Ya no es destacado'
          : p.active
            ? 'Producto activado'
            : 'Producto desactivado',
        'success'
      );
      // Sincroniza el toggle gemelo (tabla/tarjeta) re-renderizando
      renderProducts();
    } catch (err) {
      input.checked = !desired; // revert
      toast(err.message, 'error');
    } finally {
      input.disabled = false;
    }
  }

  // Filtros
  function setSearch(value) {
    state.search = value;
    if ($('#productSearch').value !== value) $('#productSearch').value = value;
    if ($('#topbarSearch').value !== value) $('#topbarSearch').value = value;
    renderProducts();
  }
  $('#productSearch').addEventListener('input', (e) => setSearch(e.target.value));
  $('#topbarSearch').addEventListener('input', (e) => setSearch(e.target.value));
  $('#categoryFilter').addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderProducts();
  });

  // ---------- Modal de confirmación de borrado ----------
  let pendingDelete = null;

  function openConfirm(p) {
    pendingDelete = p;
    $('#confirmText').textContent =
      '¿Eliminar ' + p.name + '? Esta acción no se puede deshacer.';
    const overlay = $('#confirmOverlay');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    $('#confirmDelete').focus();
  }

  function closeConfirm() {
    const overlay = $('#confirmOverlay');
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.hidden = true;
    }, 240);
    pendingDelete = null;
  }

  $('#confirmCancel').addEventListener('click', closeConfirm);
  $('#confirmOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });

  $('#confirmDelete').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const p = pendingDelete;
    const btn = $('#confirmDelete');
    btn.disabled = true;
    btn.textContent = 'Eliminando…';
    try {
      await api('/api/admin/products/' + encodeURIComponent(p.id), { method: 'DELETE' });
      state.products = state.products.filter((x) => x.id !== p.id);
      closeConfirm();
      renderProducts();
      toast('Producto eliminado', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Eliminar';
    }
  });

  // ---------- Drawer: editor de producto ----------
  function openDrawer(product) {
    state.editing = product || null;
    $('#drawerTitle').textContent = product ? 'Editar ' + product.name : 'Nuevo producto';
    $('#drawerError').hidden = true;

    $('#pfName').value = product ? product.name : '';
    $('#pfCategory').value = product ? product.category : '';
    $('#pfPrice').value = product && product.price != null ? product.price : '';
    $('#pfOldPrice').value = product && product.oldPrice ? product.oldPrice : '';
    $('#pfBadge').value = product && product.badge ? product.badge : '';
    $('#pfDimensions').value = product ? product.dimensions || '' : '';
    $('#pfShortDescription').value = product ? product.shortDescription || '' : '';
    $('#pfDescription').value = product ? product.description || '' : '';
    $('#pfMaterials').value = product ? product.materials || '' : '';
    $('#pfFeatured').checked = product ? !!product.featured : false;
    $('#pfActive').checked = product ? product.active !== false : true;
    $('#pfPriceRangeLabel').value = product ? product.priceRangeLabel || '' : '';

    clearFieldErrors();

    // Características
    const feats = product && Array.isArray(product.features) ? product.features : [];
    $('#featuresList').innerHTML = '';
    if (feats.length) {
      feats.forEach((f) => addFeatureRow(f));
    } else {
      addFeatureRow('');
    }
    updateFeatureButtons();

    // Variantes
    state.drawerVariants = product && Array.isArray(product.variants) ? product.variants.map((v) => Object.assign({}, v)) : [];
    renderVariantsTable();

    // Imágenes
    state.drawerImages = product && Array.isArray(product.images) ? product.images.slice() : [];
    renderImagesGrid();

    const overlay = $('#drawerOverlay');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
    $('#pfName').focus();
  }

  function closeDrawer(instant) {
    const overlay = $('#drawerOverlay');
    if (overlay.hidden) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (instant) {
      overlay.hidden = true;
    } else {
      setTimeout(() => {
        overlay.hidden = true;
      }, 300);
    }
    state.editing = null;
  }

  $('#newProductBtn').addEventListener('click', () => openDrawer(null));
  $('#drawerClose').addEventListener('click', () => closeDrawer());
  $('#drawerCancel').addEventListener('click', () => closeDrawer());
  $('#drawerOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#confirmOverlay').hidden) closeConfirm();
      else if (!$('#drawerOverlay').hidden) closeDrawer();
      else closeSidebar();
    }
  });

  // ---------- Características dinámicas ----------
  function addFeatureRow(value) {
    const list = $('#featuresList');
    if (list.children.length >= MAX_FEATURES) return;
    const row = document.createElement('div');
    row.className = 'feature-row';
    row.innerHTML =
      '<input type="text" class="input feature-input" placeholder="Ej: Estructura en madera de roble" maxlength="140">' +
      '<button type="button" class="icon-btn danger" aria-label="Quitar característica"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    row.querySelector('input').value = value || '';
    row.querySelector('button').addEventListener('click', () => {
      row.remove();
      updateFeatureButtons();
    });
    list.appendChild(row);
    updateFeatureButtons();
  }

  function updateFeatureButtons() {
    const count = $('#featuresList').children.length;
    $('#addFeatureBtn').disabled = count >= MAX_FEATURES;
  }

  $('#addFeatureBtn').addEventListener('click', () => addFeatureRow(''));

  // ---------- Variantes de precio ----------
  const MAX_VARIANTS = 40;

  function renderVariantsTable() {
    const tbody = $('#variantsTbody');
    const empty = $('#variantsEmpty');
    const table = $('#variantsTable');
    tbody.innerHTML = '';
    if (!state.drawerVariants.length) {
      table.hidden = true;
      empty.hidden = false;
      return;
    }
    table.hidden = false;
    empty.hidden = true;
    state.drawerVariants.forEach((v, i) => {
      const tr = document.createElement('tr');
      tr.className = 'variant-row';
      tr.innerHTML =
        '<td><input type="text" class="input input-sm vf-group" placeholder="Tapizado" maxlength="60"></td>' +
        '<td><input type="text" class="input input-sm vf-label" placeholder="Tela lino \u00b7 2 puestos" maxlength="120" required></td>' +
        '<td><input type="number" class="input input-sm vf-price" min="0" step="1000" placeholder="0"></td>' +
        '<td><input type="text" class="input input-sm vf-notes" placeholder="Nota opcional" maxlength="100"></td>' +
        '<td><button type="button" class="icon-btn danger" aria-label="Eliminar variante"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></td>';
      tr.querySelector('.vf-group').value = v.groupLabel || '';
      tr.querySelector('.vf-label').value = v.label || '';
      tr.querySelector('.vf-price').value = v.priceAbsolute != null ? v.priceAbsolute : '';
      tr.querySelector('.vf-notes').value = v.notes || '';
      // Sync back on change
      tr.querySelector('.vf-group').addEventListener('input', (e) => { state.drawerVariants[i].groupLabel = e.target.value; });
      tr.querySelector('.vf-label').addEventListener('input', (e) => { state.drawerVariants[i].label = e.target.value; });
      tr.querySelector('.vf-price').addEventListener('input', (e) => {
        const n = Number(e.target.value);
        state.drawerVariants[i].priceAbsolute = e.target.value !== '' && Number.isFinite(n) ? n : null;
      });
      tr.querySelector('.vf-notes').addEventListener('input', (e) => { state.drawerVariants[i].notes = e.target.value; });
      tr.querySelector('button').addEventListener('click', () => {
        state.drawerVariants.splice(i, 1);
        renderVariantsTable();
      });
      tbody.appendChild(tr);
    });
    $('#addVariantBtn').disabled = state.drawerVariants.length >= MAX_VARIANTS;
  }

  function addVariantRow() {
    if (state.drawerVariants.length >= MAX_VARIANTS) return;
    state.drawerVariants.push({ id: '', groupLabel: '', label: '', priceAbsolute: null, notes: '' });
    renderVariantsTable();
    // Focus the new label input
    const rows = $('#variantsTbody').querySelectorAll('tr');
    if (rows.length) {
      const last = rows[rows.length - 1];
      const inp = last.querySelector('.vf-label');
      if (inp) inp.focus();
    }
  }

  $('#addVariantBtn').addEventListener('click', addVariantRow);

  // ---------- Imágenes del producto ----------
  function renderImagesGrid() {
    const grid = $('#imagesGrid');
    grid.innerHTML = '';
    state.drawerImages.forEach((url, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'img-thumb' + (i === 0 ? ' main' : '');
      thumb.innerHTML =
        (i === 0
          ? '<span class="img-main-badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>Principal</span>'
          : '') +
        '<img alt="Imagen del producto">' +
        '<div class="img-thumb-actions">' +
        '<button type="button" class="img-thumb-btn" data-move="left" aria-label="Mover a la izquierda" title="Mover a la izquierda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<button type="button" class="img-thumb-btn" data-move="right" aria-label="Mover a la derecha" title="Mover a la derecha"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
        '<button type="button" class="img-thumb-btn remove" data-remove aria-label="Quitar imagen" title="Quitar imagen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>';
      thumb.querySelector('img').src = url;

      const leftBtn = thumb.querySelector('[data-move="left"]');
      const rightBtn = thumb.querySelector('[data-move="right"]');
      leftBtn.disabled = i === 0;
      rightBtn.disabled = i === state.drawerImages.length - 1;

      leftBtn.addEventListener('click', () => moveImage(i, -1));
      rightBtn.addEventListener('click', () => moveImage(i, 1));
      thumb.querySelector('[data-remove]').addEventListener('click', () => {
        state.drawerImages.splice(i, 1);
        renderImagesGrid();
      });
      grid.appendChild(thumb);
    });
  }

  function moveImage(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= state.drawerImages.length) return;
    const tmp = state.drawerImages[i];
    state.drawerImages[i] = state.drawerImages[j];
    state.drawerImages[j] = tmp;
    renderImagesGrid();
  }

  // Zona de subida
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      /^image\//.test(f.type)
    );
    if (!files.length) {
      toast('Solo se permiten archivos de imagen', 'error');
      return;
    }
    uploadFiles(files);
  });

  async function uploadFiles(files) {
    if (files.length > 10) {
      toast('Máximo 10 imágenes por subida', 'error');
      files = files.slice(0, 10);
    }
    const grid = $('#imagesGrid');
    const placeholders = files.map((f) => {
      const ph = document.createElement('div');
      ph.className = 'img-thumb uploading';
      ph.innerHTML = '<div class="spinner"></div><span></span>';
      ph.querySelector('span').textContent = f.name;
      grid.appendChild(ph);
      return ph;
    });

    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    try {
      const data = await api('/api/admin/upload', { method: 'POST', body: fd });
      (data.files || []).forEach((f) => state.drawerImages.push(f.url));
      toast(
        (data.files || []).length === 1 ? 'Imagen subida' : 'Imágenes subidas',
        'success'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      placeholders.forEach((ph) => ph.remove());
      renderImagesGrid();
    }
  }

  // ---------- Guardar producto ----------
  function clearFieldErrors() {
    ['pfName', 'pfCategory', 'pfPrice'].forEach((id) => {
      $('#' + id).classList.remove('invalid');
      const err = $('#err-' + id);
      if (err) err.hidden = true;
    });
  }

  function setFieldError(id, msg) {
    $('#' + id).classList.add('invalid');
    const err = $('#err-' + id);
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
  }

  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();
    $('#drawerError').hidden = true;

    const name = $('#pfName').value.trim();
    const category = $('#pfCategory').value;
    const price = Number($('#pfPrice').value);
    const oldPriceRaw = $('#pfOldPrice').value.trim();

    let valid = true;
    if (!name) {
      setFieldError('pfName', 'El nombre es obligatorio');
      valid = false;
    }
    if (!category) {
      setFieldError('pfCategory', 'Selecciona una categoría');
      valid = false;
    }
    if ($('#pfPrice').value.trim() === '' || !Number.isFinite(price) || price < 0) {
      setFieldError('pfPrice', 'Ingresa un precio válido (0 o mayor)');
      valid = false;
    }
    if (!valid) return;

    const features = Array.from(document.querySelectorAll('.feature-input'))
      .map((i) => i.value.trim())
      .filter(Boolean)
      .slice(0, MAX_FEATURES);

    const base = state.editing || {};
    const body = Object.assign({}, base, {
      name,
      category,
      price,
      oldPrice: oldPriceRaw !== '' && Number(oldPriceRaw) > 0 ? Number(oldPriceRaw) : null,
      badge: $('#pfBadge').value || null,
      shortDescription: $('#pfShortDescription').value.trim(),
      description: $('#pfDescription').value.trim(),
      features,
      materials: $('#pfMaterials').value.trim(),
      dimensions: $('#pfDimensions').value.trim(),
      images: state.drawerImages.slice(),
      variants: state.drawerVariants.filter((v) => v.label && v.label.trim()),
      priceRangeLabel: $('#pfPriceRangeLabel').value.trim(),
      featured: $('#pfFeatured').checked,
      active: $('#pfActive').checked,
    });

    const btn = $('#drawerSave');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      if (state.editing) {
        await api('/api/admin/products/' + encodeURIComponent(state.editing.id), {
          method: 'PUT',
          body,
        });
      } else {
        await api('/api/admin/products', { method: 'POST', body });
      }
      closeDrawer();
      toast('Producto guardado', 'success');
      productsLoading = false;
      await loadProducts();
    } catch (err) {
      const errBox = $('#drawerError');
      errBox.textContent = err.message;
      errBox.hidden = false;
      $('.drawer-body').scrollTop = 0;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar producto';
    }
  });

  // ---------- Ajustes del sitio ----------
  const SETTING_KEYS = [
    'heroTitle',
    'heroSubtitle',
    'phone',
    'whatsapp',
    'email',
    'address',
    'city',
    'hours',
    'instagram',
    'facebook',
    'mapUrl',
    'aboutText',
  ];

  async function loadSettings() {
    const btn = $('#settingsSaveBtn');
    btn.disabled = true;
    try {
      const data = await api('/api/admin/settings');
      const s = data.settings || {};
      SETTING_KEYS.forEach((k) => {
        $('#set-' + k).value = s[k] || '';
      });
      state.settingsLoaded = true;
    } catch (err) {
      if (!err.message.includes('Sesión')) toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    SETTING_KEYS.forEach((k) => {
      body[k] = $('#set-' + k).value;
    });
    const btn = $('#settingsSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      await api('/api/admin/settings', { method: 'PUT', body });
      toast('Ajustes guardados', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  });

  // ---------- Contraseña ----------
  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#passwordError');
    errBox.hidden = true;

    const current = $('#pwCurrent').value;
    const next = $('#pwNext').value;
    const confirm = $('#pwConfirm').value;

    if (next.length < 8) {
      errBox.textContent = 'La nueva contraseña debe tener al menos 8 caracteres';
      errBox.hidden = false;
      return;
    }
    if (next !== confirm) {
      errBox.textContent = 'Las contraseñas nuevas no coinciden';
      errBox.hidden = false;
      return;
    }

    const btn = $('#passwordSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Actualizando…';
    try {
      await api('/api/admin/password', { method: 'POST', body: { current, next } });
      $('#pwCurrent').value = '';
      $('#pwNext').value = '';
      $('#pwConfirm').value = '';
      toast('Contraseña actualizada', 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Actualizar contraseña';
    }
  });

  // ---------- Arranque ----------
  boot();
})();
