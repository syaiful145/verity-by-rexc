import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const COOKIE_NAME = "verity_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export function sendJson(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(data));
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

export function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return false;
  const proto = req.headers["x-forwarded-proto"] || "https";
  try {
    return new URL(origin).origin === new URL(`${proto}://${host}`).origin;
  } catch {
    return false;
  }
}

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur di Vercel.");
  return neon(process.env.DATABASE_URL);
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createSession(username, secret) {
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  })).toString("base64url");
  const signature = sign(payload, secret).toString("base64url");
  const value = `${payload}.${signature}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSession() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAdmin(req) {
  const secret = process.env.SESSION_SECRET;
  const username = process.env.ADMIN_USERNAME;
  if (!secret || !username) return false;

  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\\s*)verity_session=([^;]+)/);
  if (!match) return false;

  try {
    const [payload, suppliedSignature] = match[1].split(".");
    if (!payload || !suppliedSignature) return false;
    const expected = sign(payload, secret);
    const actual = Buffer.from(suppliedSignature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.sub === username && Number(session.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function safeStringEqual(left, right) {
  const a = createHash("sha256").update(String(left)).digest();
  const b = createHash("sha256").update(String(right)).digest();
  return timingSafeEqual(a, b);
}
