// PUT    /api/templates/:id  — update
// DELETE /api/templates/:id  — remove (and null out any weekly_map references)
import { getCurrentUser, unauthorized, forbidden } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const id = parseInt(context.params.id);
  if (!id) return Response.json({ error: 'Bad id' }, { status: 400 });
  try {
    const body = await context.request.json();
    const owned = await context.env.DB.prepare(
      "SELECT id FROM day_templates WHERE id = ? AND user_id = ?"
    ).bind(id, user.id).first();
    if (!owned) return forbidden();
    const name = (body.name || '').trim();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const isDefault = body.is_default ? 1 : 0;
    if (isDefault) {
      await context.env.DB.prepare("UPDATE day_templates SET is_default = 0 WHERE user_id = ? AND id != ?").bind(user.id, id).run();
    }
    await context.env.DB.prepare(
      "UPDATE day_templates SET name = ?, sections = ?, is_default = ?, updated_at = ? WHERE id = ?"
    ).bind(name, JSON.stringify(sections), isDefault, new Date().toISOString(), id).run();
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
    "SELECT id FROM day_templates WHERE id = ? AND user_id = ?"
  ).bind(id, user.id).first();
  if (!owned) return forbidden();
  // Null out any schedule weekly_map references to this template
  const schedules = await context.env.DB.prepare(
    "SELECT id, weekly_map FROM schedules WHERE user_id = ?"
  ).bind(user.id).all();
  const now = new Date().toISOString();
  for (const s of (schedules.results || [])) {
    let map = {};
    try { map = JSON.parse(s.weekly_map || '{}'); } catch {}
    let changed = false;
    for (const k of Object.keys(map)) {
      if (parseInt(map[k]) === id) { map[k] = null; changed = true; }
    }
    if (changed) {
      await context.env.DB.prepare(
        "UPDATE schedules SET weekly_map = ?, updated_at = ? WHERE id = ?"
      ).bind(JSON.stringify(map), now, s.id).run();
    }
  }
  await context.env.DB.prepare("DELETE FROM day_templates WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
