-- Migration: Add phone_verified column to profiles
-- Run with: supabase db push OR psql against your database

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Optional: Backfill existing profiles if you have a separate verified phone source
-- UPDATE profiles SET phone_verified = true WHERE phone IS NOT NULL AND <your-criteria>;

-- Note: If using Supabase CLI, run `supabase db push` or apply this migration via your usual deployment method.
