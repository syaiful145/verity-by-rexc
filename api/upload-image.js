import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { isAdmin, checkOrigin, sendJson } from "./_shared.js";

export const config = {
  api: { bodyParser: false }
};

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  }

  if (!checkOrigin(req)) return sendJson(res, 403, { error: "Origin tidak diizinkan." });
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Sesi admin tidak valid. Silakan login kembali." });

  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const extension = TYPES[contentType];
  if (!extension) {
    return sendJson(res, 415, { error: "Format foto harus JPG, PNG, atau WebP." });
  }

  const declaredLength = Number(req.headers["content-length"] || 0);
  if (declaredLength > MAX_BYTES) {
    return sendJson(res, 413, { error: "Ukuran foto setelah diproses maksimal 4 MB." });
  }

  try {
    const chunks = [];
    let total = 0;
    let tooLarge = false;

    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BYTES) {
        tooLarge = true;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    }

    if (tooLarge || total === 0) {
      return sendJson(res, tooLarge ? 413 : 400, {
        error: tooLarge ? "Ukuran foto setelah diproses maksimal 4 MB." : "File foto kosong."
      });
    }

    const blob = await put(`verity/${randomUUID()}.${extension}`, Buffer.concat(chunks), {
      access: "public",
      addRandomSuffix: false,
      contentType
    });

    return sendJson(res, 200, { ok: true, url: blob.url });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error
      ? error.message.replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]").replace(/([?&](?:token|key|secret)=)[^&\s]+/gi, "$1[REDACTED]")
      : "Unknown upload error";
    console.error("[upload-image] Blob upload failed:", errorName, errorMessage);
    return sendJson(res, 500, { error: "Foto gagal diunggah ke penyimpanan." });
  }
}
