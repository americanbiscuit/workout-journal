// GET    /api/workouts/:date — fetch one (current user, or ?asUser= for admin)
// PUT    /api/workouts/:date — upsert
// DELETE /api/workouts/:date — delete
import { getCurrentUser, unauthorized, forbidden } from '../../_lib/auth.js';

async function resolveTargetUser(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return { error: unauthorized() };
  const url = new URL(context.request.url);
  const asUser = url.searchParams.get('asUser');
  if (asUser) {
    if (!user.isAdmin) return { error: forbidden() };
    return { user, targetId: parseInt(asUser) };
  }
  return { user, targetId: user.id };
}

export async function onRequestGet(context) {
  const { error, targetId } = await resolveTargetUser(context);
  if (error) return error;
  try {
    const row = await context.env.DB.prepare(
      "SELECT date, category, body_weight, data, updated_at FROM workouts WHERE date = ? AND user_id = ?"
    ).bind(context.params.date, targetId).first();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      ...JSON.parse(row.data),
      date: row.date, category: row.category,
      bodyWeight: row.body_weight, savedAt: row.updated_at,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { error, targetId } = await resolveTargetUser(context);
  if (error) return error;
  try {
    const body = await context.request.json();
    const now = new Date().toISOString();
    await context.env.DB.prepare(
      "INSERT OR REPLACE INTO workouts (date, category, body_weight, data, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(context.params.date, body.category || "Abs", body.bodyWeight ?? null, JSON.stringify(body), now, targetId).run();
    return Response.json({ ok: true, savedAt: now });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { error, targetId } = await resolveTargetUser(context);
  if (error) return error;
  try {
    await context.env.DB.prepare(
      "DELETE FROM workouts WHERE date = ? AND user_id = ?"
    ).bind(context.params.date, targetId).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
