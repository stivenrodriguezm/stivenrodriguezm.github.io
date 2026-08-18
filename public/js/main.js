/* LOTTUS — JS compartido del sitio público */
(function () {
  'use strict';

  /* ---------- Helpers globales ---------- */
  const LOTTUS = (window.LOTTUS = window.LOTTUS || {});

  LOTTUS.fmt = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  LOTTUS.esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  LOTTUS.badgeClass = (badge) => {
    if (!badge) return '';
    const map = {
      Oferta: 'badge--oferta',
      Sora: 'badge--sora',
      Nuevo: 'badge--nuevo',
      'Edición limitada': 'badge--edicion',
    };
    return map[badge] || '';
  };

  LOTTUS.waLink = (settings, message) => {
    const num = (settings.whatsapp || '').replace(/\D/g, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  };

  /* ---------- Backend: local (Express proxy) vs. GitHub Pages (Django directo) ---------- */
  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '';
  LOTTUS.API_ORIGIN = isLocalHost ? '' : 'https://api.muebleslottus.com';

  // suffix ej: 'products/', 'products/mi-slug/', 'settings/', 'asesores/'
  LOTTUS.apiUrl = (suffix) =>
    LOTTUS.API_ORIGIN ? `${LOTTUS.API_ORIGIN}/api/paginaweb/${suffix}` : `/api/${suffix}`;

  // convierte rutas relativas de imágenes (/uploads/..., /media/...) del backend en absolutas
  LOTTUS.assetUrl = (u) => {
    if (!u) return u;
    if (/^https?:\/\//i.test(u)) return u;
    return LOTTUS.API_ORIGIN + u;
  };

  const ICON_ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  LOTTUS.ICON_ARROW = ICON_ARROW;

  // Tarjetas "esqueleto" (shimmer) para mostrar mientras se cargan productos —
  // reemplazan el vacío en blanco durante el fetch inicial o al cambiar filtros.
  LOTTUS.skeletonCardsHTML = (count) =>
    Array.from({ length: count || 3 })
      .map(
        () => `
      <div class="product-card skeleton-card" aria-hidden="true">
        <div class="pc-media skeleton-shimmer"></div>
        <div class="pc-body">
          <div class="skeleton-line skeleton-shimmer" style="width:40%"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:75%;height:16px;margin-top:8px"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:35%;height:16px;margin-top:10px"></div>
        </div>
      </div>`
      )
      .join('');

  LOTTUS.cardHTML = (p, categories) => {
    const cat = (categories || []).find((c) => c.slug === p.category);
    const img = (p.images && p.images[0]) || '';
    const badge = p.badge
      ? `<span class="badge ${LOTTUS.badgeClass(p.badge)}">${LOTTUS.esc(p.badge)}</span>`
      : '';

    // Price display: range if variants exist, single otherwise
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const pr = p.priceRange;
    let priceDisplay;
    if (hasVariants && pr && pr.min) {
      const fromPrice = LOTTUS.fmt(pr.min);
      priceDisplay = `<span class="now desde-tag">Desde ${fromPrice}</span>`;
    } else if (hasVariants && pr && pr.label) {
      priceDisplay = `<span class="now desde-tag">${LOTTUS.esc(pr.label)}</span>`;
    } else {
      const old = p.oldPrice ? `<span class="old">${LOTTUS.fmt(p.oldPrice)}</span>` : '';
      priceDisplay = `<span class="now">${LOTTUS.fmt(p.price)}</span>${old}`;
    }

    const variantChip = hasVariants
      ? `<span class="pc-variants-chip">Múltiples opciones</span>`
      : '';

    return `
      <a class="product-card reveal visible" href="/producto/${LOTTUS.esc(p.slug)}">
        <div class="pc-media">
          ${badge}
          <img src="${LOTTUS.esc(LOTTUS.assetUrl(img))}" alt="${LOTTUS.esc(p.name)}" loading="lazy">
          <span class="pc-view">Ver detalle</span>
        </div>
        <div class="pc-body">
          <span class="pc-cat">${LOTTUS.esc(cat ? cat.name : p.category)}</span>
          <h3 class="pc-name">${LOTTUS.esc(p.name)}</h3>
          <div class="pc-price">${priceDisplay}</div>
          ${variantChip}
        </div>
      </a>`;
  };


  /* ---------- Navegación ---------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const toggle = document.querySelector('.nav-toggle');
  const overlay = document.querySelector('.nav-overlay');
  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      const open = overlay.classList.toggle('open');
      toggle.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    overlay.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        overlay.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
  }

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  LOTTUS.observeReveals = (root) => {
    (root || document).querySelectorAll('.reveal:not(.visible)').forEach((el) => revealObserver.observe(el));
  };
  LOTTUS.observeReveals(document);

  /* ---------- Contadores ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const cObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          cObserver.unobserve(e.target);
          const el = e.target;
          const target = Number(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const dur = 1600;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased).toLocaleString('es-CO') + suffix;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => cObserver.observe(c));
  }

  /* ---------- Marquee: duplicar para loop infinito ---------- */
  document.querySelectorAll('.marquee-track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Año en footer ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Re-alinea el scroll a un #hash (ej. #nosotros) si el contenido
     que carga async arriba (destacados, imágenes) desplaza la sección después
     del salto inicial del navegador. Se cancela si el usuario ya interactúa. ---------- */
  let hashRealignPending = !!location.hash;
  if (hashRealignPending) {
    const cancelHashRealign = () => { hashRealignPending = false; };
    ['wheel', 'touchstart', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, cancelHashRealign, { once: true, passive: true })
    );
  }
  LOTTUS.realignToHash = () => {
    if (!hashRealignPending || !location.hash) return;
    let target;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
  };
  window.addEventListener('load', () => setTimeout(LOTTUS.realignToHash, 150));

  /* ---------- Settings del sitio ---------- */
  fetch(LOTTUS.apiUrl('settings/'))
    .then((r) => r.json())
    .then(({ settings, categories }) => {
      LOTTUS.settings = settings;
      LOTTUS.categories = categories;

      document.querySelectorAll('[data-setting]').forEach((el) => {
        const key = el.dataset.setting;
        if (settings[key] != null && settings[key] !== '') el.textContent = settings[key];
      });

      document.querySelectorAll('[data-wa]').forEach((el) => {
        const msg = el.dataset.waMsg || 'Hola LOTTUS, quiero más información sobre sus muebles.';
        el.href = LOTTUS.waLink(settings, msg);
        el.target = '_blank';
        el.rel = 'noopener';
      });

      document.querySelectorAll('[data-social]').forEach((el) => {
        const url = settings[el.dataset.social];
        if (url) el.href = url;
      });

      document.querySelectorAll('[data-mailto]').forEach((el) => {
        el.href = 'mailto:' + (settings.email || '');
      });

      const map = document.querySelector('[data-map]');
      if (map && settings.mapUrl) map.src = settings.mapUrl;

      document.dispatchEvent(new CustomEvent('lottus:settings', { detail: { settings, categories } }));
    })
    .catch(() => {});

  /* ---------- Home: productos destacados ---------- */
  const featuredTrack = document.getElementById('featuredTrack');
  if (featuredTrack) {
    featuredTrack.innerHTML = LOTTUS.skeletonCardsHTML ? LOTTUS.skeletonCardsHTML(4) : '';
    if (window.LOTTUS_LOADER) window.LOTTUS_LOADER.wait();
    fetch(LOTTUS.apiUrl('products/') + '?featured=1')
      .then((r) => r.json())
      .then(({ products, categories }) => {
        if (!products.length) {
          featuredTrack.innerHTML = '<p style="color:var(--text-mid)">Pronto tendremos piezas destacadas.</p>';
          return;
        }
        featuredTrack.innerHTML = products.map((p) => LOTTUS.cardHTML(p, categories)).join('');
      })
      .catch(() => {
        featuredTrack.innerHTML = '<p style="color:var(--text-mid)">No se pudieron cargar los productos.</p>';
      })
      .finally(() => {
        if (window.LOTTUS_LOADER) window.LOTTUS_LOADER.done();
        // Este carrusel va antes de #nosotros en el DOM: si el usuario llegó vía
        // /#nosotros desde otra página, insertarlo puede correr la sección hacia
        // abajo después del salto inicial. Re-alineamos una vez que ya se insertó.
        requestAnimationFrame(() => requestAnimationFrame(LOTTUS.realignToHash));
      });

    document.querySelectorAll('[data-car]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.car === 'next' ? 1 : -1;
        featuredTrack.scrollBy({ left: dir * 340, behavior: 'smooth' });
      });
    });
  }

  /* ---------- Asesores: tarjetas digitales ---------- */
  const advisorsSection = document.getElementById('asesores');
  const advisorsGrid = document.getElementById('advisorsGrid');
  if (advisorsSection && advisorsGrid) {
    LOTTUS.initials = (nombre) =>
      String(nombre || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    LOTTUS.advisorCardHTML = (a) => {
      const photo = a.foto
        ? `<img class="advisor-chip-photo" src="${LOTTUS.esc(LOTTUS.assetUrl(a.foto))}" alt="${LOTTUS.esc(a.nombre)}" loading="lazy">`
        : `<span class="advisor-chip-fallback" aria-hidden="true">${LOTTUS.esc(LOTTUS.initials(a.nombre)) || 'L'}</span>`;
      return `
        <a class="advisor-chip" href="/asesor/${LOTTUS.esc(a.slug)}">
          ${photo}
          <span class="advisor-chip-info">
            <span class="advisor-chip-name">${LOTTUS.esc(a.nombre)}</span>
            <span class="advisor-chip-role">${LOTTUS.esc(a.cargo || 'Asesor Comercial')}</span>
          </span>
        </a>`;
    };

    if (window.LOTTUS_LOADER) window.LOTTUS_LOADER.wait();
    fetch(LOTTUS.apiUrl('asesores/'))
      .then((r) => r.json())
      .then(({ asesores }) => {
        if (!Array.isArray(asesores) || !asesores.length) {
          advisorsSection.hidden = true;
          return;
        }
        advisorsGrid.innerHTML = asesores.map((a) => LOTTUS.advisorCardHTML(a)).join('');
        advisorsSection.hidden = false;
      })
      .catch(() => {
        advisorsSection.hidden = true;
      })
      .finally(() => {
        if (window.LOTTUS_LOADER) window.LOTTUS_LOADER.done();
      });
  }
})();
