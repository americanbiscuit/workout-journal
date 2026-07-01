// GET  /api/schedules   — list current user's schedules
// POST /api/schedules   — create a new schedule
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const rows = await context.env.DB.prepare(
    "SELECT id, name, start_date, duration_days, weekly_map, created_at, updated_at FROM schedules WHERE user_id = ? ORDER BY start_date DESC"
  ).bind(user.id).all();
  const schedules = (rows.results || []).map(r => ({
    id: r.id,
    name: r.name,
    start_date: r.start_date,
    duration_days: r.duration_days,
    weekly_map: safeParse(r.weekly_map, {}),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return Response.json({ schedules });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const startDate = (body.start_date || '').trim();
    const duration = body.duration_days === null || body.duration_days === '' ? null : parseInt(body.duration_days);
    const weeklyMap = body.weekly_map && typeof body.weekly_map === 'object' ? body.weekly_map : {};
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return Response.json({ error: 'Need name + start_date (YYYY-MM-DD)' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "INSERT INTO schedules (user_id, name, start_date, duration_days, weekly_map, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(user.id, name, startDate, duration, JSON.stringify(weeklyMap), now, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function safeParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
