alter table public.creator_profiles
  add column if not exists password_hash text,
  add column if not exists password_set_at timestamptz,
  add column if not exists password_changed_at timestamptz,
  add column if not exists password_reset_token_hash text,
  add column if not exists password_reset_expires_at timestamptz;

create index if not exists creator_profiles_password_reset_idx
  on public.creator_profiles (password_reset_token_hash)
  where password_reset_token_hash is not null;
