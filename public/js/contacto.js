/* LOTTUS — Contacto: el formulario abre WhatsApp o el cliente de correo */
(function () {
  'use strict';
  const L = window.LOTTUS;

  const form = document.getElementById('contactForm');
  const errorEl = document.getElementById('formError');
  const nameEl = document.getElementById('fName');
  const contactEl = document.getElementById('fContact');
  const subjectEl = document.getElementById('fSubject');
  const msgEl = document.getElementById('fMsg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const channel = e.submitter ? e.submitter.dataset.channel : 'whatsapp';

    const name = nameEl.value.trim();
    const contact = contactEl.value.trim();
    const subject = subjectEl.value;
    const msg = msgEl.value.trim();

    if (!name || !contact || !msg) {
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';

    const text = `Hola LOTTUS, soy ${name}.\nAsunto: ${subject}\n${msg}\n(Mi contacto: ${contact})`;

    if (channel === 'email') {
      const email = (L.settings && L.settings.email) || 'ventas@lottus.com.co';
      const url =
        'mailto:' + email +
        '?subject=' + encodeURIComponent('[Web LOTTUS] ' + subject + ' — ' + name) +
        '&body=' + encodeURIComponent(text);
      window.location.href = url;
    } else {
      window.open(L.waLink(L.settings || {}, text), '_blank', 'noopener');
    }
  });
})();
