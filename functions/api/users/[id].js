// PUT    /api/users/:id (admin) — update name / disabled / password
// DELETE /api/users/:id (admin) — soft-delete (sets disabled = 1; preserves workouts)
import { getCurrentUser, generateSalt, hashPassword, forbidden, unauthorized } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();
  try {
    const body = await context.request.json();
    const sets = [];
    const args = [];
    if (typeof body.name === 'string') { sets.push("name = ?"); args.push(body.name); }
    if (typeof body.disabled === 'boolean') { sets.push("disabled = ?"); args.push(body.disabled ? 1 : 0); }
    if (typeof body.isAdmin === 'boolean') { sets.push("is_admin = ?"); args.push(body.isAdmin ? 1 : 0); }
    if (typeof body.password === 'string' && body.password.length >= 8) {
      const salt = generateSalt();
      const hash = await hashPassword(body.password, salt);
      sets.push("password_hash = ?", "password_salt = ?");
      args.push(hash, salt);
    }
    if (!sets.length) return Response.json({ error: "Nothing to update" }, { status: 400 });
    args.push(context.params.id);
    await context.env.DB.prepare(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...args).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();
  try {
    // Soft delete: disable + rename so the username can be reused
    const now = Date.now();
    await context.env.DB.prepare(
      "UPDATE users SET disabled = 1, username = username || '_deleted_' || ? WHERE id = ?"
    ).bind(now, context.params.id).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
