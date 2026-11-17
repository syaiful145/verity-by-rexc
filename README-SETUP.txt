VERITY BY REXC — CLOUDFLARE PAGES + NEON

File backend dan konfigurasi:
- functions/api/ berisi endpoint login, logout, dan data website.
- database/schema.sql membuat tabel JSONB untuk menyimpan data website.
- package.json memasang driver Neon.
- wrangler.toml berisi konfigurasi Cloudflare Pages.

SETUP SETELAH FILE WEBSITE UTAMA DIUNGGAH
1. Buat database PostgreSQL di Neon.
2. Jalankan isi database/schema.sql di Neon SQL Editor.
3. Hubungkan repository ini ke Cloudflare Pages. Build command: npm install. Build output directory: .
4. Di Cloudflare Pages > Settings > Variables and Secrets, tambahkan sebagai secret: DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET.
5. Deploy ulang setelah seluruh file website dan aset ditambahkan.

PENTING
- Jangan simpan DATABASE_URL atau password admin di GitHub, index.html, atau chat.
- Gunakan username dan password admin baru yang kuat.
- Foto saat ini disimpan sebagai data URL di JSONB Neon; untuk penggunaan besar, pertimbangkan Cloudflare R2.
- Data lama yang hanya ada di localStorage browser tidak otomatis dipindahkan. Cadangkan/ekspor data lama terlebih dahulu.

STATUS: index.html serta aset logo dan font dari ZIP belum diunggah. Backend ini belum bisa dianggap sebagai website lengkap atau siap deploy sampai file tersebut ditambahkan dan diuji bersama.
