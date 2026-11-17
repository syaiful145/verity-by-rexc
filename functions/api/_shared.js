import { neon } from "@neondatabase/serverless";

export function db(env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur di Cloudflare.");
  return neon(env.DATABASE_URL);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}
function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function createSession(username, secret) {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ sub: username, exp: Date.now() + 8 * 60 * 60 * 1000 })));
  const value = payload + "." + bytesToBase64Url(await hmac(payload, secret));
  return `verity_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`;
}

export async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\\s*)verity_session=([^;]+)/);
  if (!match) return false;
  try {
    const [payload, signature] = match[1].split(".");
    if (!payload || !signature) return false;
    const expected = await hmac(payload, env.SESSION_SECRET);
    const actual = base64UrlToBytes(signature);
    if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) return false;
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    return data.sub === env.ADMIN_USERNAME && Number(data.exp) > Date.now();
  } catch { return false; }
}

export function checkOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
