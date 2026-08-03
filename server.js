const express = require('express');
const path = require('path');
const auth = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Archivos estáticos (html, css, js, imágenes, fuentes)
app.use(
  express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    setHeaders(res, filePath) {
      // Cache agresivo solo para assets que no cambian (fuentes, imágenes seed)
      if (/\.(woff2|jpg|jpeg|png|webp|svg)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// API
app.use('/api', require('./src/routes/public'));
app.use('/api/admin', require('./src/routes/admin'));

// URLs limpias para las páginas
app.get('/catalogo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/sora', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sora.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contacto.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/producto/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'producto.html')));

// 404 para rutas de API desconocidas
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message || 'Error inesperado' });
});

auth.ensureAdmin().catch((err) => console.error('[MySQL Init Error]', err.message));
app.listen(PORT, () => {
  console.log(`LOTTUS listo en http://localhost:${PORT}`);
  console.log(`Panel administrativo: http://localhost:${PORT}/admin`);
});
