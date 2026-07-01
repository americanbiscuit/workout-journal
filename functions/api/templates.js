// GET  /api/templates            — list current user's day templates
// POST /api/templates             — create a new template
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const rows = await context.env.DB.prepare(
    "SELECT id, name, sections, category, is_default, created_at, updated_at FROM day_templates WHERE user_id = ? ORDER BY is_default DESC, name ASC"
  ).bind(user.id).all();
  const templates = (rows.results || []).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category || '',
    sections: safeParse(r.sections, []),
    is_default: !!r.is_default,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return Response.json({ templates });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const category = (body.category || '').trim() || null;
    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (!name) return Response.json({ error: 'Need a name' }, { status: 400 });
    const now = new Date().toISOString();
    const isDefault = body.is_default ? 1 : 0;
    if (isDefault) {
      await context.env.DB.prepare("UPDATE day_templates SET is_default = 0 WHERE user_id = ?").bind(user.id).run();
    }
    const result = await context.env.DB.prepare(
      "INSERT INTO day_templates (user_id, name, sections, category, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(user.id, name, JSON.stringify(sections), category, isDefault, now, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}
