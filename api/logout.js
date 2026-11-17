import { checkOrigin, clearSession, sendJson } from "./_shared.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  }
  if (!checkOrigin(req)) return sendJson(res, 403, { error: "Origin tidak diizinkan." });
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSession() });
}
