const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Proxy para assets estáticos subidos (/uploads y /media) desde el backend de Django (localhost:8000)
app.use(['/uploads', '/media'], (req, res, next) => {
  const options = {
    hostname: '127.0.0.1',
    port: 8000,
    path: `${req.baseUrl}${req.url}`,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:8000' }
  };
  const proxyReq = http.request(options, (proxyRes) => {
    if (proxyRes.statusCode === 404) {
      return next(); // Fallback a archivos estáticos locales de express si no existe en Django
    }
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', () => {
    next();
  });
  req.pipe(proxyReq, { end: true });
});

// Archivos estáticos (html, css, js, imágenes, fuentes)
app.use(
  express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    setHeaders(res, filePath) {
      if (/\.(woff2|jpg|jpeg|png|webp|svg)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// API pública consumiendo Django
app.use('/api', require('./src/routes/public'));

// URLs limpias para las páginas
app.get('/catalogo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/sora', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sora.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contacto.html')));
app.get('/producto/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'producto.html')));
app.get(['/asesor', /^\/asesor\/.*/, '/asesores'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'asesor.html')));

// 404 para rutas de API desconocidas
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message || 'Error inesperado' });
});

app.listen(PORT, () => {
  console.log(`LOTTUS Web listo en http://localhost:${PORT}`);
  console.log(`Conectado al backend de Django en http://127.0.0.1:8000/api/paginaweb/`);
});
