alter table public.creator_profiles
  add column if not exists password_hash text,
  add column if not exists password_set_at timestamptz;
