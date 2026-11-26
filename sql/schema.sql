CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_telp       VARCHAR(15) NOT NULL UNIQUE,
  jenis_wallet  VARCHAR(20) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hasil deteksi AI per sesi kamera
CREATE TABLE IF NOT EXISTS scans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  image_hash            CHAR(64),
  detections            JSONB NOT NULL,           -- [{name, category, confidence, estimated_weight_kg}]
  organic_weight_kg     NUMERIC(10,3) NOT NULL DEFAULT 0,
  non_organic_weight_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  organic_value         INTEGER NOT NULL DEFAULT 0 CHECK (organic_value >= 0),
  non_organic_value     INTEGER NOT NULL DEFAULT 0 CHECK (non_organic_value >= 0),
  avg_confidence        NUMERIC(5,4) NOT NULL DEFAULT 0,
  status                VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','used')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);

-- Transaksi penarikan (withdrawal) via Midtrans Iris
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  scan_id           UUID NOT NULL REFERENCES scans(id),
  no_telp           VARCHAR(15) NOT NULL,
  jenis_pembayaran  VARCHAR(20) NOT NULL,
  organic_value     INTEGER NOT NULL,
  non_organic_value INTEGER NOT NULL,
  amount            INTEGER NOT NULL CHECK (amount > 0),
  status            VARCHAR(12) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','success','failed')),
  referral_number   VARCHAR(100),                 -- reference_no dari Midtrans Iris
  gateway_response  JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 1 scan hanya boleh punya 1 transaksi aktif (yang gagal boleh diulang)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_scan_active ON transactions(scan_id) WHERE status <> 'failed';
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_ref ON transactions(referral_number);

-- Log mentah webhook dari payment gateway (audit)
CREATE TABLE IF NOT EXISTS webhook_events (
  id           BIGSERIAL PRIMARY KEY,
  reference_no VARCHAR(100),
  payload      JSONB NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
