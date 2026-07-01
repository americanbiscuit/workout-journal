// PUT    /api/suggestions/:id — admin only, update status or admin_note
// DELETE /api/suggestions/:id — admin only, permanent delete
import { getCurrentUser, unauthorized, forbidden } from '../../_lib/auth.js';

const VALID_STATUSES = ['new', 'in-progress', 'done', 'wontfix'];

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();
  try {
    const body = await context.request.json();
    const sets = [];
    const args = [];
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return Response.json({ error: `status must be one of ${VALID_STATUSES.join('|')}` }, { status: 400 });
      }
      sets.push('status = ?'); args.push(body.status);
    }
    if (typeof body.admin_note === 'string') {
      sets.push('admin_note = ?'); args.push(body.admin_note.trim() || null);
    }
    if (!sets.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });
    sets.push('updated_at = ?'); args.push(new Date().toISOString());
    args.push(parseInt(context.params.id));
    await context.env.DB.prepare(
      `UPDATE suggestions SET ${sets.join(', ')} WHERE id = ?`
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
  const id = parseInt(context.params.id);
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });
  await context.env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
