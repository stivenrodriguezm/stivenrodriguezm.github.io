const express = require('express');
const http = require('http');

const router = express.Router();
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000/api/paginaweb';

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            return reject({ status: res.statusCode, message: data });
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

// GET /api/products?category=&q=&featured=1&sort=price-asc|price-desc|new
router.get('/products', async (req, res, next) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${BACKEND_URL}/products/${queryString ? '?' + queryString : ''}`;
    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    console.error('Error fetching products from Django:', err);
    res.status(err.status || 500).json({ error: 'Error al conectar con el catálogo' });
  }
});

// GET /api/products/:slug  (acepta slug o id)
router.get('/products/:slug', async (req, res, next) => {
  try {
    const url = `${BACKEND_URL}/products/${encodeURIComponent(req.params.slug)}/`;
    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    console.error('Error fetching product detail from Django:', err);
    res.status(err.status || 500).json({ error: 'Error al conectar con el detalle del producto' });
  }
});

// GET /api/settings — configuración pública del sitio
router.get('/settings', async (req, res, next) => {
  try {
    const url = `${BACKEND_URL}/settings/`;
    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    console.error('Error fetching settings from Django:', err);
    res.status(err.status || 500).json({ error: 'Error al cargar configuraciones' });
  }
});

// GET /api/asesores — tarjetas digitales públicas (asesores habilitados por un admin)
router.get('/asesores', async (req, res) => {
  try {
    const data = await fetchJson(`${BACKEND_URL}/asesores/`);
    res.json(data);
  } catch (err) {
    console.error('Error fetching asesores from Django:', err);
    res.status(err.status || 500).json({ error: 'Error al cargar los asesores' });
  }
});

// GET /api/asesores/:slug — perfil público de un asesor (tarjeta digital)
router.get('/asesores/:slug', async (req, res) => {
  try {
    const url = `${BACKEND_URL}/asesores/${encodeURIComponent(req.params.slug)}/`;
    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'Asesor no encontrado' });
    }
    console.error('Error fetching asesor detail from Django:', err);
    res.status(err.status || 500).json({ error: 'Error al cargar el asesor' });
  }
});

// GET /api/asesores/:slug/qr.png — proxy binario del QR real generado por Django
router.get('/asesores/:slug/qr.png', (req, res) => {
  const url = `${BACKEND_URL}/asesores/${encodeURIComponent(req.params.slug)}/qr.png`;
  http
    .get(url, (upstream) => {
      if (upstream.statusCode !== 200) {
        upstream.resume();
        return res.status(upstream.statusCode === 404 ? 404 : 502).json({ error: 'QR no disponible' });
      }
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/png');
      res.setHeader('Cache-Control', upstream.headers['cache-control'] || 'public, max-age=3600');
      upstream.pipe(res);
    })
    .on('error', () => res.status(502).json({ error: 'Error al conectar con el generador de QR' }));
});

module.exports = router;
