// GET  /api/custom-exercises — list current user's added exercises
// POST /api/custom-exercises { name, category, phase, focus_note? } — add
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const { results } = await context.env.DB.prepare(
    "SELECT id, name, category, phase, focus_note, created_at FROM custom_exercises WHERE user_id = ? ORDER BY name"
  ).bind(user.id).all();
  return Response.json({ exercises: results });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { name, category, phase, focus_note } = await context.request.json();
    if (!name || !category || !phase) {
      return Response.json({ error: "name, category, phase required" }, { status: 400 });
    }
    if (!['am', 'pm'].includes(phase)) {
      return Response.json({ error: "phase must be 'am' or 'pm'" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "INSERT INTO custom_exercises (user_id, name, category, phase, focus_note, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(user.id, name.trim(), category, phase, focus_note?.trim() || null, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return Response.json({ error: "You've already added an exercise with that name" }, { status: 409 });
    return Response.json({ error: e.message }, { status: 500 });
  }
}
