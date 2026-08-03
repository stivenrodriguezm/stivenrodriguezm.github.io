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

  const ICON_ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  LOTTUS.ICON_ARROW = ICON_ARROW;

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
          <img src="${LOTTUS.esc(img)}" alt="${LOTTUS.esc(p.name)}" loading="lazy">
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

  /* ---------- Settings del sitio ---------- */
  fetch('/api/settings')
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
    fetch('/api/products?featured=1')
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
      });

    document.querySelectorAll('[data-car]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.car === 'next' ? 1 : -1;
        featuredTrack.scrollBy({ left: dir * 340, behavior: 'smooth' });
      });
    });
  }
})();
