const express = require('express');
const db = require('../db');
const CATEGORIES = require('../categories');

const router = express.Router();

// GET /api/products?category=&q=&featured=1&sort=price-asc|price-desc|new
router.get('/products', async (req, res, next) => {
  try {
    let products = (await db.getProducts()).filter((p) => p.active !== false);
    const { category, q, featured, sort } = req.query;

    if (category) products = products.filter((p) => p.category === category);
    if (featured === '1') products = products.filter((p) => p.featured);
    if (q) {
      const needle = String(q).toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.shortDescription || '').toLowerCase().includes(needle) ||
          (p.description || '').toLowerCase().includes(needle)
      );
    }

    if (sort === 'price-asc') products = [...products].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') products = [...products].sort((a, b) => b.price - a.price);
    else if (sort === 'new') products = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else products = [...products].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    res.json({ products, categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug  (acepta slug o id)
router.get('/products/:slug', async (req, res, next) => {
  try {
    const products = (await db.getProducts()).filter((p) => p.active !== false);
    const product = products.find((p) => p.slug === req.params.slug || p.id === req.params.slug);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    const related = products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
    res.json({ product, related, categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings — configuración pública del sitio
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings, categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
