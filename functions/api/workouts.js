// GET /api/workouts — list all workouts (most recent first)
// POST /api/workouts — bulk import (used for migrating from localStorage)

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      "SELECT date, category, body_weight, data, updated_at FROM workouts ORDER BY date DESC"
    ).all();
    const workouts = results.map(r => ({
      ...JSON.parse(r.data),
      date: r.date,
      category: r.category,
      bodyWeight: r.body_weight,
      savedAt: r.updated_at,
    }));
    return Response.json({ workouts });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    if (!body.workouts || !Array.isArray(body.workouts)) {
      return Response.json({ error: "Missing 'workouts' array" }, { status: 400 });
    }
    const now = new Date().toISOString();
    let count = 0;
    for (const w of body.workouts) {
      if (!w.date || !w.category) continue;
      await env.DB.prepare(
        "INSERT OR REPLACE INTO workouts (date, category, body_weight, data, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(w.date, w.category, w.bodyWeight ?? null, JSON.stringify(w), w.savedAt || now).run();
      count++;
    }
    return Response.json({ imported: count });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
