-- Add phone column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR;

-- Optionally create an index for queries by phone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
