// POST /api/routine-schedules { day_of_week, routine_id }
// DELETE /api/routine-schedules?day=N — unschedule a day
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const { day_of_week, routine_id } = await context.request.json();
    if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
      return Response.json({ error: "day_of_week must be 0-6" }, { status: 400 });
    }
    if (!routine_id) {
      return Response.json({ error: "routine_id required" }, { status: 400 });
    }
    await context.env.DB.prepare(
      "INSERT OR REPLACE INTO routine_schedules (user_id, day_of_week, routine_id) VALUES (?, ?, ?)"
    ).bind(user.id, day_of_week, routine_id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const url = new URL(context.request.url);
    const day = parseInt(url.searchParams.get('day'));
    if (isNaN(day)) return Response.json({ error: "day query param required" }, { status: 400 });
    await context.env.DB.prepare(
      "DELETE FROM routine_schedules WHERE user_id = ? AND day_of_week = ?"
    ).bind(user.id, day).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
