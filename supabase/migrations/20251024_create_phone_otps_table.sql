-- Migration: create phone_otps table
-- Columns: id, phone, code_hmac, expires_at, attempts, created_at

CREATE TABLE IF NOT EXISTS phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hmac text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
