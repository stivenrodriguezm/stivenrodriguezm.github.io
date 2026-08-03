const pool = require('./mysql_db');
const fs = require('fs');
const path = require('path');

let isInitialized = false;

async function initDb() {
  if (isInitialized) return;
  try {
    // 1. Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(100),
        price DECIMAL(12,2) DEFAULT 0,
        old_price DECIMAL(12,2) DEFAULT NULL,
        price_range JSON DEFAULT NULL,
        variants JSON DEFAULT NULL,
        badge VARCHAR(100) DEFAULT NULL,
        short_description TEXT,
        description LONGTEXT,
        materials TEXT,
        dimensions TEXT,
        features JSON DEFAULT NULL,
        images JSON DEFAULT NULL,
        featured TINYINT(1) DEFAULT 0,
        active TINYINT(1) DEFAULT 1,
        created_at VARCHAR(100),
        updated_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY DEFAULT 1,
        username VARCHAR(100) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        hash VARCHAR(255) NOT NULL,
        sessions JSON DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Migrar automáticamente datos de prueba iniciales si la BD está vacía
    const dataDir = path.join(__dirname, '../data');

    const [pRows] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (pRows[0].count === 0 && fs.existsSync(path.join(dataDir, 'products.json'))) {
      try {
        const jsonProducts = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf8'));
        if (Array.isArray(jsonProducts)) {
          for (const p of jsonProducts) {
            await saveSingleProduct(p);
          }
          console.log(`[MySQL DB] Se migró el catálogo de (${jsonProducts.length} productos) desde products.json a MySQL.`);
        }
      } catch (e) {
        console.error('[MySQL DB] Error migrando products.json:', e.message);
      }
    }

    const [sRows] = await pool.query('SELECT COUNT(*) as count FROM settings');
    if (sRows[0].count === 0 && fs.existsSync(path.join(dataDir, 'settings.json'))) {
      try {
        const jsonSettings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'));
        if (jsonSettings && typeof jsonSettings === 'object') {
          await saveSettings(jsonSettings);
          console.log('[MySQL DB] Se migraron los ajustes del sitio a MySQL.');
        }
      } catch (e) {
        console.error('[MySQL DB] Error migrando settings.json:', e.message);
      }
    }

    const [aRows] = await pool.query('SELECT COUNT(*) as count FROM admin');
    if (aRows[0].count === 0 && fs.existsSync(path.join(dataDir, 'admin.json'))) {
      try {
        const jsonAdmin = JSON.parse(fs.readFileSync(path.join(dataDir, 'admin.json'), 'utf8'));
        if (jsonAdmin && jsonAdmin.username) {
          await saveAdmin(jsonAdmin);
          console.log('[MySQL DB] Se migró la cuenta admin a MySQL.');
        }
      } catch (e) {
        console.error('[MySQL DB] Error migrando admin.json:', e.message);
      }
    }

    isInitialized = true;
  } catch (err) {
    console.error('[MySQL DB] Error inicializando tablas MySQL:', err.message);
  }
}

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

function mapProductFromRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    category: row.category,
    price: Number(row.price || 0),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    priceRange: parseJson(row.price_range, null),
    variants: parseJson(row.variants, []),
    badge: row.badge || null,
    shortDescription: row.short_description || '',
    description: row.description || '',
    materials: row.materials || '',
    dimensions: row.dimensions || '',
    features: parseJson(row.features, []),
    images: parseJson(row.images, []),
    featured: Boolean(row.featured),
    active: row.active !== 0 && row.active !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

async function saveSingleProduct(p) {
  const query = `
    INSERT INTO products (
      id, name, slug, category, price, old_price, price_range, variants,
      badge, short_description, description, materials, dimensions, features, images,
      featured, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      slug = VALUES(slug),
      category = VALUES(category),
      price = VALUES(price),
      old_price = VALUES(old_price),
      price_range = VALUES(price_range),
      variants = VALUES(variants),
      badge = VALUES(badge),
      short_description = VALUES(short_description),
      description = VALUES(description),
      materials = VALUES(materials),
      dimensions = VALUES(dimensions),
      features = VALUES(features),
      images = VALUES(images),
      featured = VALUES(featured),
      active = VALUES(active),
      updated_at = VALUES(updated_at);
  `;

  const values = [
    String(p.id),
    p.name,
    p.slug,
    p.category,
    p.price || 0,
    p.oldPrice != null ? p.oldPrice : null,
    p.priceRange ? JSON.stringify(p.priceRange) : null,
    p.variants ? JSON.stringify(p.variants) : JSON.stringify([]),
    p.badge || null,
    p.shortDescription || '',
    p.description || '',
    p.materials || '',
    p.dimensions || '',
    p.features ? JSON.stringify(p.features) : JSON.stringify([]),
    p.images ? JSON.stringify(p.images) : JSON.stringify([]),
    p.featured ? 1 : 0,
    p.active !== false ? 1 : 0,
    p.createdAt || new Date().toISOString(),
    p.updatedAt || new Date().toISOString(),
  ];

  await pool.query(query, values);
}

async function getProducts() {
  await initDb();
  const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
  return rows.map(mapProductFromRow);
}

async function saveProducts(products) {
  await initDb();
  if (!Array.isArray(products)) return;

  const [rows] = await pool.query('SELECT id FROM products');
  const existingIds = new Set(rows.map((r) => String(r.id)));
  const newIds = new Set(products.map((p) => String(p.id)));

  for (const oldId of existingIds) {
    if (!newIds.has(oldId)) {
      await pool.query('DELETE FROM products WHERE id = ?', [oldId]);
    }
  }

  for (const p of products) {
    await saveSingleProduct(p);
  }
}

async function getSettings() {
  await initDb();
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const settings = {};
  rows.forEach((r) => {
    settings[r.key] = parseJson(r.value, r.value);
  });
  return settings;
}

async function saveSettings(settings) {
  await initDb();
  if (!settings || typeof settings !== 'object') return;
  for (const [key, val] of Object.entries(settings)) {
    const serialized = typeof val === 'object' ? JSON.stringify(val) : String(val);
    await pool.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, serialized]
    );
  }
}

async function getAdmin() {
  await initDb();
  const [rows] = await pool.query('SELECT username, salt, hash, sessions FROM admin WHERE id = 1');
  if (!rows || !rows.length) return null;
  const row = rows[0];
  const sessions = parseJson(row.sessions, []);
  return {
    username: row.username,
    salt: row.salt,
    hash: row.hash,
    sessions: Array.isArray(sessions) ? sessions : [],
  };
}

async function saveAdmin(admin) {
  await initDb();
  if (!admin) return;
  const sessions = JSON.stringify(Array.isArray(admin.sessions) ? admin.sessions : []);
  await pool.query(
    `INSERT INTO admin (id, username, salt, hash, sessions)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       salt = VALUES(salt),
       hash = VALUES(hash),
       sessions = VALUES(sessions)`,
    [admin.username, admin.salt, admin.hash, sessions]
  );
}

module.exports = {
  initDb,
  getProducts,
  saveProducts,
  getSettings,
  saveSettings,
  getAdmin,
  saveAdmin,
};
