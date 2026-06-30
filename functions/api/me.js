import { getCurrentUser } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  if (!user) return Response.json({ user: null }, { status: 200 });
  return Response.json({ user });
}
