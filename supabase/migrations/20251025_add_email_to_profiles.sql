-- Add email column to profiles so admin UI can show email directly
alter table if exists profiles
  add column if not exists email text;

-- Optionally create an index for faster lookup by email
create index if not exists profiles_email_idx on profiles(email);
