-- Jalankan sekali di Neon SQL Editor.
CREATE TABLE IF NOT EXISTS verity_site_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
