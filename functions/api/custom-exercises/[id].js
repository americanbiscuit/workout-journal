// DELETE /api/custom-exercises/:id — remove a custom exercise from your pool
import { getCurrentUser, unauthorized } from '../../_lib/auth.js';

export async function onRequestDelete(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    await context.env.DB.prepare(
      "DELETE FROM custom_exercises WHERE id = ? AND user_id = ?"
    ).bind(context.params.id, user.id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
