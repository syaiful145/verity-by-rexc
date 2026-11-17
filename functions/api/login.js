import { createSession, json, checkOrigin } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  if (!checkOrigin(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Konfigurasi login admin belum lengkap di Cloudflare." }, 503);
  }
  try {
    const body = await request.json();
    const username = String(body.username || "");
    const password = String(body.password || "");
    const enc = new TextEncoder();
    const [a, b] = await Promise.all([
      crypto.subtle.digest("SHA-256", enc.encode(username)),
      crypto.subtle.digest("SHA-256", enc.encode(password))
    ]);
    const equal = (x, y) => new Uint8Array(x).every((v, i) => v === new Uint8Array(y)[i]);
    if (!equal(a, await crypto.subtle.digest("SHA-256", enc.encode(env.ADMIN_USERNAME))) ||
        !equal(b, await crypto.subtle.digest("SHA-256", enc.encode(env.ADMIN_PASSWORD)))) {
      return json({ error: "Username atau password salah." }, 401);
    }
    return json({ ok: true }, 200, { "Set-Cookie": await createSession(username, env.SESSION_SECRET) });
  } catch {
    return json({ error: "Permintaan login tidak valid." }, 400);
  }
}
