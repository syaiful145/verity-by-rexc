import { del } from "@vercel/blob";
import { getDb, isAdmin, checkOrigin, readBody, sendJson } from "./_shared.js";

function collectBlobUrls(value, urls = new Set()) {
  if (typeof value === "string") {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" && parsed.hostname.endsWith(".blob.vercel-storage.com")) {
        urls.add(value);
      }
    } catch {}
  } else if (Array.isArray(value)) {
    value.forEach(item => collectBlobUrls(item, urls));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectBlobUrls(item, urls));
  }
  return urls;
}

function logDatabaseError(operation, error) {
  const message = String(error?.message || error || "Unknown database error")
    .replace(/(postgres(?:ql)?:\\/\\/[^:]+:)[^@]+@/gi, "$1[redacted]@");
  console.error(`[site-data] ${operation} failed:`, error?.name || "Error", message);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const sql = getDb();
      const rows = await sql`SELECT data FROM verity_site_state WHERE id = 1`;
      return sendJson(res, 200, { data: rows[0]?.data ?? null });
    } catch (error) {
      logDatabaseError("GET", error);
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
      const previousRows = await sql`SELECT data FROM verity_site_state WHERE id = 1`;
      const previousData = previousRows[0]?.data ?? null;

      await sql`INSERT INTO verity_site_state (id, data, updated_at)
        VALUES (1, ${JSON.stringify(data)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()`;

      const previousUrls = collectBlobUrls(previousData);
      const currentUrls = collectBlobUrls(data);
      const unusedUrls = [...previousUrls].filter(url => !currentUrls.has(url));
      let cleanupWarning = false;

      if (unusedUrls.length) {
        try {
          await del(unusedUrls);
        } catch {
          cleanupWarning = true;
        }
      }

      return sendJson(res, 200, { ok: true, cleanupWarning });
    } catch (error) {
      logDatabaseError("PUT", error);
      return sendJson(res, 500, { error: "Gagal menyimpan data ke database." });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendJson(res, 405, { error: "Metode tidak diizinkan." });
}
