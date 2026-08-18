# LOTTUS — Sitio web catálogo

Sitio web público de **LOTTUS**, muebles de alta gama en Bogotá: catálogo digital con detalle de cada pieza. La gestión de productos y configuración del sitio se hace desde el ERP (`ordenesPedidoSW`), no desde este repositorio.

## Cómo ejecutar

```bash
npm install
npm start
```

- Sitio público: http://localhost:3000

Para usar otro puerto: `PORT=8080 npm start`.

## Qué incluye

- Home oscuro de lujo: hero animado con el wordmark LOTTUS en Audiowide, marquee de categorías, mosaico de colecciones, piezas destacadas (carrusel), sección Sora, historia con contadores, testimonios y CTA al showroom.
- Catálogo con filtros por categoría (Salas, Alcobas, Comedores, Complementos, Decoración, Colchones Sora), búsqueda y orden por precio/fecha. URL compartible (`/catalogo?categoria=salas`).
- Página de detalle por producto: galería con miniaturas, precio en COP, características, materiales, dimensiones, botón de WhatsApp con mensaje prellenado y piezas relacionadas.
- Contacto: formulario de PQRS y datos de los showrooms.
- Botón flotante de WhatsApp en todas las páginas.

## Estructura

```
server.js              → servidor Express (proxy hacia la API Django)
src/
  routes/public.js     → API pública (proxy a /api/paginaweb del backend Django)
public/
  index.html, catalogo.html, producto.html, contacto.html, sora.html, bio.html
  css/, js/, fonts/, img/seed/, uploads/
.github/workflows/gh-pages.yml → publica public/ en GitHub Pages en cada push a main
```

## Notas

- Los productos, imágenes y textos del sitio (settings) se gestionan desde el backend Django (`ordenesPedidoSWBackend`, app `paginaweb`) y su ERP (`ordenesPedidoSW`).
- Un push a `main` dispara el workflow de GitHub Actions que publica `public/` en GitHub Pages.
