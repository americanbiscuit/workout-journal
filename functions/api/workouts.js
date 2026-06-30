// GET  /api/workouts — list workouts for current user
// POST /api/workouts — bulk import for current user (used by localStorage migration)
//
// Admin can scope to a specific user via ?asUser=<id>
import { getCurrentUser, unauthorized, forbidden } from '../_lib/auth.js';

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
    const { results } = await context.env.DB.prepare(
      "SELECT date, category, body_weight, data, updated_at FROM workouts WHERE user_id = ? ORDER BY date DESC"
    ).bind(targetId).all();
    const workouts = results.map(r => ({
      ...JSON.parse(r.data),
      date: r.date,
      category: r.category,
      bodyWeight: r.body_weight,
      savedAt: r.updated_at,
    }));
    return Response.json({ workouts });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { error, targetId } = await resolveTargetUser(context);
  if (error) return error;
  try {
    const body = await context.request.json();
    if (!body.workouts || !Array.isArray(body.workouts)) {
      return Response.json({ error: "Missing 'workouts' array" }, { status: 400 });
    }
    const now = new Date().toISOString();
    let count = 0;
    for (const w of body.workouts) {
      if (!w.date || !w.category) continue;
      await context.env.DB.prepare(
        "INSERT OR REPLACE INTO workouts (date, category, body_weight, data, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(w.date, w.category, w.bodyWeight ?? null, JSON.stringify(w), w.savedAt || now, targetId).run();
      count++;
    }
    return Response.json({ imported: count });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
