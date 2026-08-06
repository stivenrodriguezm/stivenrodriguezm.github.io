/**
 * LOTTUS · Bio Link Interactive Controller
 * Lightweight, high-performance vanilla JS
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const CONFIG = {
    phone: '573001234567',
    defaultMsg: 'Hola LOTTUS, deseo cotizar un proyecto de muebles a medida.',
    siteUrl: window.location.href
  };

  const mainWaBtn = document.getElementById('mainWaBtn');
  const waBtnSub = document.getElementById('waBtnSub');
  const presetPills = document.getElementById('presetPills');
  const shareBtn = document.getElementById('shareBtn');
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModal = document.getElementById('closeQrModal');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const qrCanvas = document.getElementById('qrCanvas');

  function buildWaLink(messageText) {
    const cleanPhone = CONFIG.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(messageText);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  if (presetPills && mainWaBtn) {
    const buttons = presetPills.querySelectorAll('.preset-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedMsg = btn.getAttribute('data-msg') || CONFIG.defaultMsg;
        mainWaBtn.href = buildWaLink(selectedMsg);

        const cleanTitle = btn.textContent.trim().replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]\s*/u, '');
        if (waBtnSub) {
          waBtnSub.textContent = `${cleanTitle} (Respuesta inmediata)`;
        }

        mainWaBtn.style.transform = 'scale(1.02)';
        setTimeout(() => {
          mainWaBtn.style.transform = '';
        }, 150);
      });
    });
  }

  let toastTimer;
  function showToast(message) {
    if (toastMsg) toastMsg.textContent = message;
    if (toast) {
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: 'LOTTUS · Muebles de Alta Gama',
        text: 'Diseño y fabricación artesanal de muebles de lujo en Bogotá.',
        url: window.location.href
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
        }
      } else {
        copyToClipboard(window.location.href, 'Enlace de Bio copiado al portapapeles');
      }
    });
  }

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
      }).catch(() => {
        fallbackCopyText(text, successMessage);
      });
    } else {
      fallbackCopyText(text, successMessage);
    }
  }

  function fallbackCopyText(text, successMessage) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast(successMessage);
    } catch (e) {
      showToast('Error al copiar el enlace');
    }
    document.body.removeChild(input);
  }

  let qrGenerated = false;
  function renderQrCode() {
    if (qrGenerated) return;
    
    if (typeof QRious !== 'undefined' && qrCanvas) {
      new QRious({
        element: qrCanvas,
        value: window.location.href,
        size: 220,
        background: '#ffffff',
        foreground: '#0b0c0d',
        level: 'H'
      });
      qrGenerated = true;
    } else if (qrCanvas) {
      drawFallbackQR(qrCanvas, window.location.href);
      qrGenerated = true;
    }
  }

  function drawFallbackQR(canvas, text) {
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);

    ctx.fillStyle = '#0b0c0d';
    drawSquare(ctx, 10, 10, 50);
    drawSquare(ctx, 140, 10, 50);
    drawSquare(ctx, 10, 140, 50);

    let hash = 0;
    for (let i = 0; i < text.length; i++) hash += text.charCodeAt(i);

    for (let x = 10; x < 190; x += 10) {
      for (let y = 10; y < 190; y += 10) {
        if ((x < 70 && y < 70) || (x > 130 && y < 70) || (x < 70 && y > 130)) continue;
        if ((x + y + hash) % 3 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }
  }

  function drawSquare(ctx, x, y, size) {
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
    ctx.fillStyle = '#0b0c0d';
    ctx.fillRect(x + 12, y + 12, size - 24, size - 24);
  }

  if (qrBtn && qrModal) {
    qrBtn.addEventListener('click', () => {
      renderQrCode();
      qrModal.classList.add('open');
      qrModal.setAttribute('aria-hidden', 'false');
    });
  }

  if (closeQrModal && qrModal) {
    closeQrModal.addEventListener('click', () => {
      qrModal.classList.remove('open');
      qrModal.setAttribute('aria-hidden', 'true');
    });

    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.remove('open');
        qrModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  const cards = document.querySelectorAll('.link-card, .wa-preset-section');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + index * 80);
  });
});
