// PUT    /api/routines/:id — update routine
// DELETE /api/routines/:id — delete routine (+ its schedules)
import { getCurrentUser, unauthorized } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { name, category, am_exercises, metcon_exercises } = await context.request.json();
    const data = { am_exercises: am_exercises || [], metcon_exercises: metcon_exercises || [] };
    const now = new Date().toISOString();
    await context.env.DB.prepare(
      "UPDATE routines SET name = ?, category = ?, data = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    ).bind(name, category || null, JSON.stringify(data), now, context.params.id, user.id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    await context.env.DB.prepare("DELETE FROM routine_schedules WHERE routine_id = ? AND user_id = ?").bind(context.params.id, user.id).run();
    await context.env.DB.prepare("DELETE FROM routines WHERE id = ? AND user_id = ?").bind(context.params.id, user.id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
