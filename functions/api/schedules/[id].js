// PUT    /api/schedules/:id  — update
// DELETE /api/schedules/:id  — remove
import { getCurrentUser, unauthorized, forbidden } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const id = parseInt(context.params.id);
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });
  try {
    const body = await context.request.json();
    const owned = await context.env.DB.prepare(
      "SELECT id FROM schedules WHERE id = ? AND user_id = ?"
    ).bind(id, user.id).first();
    if (!owned) return forbidden();
    const name = (body.name || '').trim();
    const startDate = (body.start_date || '').trim();
    const duration = body.duration_days === null || body.duration_days === '' ? null : parseInt(body.duration_days);
    const weeklyMap = body.weekly_map && typeof body.weekly_map === 'object' ? body.weekly_map : {};
    await context.env.DB.prepare(
      "UPDATE schedules SET name = ?, start_date = ?, duration_days = ?, weekly_map = ?, updated_at = ? WHERE id = ?"
    ).bind(name, startDate, duration, JSON.stringify(weeklyMap), new Date().toISOString(), id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const id = parseInt(context.params.id);
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });
  const owned = await context.env.DB.prepare(
    "SELECT id FROM schedules WHERE id = ? AND user_id = ?"
  ).bind(id, user.id).first();
  if (!owned) return forbidden();
  await context.env.DB.prepare("DELETE FROM schedules WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
