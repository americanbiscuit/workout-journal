// Shared auth helpers: password hashing (PBKDF2), JWT signing/verifying, cookie utils.
// Uses native crypto.subtle — no npm dependencies.

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64UrlToBuf(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const norm = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

// ---- Password hashing (PBKDF2-SHA256, 100K iterations) ----
export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bufToB64Url(bits);
}
export async function verifyPassword(password, salt, expectedHash) {
  const h = await hashPassword(password, salt);
  // Constant-time compare
  if (h.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

// ---- JWT (HS256) ----
async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}
export async function signJWT(payload, secret, expSec = 60 * 60 * 24 * 30) { // 30 days
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + expSec };
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB = bufToB64Url(enc.encode(JSON.stringify(header)));
  const payloadB = bufToB64Url(enc.encode(JSON.stringify(full)));
  const data = `${headerB}.${payloadB}`;
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${bufToB64Url(sig)}`;
}
export async function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const key = await getHmacKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, b64UrlToBuf(s), enc.encode(`${h}.${p}`));
  if (!ok) return null;
  let payload;
  try { payload = JSON.parse(dec.decode(b64UrlToBuf(p))); }
  catch { return null; }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---- Cookie helpers ----
export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}
export function setSessionCookie(token) {
  // 30 days, HttpOnly, Secure, SameSite=Lax (so it works when user follows a link)
  return `session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}
export function clearSessionCookie() {
  return `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// ---- Get current user from request cookie ----
export async function getCurrentUser(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies.session;
  if (!token || !env.JWT_SECRET) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload?.sub) return null;
  const row = await env.DB.prepare(
    "SELECT id, username, name, is_admin, disabled FROM users WHERE id = ?"
  ).bind(payload.sub).first();
  if (!row || row.disabled) return null;
  return { id: row.id, username: row.username, name: row.name, isAdmin: !!row.is_admin };
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { 'Content-Type': 'application/json' }
  });
}
export function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { 'Content-Type': 'application/json' }
  });
}
