// GET  /api/suggestions      — admin: list ALL; user: list only their own
// POST /api/suggestions      — any authenticated user submits { text }
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const rows = user.isAdmin
    ? await context.env.DB.prepare(`
        SELECT s.id, s.user_id, s.text, s.status, s.admin_note, s.created_at, s.updated_at,
               u.username, u.name AS user_name
        FROM suggestions s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.created_at DESC
      `).all()
    : await context.env.DB.prepare(`
        SELECT id, user_id, text, status, admin_note, created_at, updated_at
        FROM suggestions
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).bind(user.id).all();
  return Response.json({ suggestions: rows.results || [] });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { text } = await context.request.json();
    const trimmed = (text || '').trim();
    if (!trimmed) return Response.json({ error: 'Suggestion is empty' }, { status: 400 });
    if (trimmed.length > 4000) return Response.json({ error: 'Suggestion too long (max 4000 chars)' }, { status: 400 });
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "INSERT INTO suggestions (user_id, text, status, created_at, updated_at) VALUES (?, ?, 'new', ?, ?) RETURNING id"
    ).bind(user.id, trimmed, now, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
