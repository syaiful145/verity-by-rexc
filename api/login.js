import { checkOrigin, createSession, readBody, safeStringEqual, sendJson } from "./_shared.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  }
  if (!checkOrigin(req)) return sendJson(res, 403, { error: "Origin tidak diizinkan." });

  const { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET) {
    return sendJson(res, 503, { error: "Konfigurasi login admin belum lengkap di Vercel." });
  }

  try {
    const body = readBody(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (username.length > 200 || password.length > 1000 ||
        !safeStringEqual(username, ADMIN_USERNAME) ||
        !safeStringEqual(password, ADMIN_PASSWORD)) {
      return sendJson(res, 401, { error: "Username atau password salah." });
    }

    return sendJson(res, 200, { ok: true }, {
      "Set-Cookie": createSession(username, SESSION_SECRET)
    });
  } catch {
    return sendJson(res, 400, { error: "Permintaan login tidak valid." });
  }
}
