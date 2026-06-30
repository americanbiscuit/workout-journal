// GET /api/exercise-notes/:name — fetch user's custom notes for an exercise
// PUT /api/exercise-notes/:name { youtube_url, custom_notes } — upsert
import { getCurrentUser, unauthorized } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const name = decodeURIComponent(context.params.name);
  const row = await context.env.DB.prepare(
    "SELECT youtube_url, custom_notes FROM exercise_notes WHERE user_id = ? AND exercise_name = ?"
  ).bind(user.id, name).first();
  return Response.json({
    youtube_url: row?.youtube_url || null,
    custom_notes: row?.custom_notes || null,
  });
}

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const name = decodeURIComponent(context.params.name);
    const { youtube_url, custom_notes } = await context.request.json();
    const now = new Date().toISOString();
    // If both empty, just delete the row
    if (!youtube_url && !custom_notes) {
      await context.env.DB.prepare(
        "DELETE FROM exercise_notes WHERE user_id = ? AND exercise_name = ?"
      ).bind(user.id, name).run();
    } else {
      await context.env.DB.prepare(
        "INSERT OR REPLACE INTO exercise_notes (user_id, exercise_name, youtube_url, custom_notes, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(user.id, name, youtube_url || null, custom_notes || null, now).run();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
