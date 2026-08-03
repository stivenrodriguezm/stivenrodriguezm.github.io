/* LOTTUS — Página de detalle de producto */
(function () {
  'use strict';
  const L = window.LOTTUS;

  const slug = decodeURIComponent(location.pathname.split('/producto/')[1] || '').replace(/\/$/, '');
  const content = document.getElementById('pdContent');
  const breadcrumb = document.getElementById('breadcrumb');
  const relatedSec = document.getElementById('relatedSec');
  const relatedGrid = document.getElementById('relatedGrid');

  const CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';

  function notFound() {
    document.title = 'Producto no encontrado · LOTTUS';
    content.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding:60px 20px 100px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <h3>No encontramos esta pieza</h3>
        <p style="margin-bottom:26px">Es posible que haya sido retirada del catálogo.</p>
        <a href="/catalogo" class="btn btn-dark">Volver al catálogo</a>
      </div>`;
  }

  function galleryHTML(images, name) {
    const imgs = images && images.length ? images : ['/img/seed/hero.jpg'];
    const main = `<div class="pd-main" id="pdMain" title="Haz clic para ampliar la galería">
      <img id="pdMainImg" src="${L.esc(imgs[0])}" alt="${L.esc(name)}" fetchpriority="high">
      <div class="pd-main-zoom-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 15l6 6m-11-4a7 7 0 100-14 7 7 0 000 14zM10 7v6m-3-3h6"/></svg>
        <span>Ampliar</span>
      </div>
    </div>`;
    const thumbs =
      imgs.length > 1
        ? `<div class="pd-thumbs">${imgs
            .map(
              (u, i) =>
                `<button class="pd-thumb${i === 0 ? ' active' : ''}" data-index="${i}" data-src="${L.esc(u)}" aria-label="Ver imagen ${i + 1}"><img src="${L.esc(u)}" alt=""></button>`
            )
            .join('')}</div>`
        : '';
    return main + thumbs;
  }

  function accordionsHTML(p) {
    const items = [];
    if (p.description)
      items.push(
        `<details class="accordion" open><summary>Descripción completa<span class="acc-icon"></span></summary><div class="acc-body">${L.esc(p.description)}</div></details>`
      );
    if (p.materials)
      items.push(
        `<details class="accordion"><summary>Materiales<span class="acc-icon"></span></summary><div class="acc-body">${L.esc(p.materials)}</div></details>`
      );
    if (p.dimensions)
      items.push(
        `<details class="accordion"><summary>Dimensiones y cuidados<span class="acc-icon"></span></summary><div class="acc-body">${L.esc(p.dimensions)}\n\nEntrega e instalación incluida en Bogotá. Para el cuidado diario, limpia con un paño suave y seco; evita exposición directa y prolongada al sol.</div></details>`
      );
    return items.join('');
  }

  /* ---- Variantes ---- */
  function groupVariants(variants) {
    const groups = {};
    const order = [];
    variants.forEach((v) => {
      const g = v.groupLabel || 'Opciones';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(v);
    });
    return { groups, order };
  }

  function variantsHTML(variants) {
    if (!variants || !variants.length) return '';
    const { groups, order } = groupVariants(variants);

    const rows = order.map((groupName) => {
      const items = groups[groupName];
      const itemsHTML = items.map((v) => {
        const price = v.priceAbsolute != null
          ? `<span class="vt-price">${L.fmt(v.priceAbsolute)}</span>`
          : `<span class="vt-price vt-price-consulta">Consultar</span>`;
        const notes = v.notes ? `<span class="vt-notes">${L.esc(v.notes)}</span>` : '';
        return `<div class="vt-item" data-variant-id="${L.esc(v.id || '')}">
          <div class="vt-item-info">
            <span class="vt-label">${L.esc(v.label)}</span>
            ${notes}
          </div>
          ${price}
          <button type="button" class="vt-select-btn" data-variant-id="${L.esc(v.id || '')}">
            Cotizar esta opción
          </button>
        </div>`;
      }).join('');

      return `<div class="vt-group">
        <div class="vt-group-label">${L.esc(groupName)}</div>
        <div class="vt-group-items">${itemsHTML}</div>
      </div>`;
    }).join('');

    return `<details class="accordion pd-variants-accordion" open>
      <summary>Opciones y precios disponibles<span class="acc-icon"></span></summary>
      <div class="acc-body pd-variants-body">
        <p class="vt-hint">Selecciona una opción para personalizar tu cotización por WhatsApp.</p>
        <div class="vt-list" id="variantsList">${rows}</div>
      </div>
    </details>`;
  }

  function priceBlockHTML(p) {
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const pr = p.priceRange;

    if (hasVariants && pr && (pr.min || pr.label)) {
      const label = pr.label;
      const min = pr.min ? L.fmt(pr.min) : null;
      const max = pr.max && pr.max !== pr.min ? L.fmt(pr.max) : null;
      let rangeText;
      if (label) {
        rangeText = label;
      } else if (min && max) {
        rangeText = `${min} \u2013 ${max}`;
      } else if (min) {
        rangeText = `Desde ${min}`;
      } else {
        rangeText = 'Consultar precio';
      }
      return `<div class="pd-price pd-price-range">
        <span class="now">${L.esc(rangeText)}</span>
        <span class="pd-price-note">El precio final depende de la configuración seleccionada</span>
      </div>`;
    }

    const discount =
      p.oldPrice && p.oldPrice > p.price
        ? Math.round((1 - p.price / p.oldPrice) * 100)
        : 0;

    return `<div class="pd-price">
      <span class="now">${L.fmt(p.price)}</span>
      ${p.oldPrice ? `<span class="old">${L.fmt(p.oldPrice)}</span>` : ''}
      ${discount ? `<span class="save">Ahorra ${discount}%</span>` : ''}
    </div>`;
  }

  function render(p, related, categories) {
    const cat = (categories || []).find((c) => c.slug === p.category);
    const catName = cat ? cat.name : p.category;
    document.title = `${p.name} \u00b7 LOTTUS`;

    breadcrumb.innerHTML = `
      <a href="/">Inicio</a><span class="sep">\u00b7</span><a href="/catalogo">Cat\u00e1logo</a><span class="sep">\u00b7</span>
      <a href="/catalogo?categoria=${L.esc(p.category)}">${L.esc(catName)}</a><span class="sep">\u00b7</span>
      <span>${L.esc(p.name)}</span>`;

    const features = (p.features || [])
      .map((f) => `<li>${CHECK}<span>${L.esc(f)}</span></li>`)
      .join('');

    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;

    content.innerHTML = `
      <div class="pd-gallery">${galleryHTML(p.images, p.name)}</div>
      <div class="pd-info">
        <span class="pc-cat">${L.esc(catName)}${p.badge ? ' \u00b7 ' + L.esc(p.badge) : ''}</span>
        <h1>${L.esc(p.name)}</h1>
        ${priceBlockHTML(p)}
        ${p.shortDescription ? `<p class="pd-short">${L.esc(p.shortDescription)}</p>` : ''}
        ${features ? `<ul class="pd-features">${features}</ul>` : ''}
        ${variantsHTML(p.variants)}
        <div class="pd-ctas" id="pdCtas">
          <a href="#" id="pdWa" class="btn btn-gold" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            ${hasVariants ? 'Cotizar esta pieza' : 'Me interesa esta pieza'}
          </a>
          <a href="/catalogo?categoria=${L.esc(p.category)}" class="btn btn-outline-dark">Ver m\u00e1s ${L.esc(catName.toLowerCase())}</a>
        </div>
        <div class="pd-trust">
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8h14v9H1zM15 11h4l3 3v3h-7z"/><circle cx="5.5" cy="18.5" r="1.8"/><circle cx="18.5" cy="18.5" r="1.8"/></svg>Entrega e instalaci\u00f3n en Bogot\u00e1</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z"/><path d="M9 11.5l2.2 2.2L15.5 9"/></svg>Garant\u00eda LOTTUS</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 7l-8.5 8.5a2.1 2.1 0 003 3L17 10"/><path d="M13 8l3 3 4-4-3-3-4 4z"/></svg>Hecho a mano</div>
        </div>
        ${accordionsHTML(p)}
      </div>`;

    // Galería & Lightbox Modal
    const allImages = p.images && p.images.length ? p.images : ['/img/seed/hero.jpg'];
    let currentIndex = 0;

    const mainImg = document.getElementById('pdMainImg');
    const pdMain = document.getElementById('pdMain');

    const lbModal = document.getElementById('pdLightbox');
    const lbImg = document.getElementById('pdlbImg');
    const lbCounter = document.getElementById('pdlbCounter');
    const lbThumbs = document.getElementById('pdlbThumbs');
    const lbPrev = document.getElementById('pdlbPrev');
    const lbNext = document.getElementById('pdlbNext');
    const lbClose = document.getElementById('pdlbClose');
    const lbBackdrop = document.getElementById('pdlbBackdrop');

    function updateMainImage(index) {
      if (index < 0 || index >= allImages.length) return;
      currentIndex = index;
      content.querySelectorAll('.pd-thumb').forEach((b, i) => {
        b.classList.toggle('active', i === currentIndex);
      });
      mainImg.classList.add('fade');
      setTimeout(() => {
        mainImg.src = allImages[currentIndex];
        mainImg.onload = () => mainImg.classList.remove('fade');
      }, 180);
    }

    content.querySelectorAll('.pd-thumb').forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateMainImage(i);
      });
    });

    function renderLbThumbs() {
      if (allImages.length <= 1) {
        lbThumbs.style.display = 'none';
        lbPrev.style.display = 'none';
        lbNext.style.display = 'none';
        lbCounter.style.display = 'none';
        return;
      }
      lbThumbs.style.display = 'flex';
      lbPrev.style.display = 'flex';
      lbNext.style.display = 'flex';
      lbCounter.style.display = 'block';

      lbThumbs.innerHTML = allImages.map((u, i) => `
        <button class="pdlb-thumb${i === currentIndex ? ' active' : ''}" data-index="${i}" aria-label="Ver imagen ${i + 1}">
          <img src="${L.esc(u)}" alt="">
        </button>
      `).join('');

      lbThumbs.querySelectorAll('.pdlb-thumb').forEach((btn, i) => {
        btn.addEventListener('click', () => setLbIndex(i));
      });
    }

    function setLbIndex(index) {
      if (!allImages.length) return;
      currentIndex = (index + allImages.length) % allImages.length;

      content.querySelectorAll('.pd-thumb').forEach((b, i) => {
        b.classList.toggle('active', i === currentIndex);
      });
      mainImg.src = allImages[currentIndex];

      lbImg.classList.add('fade');
      setTimeout(() => {
        lbImg.src = allImages[currentIndex];
        lbImg.onload = () => lbImg.classList.remove('fade');
      }, 150);

      lbCounter.textContent = `${currentIndex + 1} / ${allImages.length}`;

      if (lbThumbs) {
        lbThumbs.querySelectorAll('.pdlb-thumb').forEach((t, i) => {
          t.classList.toggle('active', i === currentIndex);
        });
        const activeThumb = lbThumbs.querySelector('.pdlb-thumb.active');
        if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    function openLightbox(startIndex = 0) {
      renderLbThumbs();
      setLbIndex(startIndex);
      lbModal.classList.add('open');
      lbModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lbModal.classList.remove('open');
      lbModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (pdMain) {
      pdMain.addEventListener('click', () => openLightbox(currentIndex));
    }

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);
    if (lbPrev) lbPrev.addEventListener('click', () => setLbIndex(currentIndex - 1));
    if (lbNext) lbNext.addEventListener('click', () => setLbIndex(currentIndex + 1));

    const onKeyDown = (e) => {
      if (!lbModal.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') setLbIndex(currentIndex - 1);
      if (e.key === 'ArrowRight') setLbIndex(currentIndex + 1);
    };
    window.removeEventListener('keydown', window._pdlbKeyHandler);
    window._pdlbKeyHandler = onKeyDown;
    window.addEventListener('keydown', onKeyDown);

    let touchStartX = 0;
    lbModal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lbModal.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) setLbIndex(currentIndex - 1);
        else setLbIndex(currentIndex + 1);
      }
    }, { passive: true });

    // WhatsApp dinámico con soporte de variante seleccionada
    let selectedVariant = null;
    const waBtn = document.getElementById('pdWa');

    function buildWaMessage(variant) {
      const settings = L.settings || {};
      let msg;
      if (variant) {
        const priceText = variant.priceAbsolute != null
          ? ` (${L.fmt(variant.priceAbsolute)})`
          : '';
        msg = `Hola LOTTUS, me interesa la pieza *"${p.name}"* en la opci\u00f3n *"${variant.label}"*${priceText}. \u00bfMe pueden dar m\u00e1s informaci\u00f3n y confirmar disponibilidad?`;
      } else if (hasVariants) {
        const priceText = p.priceRange && p.priceRange.min ? ` (desde ${L.fmt(p.priceRange.min)})` : '';
        msg = `Hola LOTTUS, me interesa la pieza *"${p.name}"*${priceText}. Quisiera conocer las opciones disponibles de configuraci\u00f3n y precios.`;
      } else {
        msg = `Hola LOTTUS, me interesa la pieza *"${p.name}"* (${L.fmt(p.price)}). \u00bfMe pueden dar m\u00e1s informaci\u00f3n?`;
      }
      waBtn.href = L.waLink(settings, msg);
    }

    const buildWa = () => buildWaMessage(selectedVariant);
    if (L.settings) buildWa();
    else document.addEventListener('lottus:settings', buildWa, { once: true });

    // Variantes: clic en "Cotizar esta opción"
    if (hasVariants) {
      content.querySelectorAll('.vt-select-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const vid = btn.dataset.variantId;
          const variant = p.variants.find((v) => v.id === vid);
          if (!variant) return;

          if (selectedVariant && selectedVariant.id === vid) {
            // Deselect
            selectedVariant = null;
            content.querySelectorAll('.vt-item').forEach((el) => el.classList.remove('selected'));
            content.querySelectorAll('.vt-select-btn').forEach((b) => { b.textContent = 'Cotizar esta opci\u00f3n'; });
            waBtn.childNodes[waBtn.childNodes.length - 1].textContent = ' Cotizar esta pieza';
          } else {
            selectedVariant = variant;
            content.querySelectorAll('.vt-item').forEach((el) => {
              el.classList.toggle('selected', el.dataset.variantId === vid);
            });
            content.querySelectorAll('.vt-select-btn').forEach((b) => {
              b.textContent = b.dataset.variantId === vid ? '\u2713 Seleccionada' : 'Cotizar esta opci\u00f3n';
            });
            waBtn.childNodes[waBtn.childNodes.length - 1].textContent = ' Cotizar: ' + variant.label.substring(0, 28) + (variant.label.length > 28 ? '\u2026' : '');
          }
          buildWaMessage(selectedVariant);
        });
      });
    }

    // Relacionados
    if (related && related.length) {
      relatedSec.hidden = false;
      relatedGrid.innerHTML = related.map((r) => L.cardHTML(r, categories)).join('');
    }
  }

  if (!slug) return notFound();

  fetch('/api/products/' + encodeURIComponent(slug))
    .then((r) => {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then(({ product, related, categories }) => render(product, related, categories))
    .catch(notFound);
})();
