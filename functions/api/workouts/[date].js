// GET    /api/workouts/:date — fetch one workout
// PUT    /api/workouts/:date — upsert one workout
// DELETE /api/workouts/:date — delete one workout

export async function onRequestGet(context) {
  const { env, params } = context;
  try {
    const row = await env.DB.prepare(
      "SELECT date, category, body_weight, data, updated_at FROM workouts WHERE date = ?"
    ).bind(params.date).first();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      ...JSON.parse(row.data),
      date: row.date,
      category: row.category,
      bodyWeight: row.body_weight,
      savedAt: row.updated_at,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, request, params } = context;
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT OR REPLACE INTO workouts (date, category, body_weight, data, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      params.date,
      body.category || "Abs",
      body.bodyWeight ?? null,
      JSON.stringify(body),
      now
    ).run();
    return Response.json({ ok: true, savedAt: now });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    await env.DB.prepare("DELETE FROM workouts WHERE date = ?").bind(params.date).run();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
