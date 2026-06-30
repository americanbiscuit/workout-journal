// POST /api/login { username, password }
import { verifyPassword, signJWT, setSessionCookie } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 });
    }
    const row = await env.DB.prepare(
      "SELECT id, username, name, password_hash, password_salt, is_admin, disabled FROM users WHERE username = ?"
    ).bind(username).first();
    if (!row || row.disabled) {
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const ok = await verifyPassword(password, row.password_salt, row.password_hash);
    if (!ok) {
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const jwt = await signJWT({ sub: row.id }, env.JWT_SECRET);
    return new Response(JSON.stringify({
      ok: true,
      user: { id: row.id, username: row.username, name: row.name, isAdmin: !!row.is_admin }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': setSessionCookie(jwt) }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
