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
  const nameEl = document.getElementById('fName');
  const emailEl = document.getElementById('fEmail');
  const phoneEl = document.getElementById('fPhone');
  const subjectEl = document.getElementById('fSubject');
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

    const nombre = nameEl.value.trim();
    const email = emailEl.value.trim();
    const telefono = phoneEl.value.trim();
    const asunto = subjectEl.value;
    const mensaje = msgEl.value.trim();
    const tipoInput = form.querySelector('input[name="fType"]:checked');
    const tipo = tipoInput ? tipoInput.value : 'peticion';

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
    submitBtn.textContent = 'Radicando...';

    try {
      const res = await fetch(L.apiUrl('pqrs/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, asunto, nombre, email, telefono, mensaje }),
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
})();
