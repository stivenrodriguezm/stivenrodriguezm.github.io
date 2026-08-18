/* LOTTUS — Contacto: formulario de PQRS que crea el ticket en el backend
   y muestra el radicado que también llega por correo al cliente. */
(function () {
  'use strict';
  const L = window.LOTTUS;

  const formWrap = document.getElementById('pqrsFormWrap');
  const successPanel = document.getElementById('pqrsSuccess');
  const radicadoEl = document.getElementById('pqrsRadicado');
  const newMsgBtn = document.getElementById('pqrsNewMsg');

  const form = document.getElementById('contactForm');
  const errorEl = document.getElementById('formError');
  const submitBtn = document.getElementById('fSubmit');
  const typeEl = document.getElementById('fType');
  const nameEl = document.getElementById('fName');
  const emailEl = document.getElementById('fEmail');
  const phoneEl = document.getElementById('fPhone');
  const msgEl = document.getElementById('fMsg');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(text) {
    errorEl.textContent = text;
    errorEl.style.display = 'block';
  }

  function hideError() {
    errorEl.style.display = 'none';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = typeEl.value;
    const nombre = nameEl.value.trim();
    const email = emailEl.value.trim();
    const telefono = phoneEl.value.trim();
    const mensaje = msgEl.value.trim();

    if (!nombre || !email || !mensaje) {
      showError('Completa nombre, correo y mensaje para continuar.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showError('Ingresa un correo electrónico válido.');
      return;
    }
    hideError();

    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Radicando...';

    try {
      const res = await fetch(L.apiUrl('pqrs/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, nombre, email, telefono, mensaje }),
      });
      const data = await res.json();

      if (!res.ok) {
        const firstError =
          data && typeof data === 'object'
            ? Object.values(data).flat().find((v) => typeof v === 'string')
            : null;
        throw new Error(firstError || 'No se pudo enviar tu solicitud. Intenta de nuevo.');
      }

      radicadoEl.textContent = data.radicado || '';
      formWrap.style.display = 'none';
      successPanel.style.display = 'block';
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showError(err.message || 'No se pudo enviar tu solicitud. Intenta de nuevo en unos minutos.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
      submitBtn.textContent = 'Radicar PQRS';
    }
  });

  if (newMsgBtn) {
    newMsgBtn.addEventListener('click', () => {
      form.reset();
      hideError();
      successPanel.style.display = 'none';
      formWrap.style.display = 'block';
    });
  }

  /* ---------- Tabs: Radicar / Consultar PQRS ---------- */
  const tabNew = document.getElementById('pqrsTabNew');
  const tabTrack = document.getElementById('pqrsTabTrack');
  const trackWrap = document.getElementById('pqrsTrackWrap');

  function activateTab(which) {
    const isNew = which === 'new';
    tabNew.classList.toggle('active', isNew);
    tabNew.setAttribute('aria-selected', String(isNew));
    tabTrack.classList.toggle('active', !isNew);
    tabTrack.setAttribute('aria-selected', String(!isNew));
    trackWrap.style.display = isNew ? 'none' : 'block';
    if (isNew) {
      // Conserva lo que ya se veía en el lado "nuevo" (formulario o éxito).
      formWrap.style.display = successPanel.style.display === 'block' ? 'none' : 'block';
    } else {
      formWrap.style.display = 'none';
      successPanel.style.display = 'none';
    }
  }

  if (tabNew && tabTrack && trackWrap) {
    tabNew.addEventListener('click', () => activateTab('new'));
    tabTrack.addEventListener('click', () => activateTab('track'));
  }

  /* ---------- Consultar PQRS por radicado ---------- */
  const trackForm = document.getElementById('trackForm');
  const trackErrorEl = document.getElementById('trackError');
  const trackSubmitBtn = document.getElementById('trackSubmit');
  const radicadoInput = document.getElementById('tRadicado');
  const trackEmailInput = document.getElementById('tEmail');
  const trackResult = document.getElementById('trackResult');
  const trackAnotherBtn = document.getElementById('trackAnother');

  const trRadicadoEl = document.getElementById('trRadicado');
  const trTipoEl = document.getElementById('trTipo');
  const trEstadoEl = document.getElementById('trEstado');
  const trFechaEl = document.getElementById('trFecha');
  const trTimelineEl = document.getElementById('trTimeline');

  const ESTADO_LABELS = {
    recibido: 'Recibido',
    en_proceso: 'En proceso',
    respondido: 'Respondido',
    cerrado: 'Cerrado',
  };

  function formatTrackDate(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function renderTrackResult(data) {
    trRadicadoEl.textContent = data.radicado || '';
    trTipoEl.textContent = data.tipoDisplay || data.tipo || '';

    const estado = data.estado || 'recibido';
    trEstadoEl.textContent = data.estadoDisplay || ESTADO_LABELS[estado] || estado;
    trEstadoEl.className = 'pqrs-status-badge pqrs-status-badge--' + estado;
    trFechaEl.textContent = 'Radicado el ' + formatTrackDate(data.createdAt);

    const items = [{ autor: 'Tú', mensaje: data.mensaje, fecha: data.createdAt, isClient: true }];
    (data.respuestas || []).forEach((r) => {
      items.push({ autor: 'LOTTUS', mensaje: r.mensaje, fecha: r.fecha, isClient: false });
    });

    trTimelineEl.innerHTML = items
      .map(
        (it) => `
      <div class="pqrs-timeline-item${it.isClient ? ' pqrs-timeline-item--client' : ''}">
        <span class="pqrs-timeline-dot"></span>
        <div class="pqrs-timeline-body">
          <div class="pqrs-timeline-author">${L.esc(it.autor)}</div>
          <div class="pqrs-timeline-msg">${L.esc(it.mensaje)}</div>
          <div class="pqrs-timeline-date">${formatTrackDate(it.fecha)}</div>
        </div>
      </div>`
      )
      .join('');

    trackForm.style.display = 'none';
    trackResult.style.display = 'block';
  }

  if (trackForm) {
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const radicado = radicadoInput.value.trim();
      const email = trackEmailInput.value.trim();

      if (!radicado || !email) {
        trackErrorEl.textContent = 'Ingresa el radicado y el correo con el que lo creaste.';
        trackErrorEl.style.display = 'block';
        return;
      }
      trackErrorEl.style.display = 'none';

      trackSubmitBtn.disabled = true;
      trackSubmitBtn.classList.add('btn-loading');
      trackSubmitBtn.innerHTML = '<span class="btn-spinner"></span> Consultando...';

      try {
        const res = await fetch(L.apiUrl('pqrs/rastrear/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ radicado, email }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No encontramos un PQRS con esos datos.');
        }
        renderTrackResult(data);
      } catch (err) {
        trackErrorEl.textContent = err.message || 'No se pudo consultar tu PQRS. Intenta de nuevo.';
        trackErrorEl.style.display = 'block';
      } finally {
        trackSubmitBtn.disabled = false;
        trackSubmitBtn.classList.remove('btn-loading');
        trackSubmitBtn.textContent = 'Consultar';
      }
    });
  }

  if (trackAnotherBtn) {
    trackAnotherBtn.addEventListener('click', () => {
      trackForm.reset();
      trackErrorEl.style.display = 'none';
      trackResult.style.display = 'none';
      trackForm.style.display = 'block';
    });
  }
})();
