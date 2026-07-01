// GET /api/resolve-day?date=YYYY-MM-DD
// Returns the template + optional schedule that should be used to render this date.
// Resolution rules:
//   1. Find schedules where start_date <= date AND (duration_days IS NULL OR start_date + duration_days > date)
//   2. Take the one with the latest start_date (most-recently-started schedule wins)
//   3. Look up weekly_map[dayOfWeek(date)] → template id (0=Sun..6=Sat)
//   4. If that template id is null, fall back to the user's default template
//   5. If no user template at all, return a generic single-section template
import { getCurrentUser, unauthorized } from '../_lib/auth.js';

const GENERIC_TEMPLATE = {
  id: null,
  name: 'Today',
  category: '',
  sections: [
    { type: 'strength', title: "Today's Workout", subtitle: '' },
    { type: 'notes',    title: 'Notes',           subtitle: '' },
  ],
  is_default: true,
  is_generic: true,
};

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  const url = new URL(context.request.url);
  const dateStr = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return Response.json({ error: 'Bad date (YYYY-MM-DD)' }, { status: 400 });
  }

  // Local-date parse to avoid timezone drift on day-of-week
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();   // 0=Sun..6=Sat

  // Find the covering schedule (latest start wins).
  // Duration check: julianday() gives us numeric days; if duration_days is set,
  // schedule ends at (start_date + duration_days) exclusive.
  const schedule = await context.env.DB.prepare(`
    SELECT id, name, start_date, duration_days, weekly_map
    FROM schedules
    WHERE user_id = ?
      AND start_date <= ?
      AND (duration_days IS NULL OR julianday(?) < julianday(start_date) + duration_days)
    ORDER BY start_date DESC
    LIMIT 1
  `).bind(user.id, dateStr, dateStr).first();

  let templateId = null;
  let resolvedSchedule = null;
  if (schedule) {
    let map = {};
    try { map = JSON.parse(schedule.weekly_map || '{}'); } catch {}
    templateId = map[String(dow)] || null;
    resolvedSchedule = {
      id: schedule.id,
      name: schedule.name,
      start_date: schedule.start_date,
      duration_days: schedule.duration_days,
    };
  }

  // Fetch the template (either the one from the schedule, or the user's default)
  let templateRow = null;
  if (templateId) {
    templateRow = await context.env.DB.prepare(
      "SELECT id, name, sections, category, is_default FROM day_templates WHERE id = ? AND user_id = ?"
    ).bind(templateId, user.id).first();
  }
  if (!templateRow) {
    templateRow = await context.env.DB.prepare(
      "SELECT id, name, sections, category, is_default FROM day_templates WHERE user_id = ? AND is_default = 1 LIMIT 1"
    ).bind(user.id).first();
  }
  if (!templateRow) {
    templateRow = await context.env.DB.prepare(
      "SELECT id, name, sections, category, is_default FROM day_templates WHERE user_id = ? ORDER BY id ASC LIMIT 1"
    ).bind(user.id).first();
  }

  let template;
  if (templateRow) {
    template = {
      id: templateRow.id,
      name: templateRow.name,
      category: templateRow.category || '',
      sections: safeParse(templateRow.sections, []),
      is_default: !!templateRow.is_default,
      is_generic: false,
    };
  } else {
    template = GENERIC_TEMPLATE;
  }

  return Response.json({ date: dateStr, dow, template, schedule: resolvedSchedule });
}

function safeParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
