// POST /api/signup — public self-service account creation (non-admin).
// Runs regardless of whether other users exist. Signs the new user in immediately.
// To disable public signup, set env var SIGNUP_DISABLED=1 in Cloudflare Pages.

import { generateSalt, hashPassword, signJWT, setSessionCookie } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  if (env.SIGNUP_DISABLED === '1' || env.SIGNUP_DISABLED === 'true') {
    return Response.json({ error: "Public signup is disabled. Ask an admin to create your account." }, { status: 403 });
  }

  try {
    // If no users exist yet, redirect through /setup instead (that path bootstraps an admin).
    const { count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
    if (count === 0) {
      return Response.json({ error: "First-time setup required — visit /setup.html", setupNeeded: true }, { status: 409 });
    }

    const body = await request.json();
    const username = (body.username || '').trim().toLowerCase();
    const name = (body.name || '').trim() || username;
    const password = body.password || '';

    if (!/^[a-z0-9_.-]{3,32}$/i.test(username)) {
      return Response.json({ error: "Username must be 3-32 chars: letters, numbers, . _ -" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      "INSERT INTO users (username, name, password_hash, password_salt, is_admin, created_at) VALUES (?, ?, ?, ?, 0, ?) RETURNING id"
    ).bind(username, name, hash, salt, now).first();

    const jwt = await signJWT({ sub: result.id }, env.JWT_SECRET);
    return new Response(
      JSON.stringify({ ok: true, user: { id: result.id, username, name, isAdmin: false } }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': setSessionCookie(jwt) } }
    );
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return Response.json({ error: "That username is already taken" }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  const disabled = env.SIGNUP_DISABLED === '1' || env.SIGNUP_DISABLED === 'true';
  return Response.json({ signupEnabled: !disabled });
}
