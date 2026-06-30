// POST /api/setup — one-time admin account creation
// Only works when there are zero users. After that, all account creation goes through /admin.

import { generateSalt, hashPassword, signJWT, setSessionCookie } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const { count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
    if (count > 0) {
      return Response.json({ error: "Setup already complete. Use the login page." }, { status: 403 });
    }
    const { username, password, name } = await request.json();
    if (!username || !password || password.length < 8) {
      return Response.json({ error: "Need username and password (8+ chars)" }, { status: 400 });
    }
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      "INSERT INTO users (username, name, password_hash, password_salt, is_admin, created_at) VALUES (?, ?, ?, ?, 1, ?) RETURNING id"
    ).bind(username, name || username, hash, salt, now).first();
    // Also assign any existing un-owned workouts to this admin so they don't get orphaned
    await env.DB.prepare("UPDATE workouts SET user_id = ? WHERE user_id IS NULL").bind(result.id).run();
    // Sign them in
    const jwt = await signJWT({ sub: result.id }, env.JWT_SECRET);
    return new Response(JSON.stringify({ ok: true, user: { id: result.id, username, name: name || username, isAdmin: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': setSessionCookie(jwt) }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
    return Response.json({ setupNeeded: count === 0 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
