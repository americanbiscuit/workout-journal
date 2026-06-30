// GET  /api/routines — list current user's routines (+ scheduled day-of-week assignments)
// POST /api/routines { name, category?, data } — create
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const { results } = await context.env.DB.prepare(
    "SELECT id, name, category, data, created_at, updated_at FROM routines WHERE user_id = ? ORDER BY name"
  ).bind(user.id).all();
  const { results: scheds } = await context.env.DB.prepare(
    "SELECT day_of_week, routine_id FROM routine_schedules WHERE user_id = ?"
  ).bind(user.id).all();
  const byRoutine = {};
  scheds.forEach(s => {
    if (!byRoutine[s.routine_id]) byRoutine[s.routine_id] = [];
    byRoutine[s.routine_id].push(s.day_of_week);
  });
  const routines = results.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    ...JSON.parse(r.data),
    scheduledDays: byRoutine[r.id] || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return Response.json({ routines });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { name, category, am_exercises, metcon_exercises } = await context.request.json();
    if (!name) return Response.json({ error: "Name required" }, { status: 400 });
    const data = { am_exercises: am_exercises || [], metcon_exercises: metcon_exercises || [] };
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "INSERT INTO routines (user_id, name, category, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(user.id, name, category || null, JSON.stringify(data), now, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
