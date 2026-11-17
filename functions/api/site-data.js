import { db, isAdmin, json, checkOrigin } from "./_shared.js";

export async function onRequestGet({ env }) {
  try {
    const sql = db(env);
    const rows = await sql\`SELECT data FROM verity_site_state WHERE id = 1\`;
    return json({ data: rows[0]?.data ?? null });
  } catch (error) {
    return json({ error: "Database belum siap. Periksa DATABASE_URL dan jalankan database/schema.sql." }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  if (!checkOrigin(request)) return json({ error: "Origin tidak diizinkan." }, 403);
  if (!(await isAdmin(request, env))) return json({ error: "Sesi admin tidak valid. Silakan login kembali." }, 401);
  try {
    const data = await request.json();
    if (!data || !Array.isArray(data.divisions) || !Array.isArray(data.history) || typeof data.texts !== "object") {
      return json({ error: "Format data website tidak valid." }, 400);
    }
    const sql = db(env);
    await sql\`INSERT INTO verity_site_state (id, data, updated_at)
      VALUES (1, ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()\`;
    return json({ ok: true });
  } catch (error) {
    return json({ error: "Gagal menyimpan data ke database." }, 500);
  }
}
