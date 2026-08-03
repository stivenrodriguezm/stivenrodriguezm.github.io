/* LOTTUS — Catálogo: filtros, búsqueda y orden */
(function () {
  'use strict';
  const L = window.LOTTUS;

  const grid = document.getElementById('grid');
  const pillsBox = document.getElementById('pills');
  const countEl = document.getElementById('catalogCount');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  const params = new URLSearchParams(location.search);
  const state = {
    category: params.get('categoria') || '',
    q: '',
    sort: '',
  };

  let categories = [];
  let debounceTimer = null;

  function syncURL() {
    const p = new URLSearchParams();
    if (state.category) p.set('categoria', state.category);
    if (state.q) p.set('q', state.q);
    if (state.sort) p.set('orden', state.sort);
    history.replaceState(null, '', '/catalogo' + (p.toString() ? '?' + p.toString() : ''));
  }

  function renderPills() {
    const all = [{ slug: '', name: 'Todos' }, ...categories];
    pillsBox.innerHTML = all
      .map(
        (c) =>
          `<button class="pill${state.category === c.slug ? ' active' : ''}" data-slug="${L.esc(c.slug)}">${L.esc(c.name)}</button>`
      )
      .join('');
    pillsBox.querySelectorAll('.pill').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.category = btn.dataset.slug;
        renderPills();
        load();
      })
    );
  }

  function emptyHTML() {
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></svg>
        <h3>Sin resultados</h3>
        <p>No encontramos piezas con esos filtros. Prueba con otra búsqueda o categoría.</p>
      </div>`;
  }

  function load() {
    syncURL();
    const p = new URLSearchParams();
    if (state.category) p.set('category', state.category);
    if (state.q) p.set('q', state.q);
    if (state.sort) p.set('sort', state.sort);

    fetch('/api/products?' + p.toString())
      .then((r) => r.json())
      .then(({ products, categories: cats }) => {
        if (cats && cats.length && !categories.length) {
          categories = cats;
          renderPills();
        }
        const catName = state.category
          ? (categories.find((c) => c.slug === state.category) || {}).name || ''
          : '';
        countEl.innerHTML = products.length
          ? `<b>${products.length}</b> ${products.length === 1 ? 'pieza' : 'piezas'}${catName ? ' en <b>' + L.esc(catName) + '</b>' : ''}`
          : '';
        grid.innerHTML = products.length
          ? products.map((prod) => L.cardHTML(prod, categories)).join('')
          : emptyHTML();
      })
      .catch(() => {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1"><h3>Error de conexión</h3><p>No pudimos cargar el catálogo. Recarga la página.</p></div>';
      });
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.q = searchInput.value.trim();
      load();
    }, 280);
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    load();
  });

  // El q inicial puede venir por URL
  if (params.get('q')) {
    state.q = params.get('q');
    searchInput.value = state.q;
  }
  if (params.get('orden')) {
    state.sort = params.get('orden');
    sortSelect.value = state.sort;
  }

  load();
})();
