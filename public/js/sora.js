/* LOTTUS — Landing Sora: carga las referencias de colchones desde la API */
(function () {
  'use strict';
  const L = window.LOTTUS;
  const grid = document.getElementById('modelsGrid');
  if (!grid) return;

  const CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  const WA_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function cardHTML(p) {
    const img = (p.images && p.images[0]) || '';
    const feats = (p.features || [])
      .slice(0, 4)
      .map((f) => `<li>${CHECK}<span>${L.esc(f)}</span></li>`)
      .join('');
    return `
      <article class="model-card reveal${p.featured ? ' model-card--fav' : ''}">
        ${p.featured ? '<span class="model-ribbon">El favorito</span>' : ''}
        <a href="/producto/${L.esc(p.slug)}" class="model-media">
          <img src="${L.esc(img)}" alt="${L.esc(p.name)}" loading="lazy">
        </a>
        <div class="model-body">
          <span class="pc-cat">Sora by LOTTUS</span>
          <h3>${L.esc(p.name)}</h3>
          <p>${L.esc(p.shortDescription || '')}</p>
          <ul class="model-feats">${feats}</ul>
          <div class="model-foot">
            <div class="model-price"><small>Desde</small>${L.fmt(p.price)}</div>
            <div class="model-ctas">
              <a href="/producto/${L.esc(p.slug)}" class="btn btn-dark">Ver detalle</a>
              <a href="#" class="btn-icon" data-wa-model="${L.esc(p.name)}" data-price="${p.price}" aria-label="Consultar ${L.esc(p.name)} por WhatsApp">${WA_SVG}</a>
            </div>
          </div>
        </div>
      </article>`;
  }

  function wireModelWa() {
    if (!L.settings) return;
    grid.querySelectorAll('[data-wa-model]').forEach((el) => {
      const name = el.dataset.waModel;
      const price = Number(el.dataset.price) || 0;
      el.href = L.waLink(
        L.settings,
        `Hola LOTTUS, me interesa el ${name} (${L.fmt(price)}). ¿Me pueden asesorar?`
      );
      el.target = '_blank';
      el.rel = 'noopener';
    });
  }

  fetch('/api/products?category=sora&sort=price-asc')
    .then((r) => r.json())
    .then(({ products }) => {
      if (!products.length) {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1"><h3>Pronto nuevas referencias</h3><p>Estamos preparando la próxima colección Sora.</p></div>';
        return;
      }
      grid.innerHTML = products.map(cardHTML).join('');
      L.observeReveals(grid);
      wireModelWa();
    })
    .catch(() => {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1"><h3>Error de conexión</h3><p>No pudimos cargar las referencias. Recarga la página.</p></div>';
    });

  document.addEventListener('lottus:settings', wireModelWa, { once: true });
})();
