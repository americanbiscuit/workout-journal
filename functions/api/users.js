// GET  /api/users (admin) — list all users
// POST /api/users (admin) — create a new user
import { getCurrentUser, generateSalt, hashPassword, forbidden, unauthorized } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();
  const { results } = await context.env.DB.prepare(
    "SELECT u.id, u.username, u.name, u.is_admin, u.disabled, u.created_at, (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.id) AS workout_count, (SELECT MAX(w.date) FROM workouts w WHERE w.user_id = u.id) AS last_workout FROM users u ORDER BY u.created_at DESC"
  ).all();
  return Response.json({ users: results.map(r => ({
    id: r.id, username: r.username, name: r.name,
    isAdmin: !!r.is_admin, disabled: !!r.disabled,
    createdAt: r.created_at, workoutCount: r.workout_count, lastWorkout: r.last_workout
  }))});
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();
  try {
    const { username, name, password, isAdmin } = await context.request.json();
    if (!username || !password || password.length < 8) {
      return Response.json({ error: "Need username and password (8+ chars)" }, { status: 400 });
    }
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      "INSERT INTO users (username, name, password_hash, password_salt, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(username, name || username, hash, salt, isAdmin ? 1 : 0, now).first();
    return Response.json({ ok: true, id: result.id });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return Response.json({ error: "Username already exists" }, { status: 409 });
    return Response.json({ error: e.message }, { status: 500 });
  }
}
