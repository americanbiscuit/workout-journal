// GET  /api/exercise-prefs — list current user's prefs ({ favorites: [], hidden: [] })
// POST /api/exercise-prefs { name, status } — set ('favorite'|'hidden'|null)
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const { results } = await context.env.DB.prepare(
    "SELECT exercise_name, status FROM exercise_prefs WHERE user_id = ?"
  ).bind(user.id).all();
  const favorites = [], hidden = [];
  results.forEach(r => (r.status === 'favorite' ? favorites : hidden).push(r.exercise_name));
  return Response.json({ favorites, hidden });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { name, status } = await context.request.json();
    if (!name) return Response.json({ error: "Missing name" }, { status: 400 });
    const now = new Date().toISOString();
    if (!status || status === 'none' || status === null) {
      // Remove
      await context.env.DB.prepare(
        "DELETE FROM exercise_prefs WHERE user_id = ? AND exercise_name = ?"
      ).bind(user.id, name).run();
    } else if (status === 'favorite' || status === 'hidden') {
      await context.env.DB.prepare(
        "INSERT OR REPLACE INTO exercise_prefs (user_id, exercise_name, status, updated_at) VALUES (?, ?, ?, ?)"
      ).bind(user.id, name, status, now).run();
    } else {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
