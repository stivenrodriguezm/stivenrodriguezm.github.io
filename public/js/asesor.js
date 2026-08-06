/**
 * LOTTUS · Tarjeta digital de asesor — controlador de la página pública /asesor/:slug
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  function initials(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  function getSlugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('asesor');
    if (idx > -1 && parts[idx + 1]) {
      return decodeURIComponent(parts[idx + 1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('vendedor') || params.get('asesor') || '';
  }

  const loadingState = document.getElementById('loadingState');
  const notFoundState = document.getElementById('notFoundState');
  const profileView = document.getElementById('profileView');

  const slug = getSlugFromPath();

  function showNotFound() {
    if (loadingState) loadingState.hidden = true;
    if (profileView) profileView.hidden = true;
    if (notFoundState) notFoundState.hidden = false;
  }

  function fetchAdvisorProfile(targetSlug) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = setTimeout(() => {
      if (controller) controller.abort();
    }, 6000);

    fetch(`/api/asesores/${encodeURIComponent(targetSlug)}`, controller ? { signal: controller.signal } : {})
      .then((r) => {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => {
        const a = data.asesor || data;
        if (!a || (!a.nombre && !a.id)) throw new Error('not found');
        renderProfile(a, targetSlug);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.warn('No se pudo obtener el perfil de asesor:', err);
        showNotFound();
      });
  }

  if (!slug) {
    fetch('/api/asesores')
      .then((r) => r.json())
      .then((data) => {
        const list = data.asesores || (Array.isArray(data) ? data : []);
        if (list.length > 0 && list[0].slug) {
          fetchAdvisorProfile(list[0].slug);
        } else {
          showNotFound();
        }
      })
      .catch(showNotFound);
  } else {
    fetchAdvisorProfile(slug);
  }

  function renderProfile(a, targetSlug) {
    const activeSlug = a.slug || targetSlug || slug;
    document.title = `${a.nombre} · Asesor LOTTUS`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `Contacta a ${a.nombre}, ${a.cargo || 'asesor comercial'} de LOTTUS, directo por WhatsApp.`;
    }

    document.getElementById('advisorName').textContent = a.nombre || '';
    document.getElementById('advisorRole').textContent = a.cargo || 'Asesor Comercial';

    const bioEl = document.getElementById('advisorBio');
    if (a.bioCorta) {
      bioEl.textContent = a.bioCorta;
      bioEl.hidden = false;
    }

    const photoEl = document.getElementById('advisorPhoto');
    const fallbackEl = document.getElementById('advisorAvatarFallback');
    if (a.foto) {
      photoEl.src = a.foto;
      photoEl.alt = a.nombre || '';
      photoEl.hidden = false;
    } else {
      fallbackEl.textContent = initials(a.nombre) || 'L';
      fallbackEl.hidden = false;
    }

    const waBtn = document.getElementById('waMainBtn');
    if (a.whatsappUrl) {
      const msg = `Hola${a.nombre ? ' ' + a.nombre.split(' ')[0] : ''}, vi tu tarjeta digital de LOTTUS y quiero más información.`;
      waBtn.href = `${a.whatsappUrl}?text=${encodeURIComponent(msg)}`;
    } else {
      waBtn.style.display = 'none';
    }

    const qrImg = document.getElementById('qrImg');
    if (qrImg) {
      qrImg.src = `/api/asesores/${encodeURIComponent(activeSlug)}/qr.png`;
    }

    if (loadingState) loadingState.hidden = true;
    if (notFoundState) notFoundState.hidden = true;
    if (profileView) profileView.hidden = false;
  }

  /* ---------- QR modal ---------- */
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModal = document.getElementById('closeQrModal');
  if (qrBtn && qrModal) {
    qrBtn.addEventListener('click', () => {
      qrModal.classList.add('open');
      qrModal.setAttribute('aria-hidden', 'false');
    });
  }
  function closeModal() {
    qrModal.classList.remove('open');
    qrModal.setAttribute('aria-hidden', 'true');
  }
  if (closeQrModal) closeQrModal.addEventListener('click', closeModal);
  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) closeModal();
    });
  }

  /* ---------- Compartir / copiar enlace ---------- */
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('Enlace copiado al portapapeles');
    } catch (e) {
      showToast('No se pudo copiar el enlace');
    }
    document.body.removeChild(input);
  }

  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: 'LOTTUS · Tarjeta digital',
        text: 'Contáctame directo por WhatsApp a través de mi tarjeta digital LOTTUS.',
        url: window.location.href,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          /* usuario canceló, no hacer nada */
        }
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => showToast('Enlace copiado al portapapeles'))
          .catch(() => fallbackCopy(window.location.href));
      } else {
        fallbackCopy(window.location.href);
      }
    });
  }
});
