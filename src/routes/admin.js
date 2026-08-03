const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const auth = require('../auth');
const CATEGORIES = require('../categories');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!/^\.(jpe?g|png|webp|gif|avif)$/.test(ext)) ext = '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif, avif)'));
  },
});

const BADGES = ['Nuevo', 'Oferta', 'Sora', 'Edición limitada'];

// ---------- Autenticación ----------

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const ip = req.ip || 'unknown';
    if (auth.tooManyAttempts(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }
    const admin = await auth.ensureAdmin();
    if (username !== admin.username || !auth.verifyPassword(password || '', admin.salt, admin.hash)) {
      auth.recordAttempt(ip);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const { token } = await auth.createSession();
    res.cookie(auth.COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: auth.SESSION_TTL,
    });
    res.json({ ok: true, username: admin.username });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await auth.destroySession(auth.sessionToken(req));
    res.clearCookie(auth.COOKIE_NAME);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth.requireAuth, async (req, res, next) => {
  try {
    const admin = await auth.ensureAdmin();
    res.json({ username: admin.username });
  } catch (err) {
    next(err);
  }
});

router.post('/password', auth.requireAuth, async (req, res, next) => {
  try {
    const { current, next: newPass } = req.body || {};
    const admin = await auth.ensureAdmin();
    if (!auth.verifyPassword(current || '', admin.salt, admin.hash)) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    if (!newPass || String(newPass).length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    const { salt, hash } = auth.hashPassword(newPass);
    admin.salt = salt;
    admin.hash = hash;
    await db.saveAdmin(admin);
    await auth.destroyOtherSessions(auth.sessionToken(req));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Productos ----------

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'producto'
  );
}

function uniqueSlug(base, products, excludeId) {
  let slug = base;
  let i = 2;
  while (products.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

function validateProduct(body) {
  const errors = [];
  if (!body.name || !String(body.name).trim()) errors.push('El nombre es obligatorio');
  if (!CATEGORIES.some((c) => c.slug === body.category)) errors.push('La categoría es inválida');
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) errors.push('El precio es inválido');
  if (body.variants != null && !Array.isArray(body.variants)) {
    errors.push('Las variantes deben ser una lista');
  }
  if (Array.isArray(body.variants)) {
    body.variants.forEach((v, i) => {
      if (!v.label || !String(v.label).trim()) errors.push(`Variante ${i + 1}: falta la etiqueta`);
      const vp = Number(v.priceAbsolute);
      if (v.priceAbsolute != null && v.priceAbsolute !== '' && (!Number.isFinite(vp) || vp < 0)) {
        errors.push(`Variante ${i + 1}: precio inválido`);
      }
    });
  }
  return errors;
}

function cleanVariants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => ({
      id: v.id || crypto.randomUUID(),
      groupLabel: String(v.groupLabel || '').trim(),
      label: String(v.label || '').trim(),
      priceAbsolute:
        v.priceAbsolute != null && v.priceAbsolute !== ''
          ? Math.round(Number(v.priceAbsolute))
          : null,
      notes: String(v.notes || '').trim(),
    }))
    .filter((v) => v.label);
}

function cleanPriceRange(body, variants) {
  const prices = variants
    .map((v) => v.priceAbsolute)
    .filter((p) => p != null && p > 0);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const label = String(body.priceRangeLabel || '').trim();
  if (!min && !label) return null;
  return { min, max, label };
}

function cleanProduct(body, existing, products) {
  const now = new Date().toISOString();
  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === 'string' && /^\/(uploads|img)\/[\w./-]+$/.test(u))
    : [];
  const variants = cleanVariants(body.variants);
  const priceRange = variants.length ? cleanPriceRange(body, variants) : null;
  return {
    id: existing ? existing.id : crypto.randomUUID(),
    slug: uniqueSlug(slugify(body.name), products, existing ? existing.id : null),
    name: String(body.name).trim(),
    category: body.category,
    price: Math.round(Number(body.price)),
    oldPrice: body.oldPrice && Number(body.oldPrice) > 0 ? Math.round(Number(body.oldPrice)) : null,
    badge: BADGES.includes(body.badge) ? body.badge : null,
    shortDescription: String(body.shortDescription || '').trim(),
    description: String(body.description || '').trim(),
    features: Array.isArray(body.features)
      ? body.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 12)
      : [],
    materials: String(body.materials || '').trim(),
    dimensions: String(body.dimensions || '').trim(),
    images,
    variants,
    priceRange,
    priceRangeLabel: String(body.priceRangeLabel || '').trim(),
    featured: !!body.featured,
    active: body.active !== false,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
}

router.get('/products', auth.requireAuth, async (req, res, next) => {
  try {
    const products = await db.getProducts();
    res.json({ products, categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
});

router.post('/products', auth.requireAuth, async (req, res, next) => {
  try {
    const errors = validateProduct(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });
    const products = await db.getProducts();
    const product = cleanProduct(req.body, null, products);
    products.push(product);
    await db.saveProducts(products);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', auth.requireAuth, async (req, res, next) => {
  try {
    const products = await db.getProducts();
    const existing = products.find((p) => p.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
    const errors = validateProduct(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });
    const updated = cleanProduct(req.body, existing, products);
    const idx = products.findIndex((p) => p.id === req.params.id);
    products[idx] = updated;
    await db.saveProducts(products);
    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', auth.requireAuth, async (req, res, next) => {
  try {
    const products = await db.getProducts();
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    const remaining = products.filter((p) => p.id !== req.params.id);
    await db.saveProducts(remaining);

    const stillUsed = new Set(remaining.flatMap((p) => p.images || []));
    (product.images || [])
      .filter((u) => u.startsWith('/uploads/') && !stillUsed.has(u))
      .forEach((u) => {
        const file = path.join(UPLOAD_DIR, path.basename(u));
        fs.unlink(file, () => {});
      });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Subida de imágenes ----------

router.post('/upload', auth.requireAuth, (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen supera el máximo de 8 MB'
          : err.message || 'Error al subir la imagen';
      return res.status(400).json({ error: msg });
    }
    const files = (req.files || []).map((f) => ({ url: '/uploads/' + f.filename, name: f.originalname }));
    res.json({ files });
  });
});

// ---------- Ajustes del sitio ----------

const SETTING_KEYS = [
  'heroTitle',
  'heroSubtitle',
  'phone',
  'whatsapp',
  'email',
  'address',
  'city',
  'hours',
  'instagram',
  'facebook',
  'mapUrl',
  'aboutText',
];

router.get('/settings', auth.requireAuth, async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', auth.requireAuth, async (req, res, next) => {
  try {
    const current = await db.getSettings();
    const body = req.body || {};
    SETTING_KEYS.forEach((key) => {
      if (key in body) current[key] = String(body[key]).trim();
    });
    await db.saveSettings(current);
    res.json({ settings: current });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
