# LOTTUS — Sitio web catálogo + panel administrativo

Sitio web completo de **LOTTUS**, muebles de alta gama en Bogotá: catálogo digital con detalle de cada pieza y panel administrativo para gestionar productos, imágenes, precios y textos del sitio.

## Cómo ejecutar

```bash
npm install
npm start
```

- Sitio público: http://localhost:3000
- Panel administrativo: http://localhost:3000/admin
  - Usuario: `admin`
  - Contraseña: `lottus2024` (cámbiala desde el panel, sección **Contraseña**)

Para usar otro puerto: `PORT=8080 npm start`.

## Qué incluye

**Sitio público**
- Home oscuro de lujo: hero animado con el wordmark LOTTUS en Audiowide, marquee de categorías, mosaico de colecciones, piezas destacadas (carrusel), sección Sora, historia con contadores, testimonios y CTA al showroom.
- Catálogo con filtros por categoría (Salas, Alcobas, Comedores, Complementos, Decoración, Colchones Sora), búsqueda y orden por precio/fecha. URL compartible (`/catalogo?categoria=salas`).
- Página de detalle por producto: galería con miniaturas, precio en COP, características, materiales, dimensiones, botón de WhatsApp con mensaje prellenado y piezas relacionadas.
- Contacto: formulario que abre WhatsApp o correo, datos del showroom y mapa embebido.
- Botón flotante de WhatsApp en todas las páginas.

**Panel administrativo** (`/admin`)
- CRUD completo de productos: nombre, categoría, precio, precio anterior (oferta), badge, descripciones, características dinámicas, materiales, dimensiones, destacado/activo.
- Gestión de imágenes: subida múltiple con arrastrar y soltar, imagen principal, reordenar y eliminar.
- Ajustes del sitio: textos del hero, teléfono, WhatsApp, correo, dirección, horarios, redes sociales, URL del mapa y texto de "Nosotros".
- Cambio de contraseña. Sesiones de 7 días con cookie HttpOnly.

## Estructura

```
server.js              → servidor Express
src/
  db.js                → persistencia en archivos JSON (escritura atómica)
  auth.js              → login, sesiones y hash scrypt
  categories.js        → categorías fijas del catálogo
  routes/public.js     → API pública
  routes/admin.js      → API del panel (protegida)
data/
  products.json        → catálogo (editable desde el panel)
  settings.json        → textos y datos de contacto (editable desde el panel)
  admin.json           → credenciales (se crea sola al primer arranque)
public/
  index.html, catalogo.html, producto.html, contacto.html, admin.html
  css/, js/, fonts/, img/seed/, uploads/
```

## Notas

- Las fotos actuales son de referencia (descargadas de Unsplash). Reemplázalas desde el panel subiendo las fotos propias de cada producto; se guardan en `public/uploads/`.
- Las imágenes subidas que deje de usar un producto eliminado se borran automáticamente.
- Los datos viven en `data/*.json`: respaldar el sitio es copiar `data/` + `public/uploads/`.
- No requiere base de datos ni servicios externos.
# lottusWeb
