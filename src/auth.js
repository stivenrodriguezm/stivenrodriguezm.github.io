const crypto = require('crypto');
const db = require('./db');

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 días
const COOKIE_NAME = 'lottus_session';

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// Crea el usuario admin por defecto si no existe (admin / lottus2024)
async function ensureAdmin() {
  let admin = await db.getAdmin();
  if (!admin) {
    const { salt, hash } = hashPassword('lottus2024');
    admin = { username: 'admin', salt, hash, sessions: [] };
    await db.saveAdmin(admin);
  }
  if (!Array.isArray(admin.sessions)) admin.sessions = [];
  return admin;
}

async function createSession() {
  const admin = await ensureAdmin();
  const token = crypto.randomBytes(32).toString('hex');
  const exp = Date.now() + SESSION_TTL;
  admin.sessions = admin.sessions.filter((s) => s.exp > Date.now());
  admin.sessions.push({ token, exp });
  await db.saveAdmin(admin);
  return { token, exp };
}

async function validateSession(token) {
  if (!token) return false;
  const admin = await ensureAdmin();
  return admin.sessions.some((s) => s.token === token && s.exp > Date.now());
}

async function destroySession(token) {
  const admin = await ensureAdmin();
  admin.sessions = admin.sessions.filter((s) => s.token !== token);
  await db.saveAdmin(admin);
}

async function destroyOtherSessions(keepToken) {
  const admin = await ensureAdmin();
  admin.sessions = admin.sessions.filter((s) => s.token === keepToken);
  await db.saveAdmin(admin);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function sessionToken(req) {
  return parseCookies(req)[COOKIE_NAME];
}

async function requireAuth(req, res, next) {
  try {
    const isValid = await validateSession(sessionToken(req));
    if (isValid) return next();
    return res.status(401).json({ error: 'No autorizado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error de autenticación' });
  }
}

// Limitación de intentos de login en memoria (10 intentos / 15 min por IP)
const attempts = new Map();

function tooManyAttempts(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.reset) return false;
  return rec.count >= 10;
}

function recordAttempt(key) {
  const now = Date.now();
  let rec = attempts.get(key);
  if (!rec || now > rec.reset) rec = { count: 0, reset: now + 15 * 60 * 1000 };
  rec.count += 1;
  attempts.set(key, rec);
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL,
  hashPassword,
  verifyPassword,
  ensureAdmin,
  createSession,
  validateSession,
  destroySession,
  destroyOtherSessions,
  parseCookies,
  sessionToken,
  requireAuth,
  tooManyAttempts,
  recordAttempt,
};
