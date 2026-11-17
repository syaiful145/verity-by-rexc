import { json, checkOrigin } from "./_shared.js";
export async function onRequestPost({ request }) {
  if (!checkOrigin(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  return json({ ok: true }, 200, { "Set-Cookie": "verity_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" });
}
