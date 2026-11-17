import { getDb, isAdmin, checkOrigin, readBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const sql = getDb();
      const rows = await sql`SELECT data FROM verity_site_state WHERE id = 1`;
      return sendJson(res, 200, { data: rows[0]?.data ?? null });
    } catch {
      return sendJson(res, 503, {
        error: "Database belum siap. Periksa DATABASE_URL di Vercel dan jalankan database/schema.sql di Neon."
      });
    }
  }

  if (req.method === "PUT") {
    if (!checkOrigin(req)) return sendJson(res, 403, { error: "Origin tidak diizinkan." });
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Sesi admin tidak valid. Silakan login kembali." });

    try {
      const data = readBody(req);
      if (!data || !Array.isArray(data.divisions) || !Array.isArray(data.history) ||
          !data.texts || typeof data.texts !== "object" || Array.isArray(data.texts)) {
        return sendJson(res, 400, { error: "Format data website tidak valid." });
      }

      const sql = getDb();
      await sql`INSERT INTO verity_site_state (id, data, updated_at)
        VALUES (1, ${JSON.stringify(data)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()`;
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 500, { error: "Gagal menyimpan data ke database." });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendJson(res, 405, { error: "Metode tidak diizinkan." });
}
