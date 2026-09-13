create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  phone text not null check (char_length(btrim(phone)) between 7 and 30),
  email text not null check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  ),
  instagram_username text,
  tiktok_username text,
  city text not null check (char_length(btrim(city)) between 1 and 120),
  heard_about text not null check (char_length(btrim(heard_about)) between 1 and 200),
  is_adult boolean not null check (is_adult),
  privacy_consent boolean not null check (privacy_consent),
  status text not null default 'new' check (status in ('new', 'verifying', 'approved', 'declined')),
  wix_contact_id text,
  confirmation_email_status text not null default 'pending'
    check (confirmation_email_status in ('pending', 'sent', 'failed')),
  attribution jsonb not null default '{}'::jsonb,
  source text not null default 'cajamoda.com/creadores',
  check (
    nullif(btrim(coalesce(instagram_username, '')), '') is not null
    or nullif(btrim(coalesce(tiktok_username, '')), '') is not null
  )
);

create unique index if not exists creator_applications_email_unique
  on public.creator_applications (lower(email));

alter table public.creator_applications enable row level security;
revoke all on table public.creator_applications from anon, authenticated;

create policy "No browser access"
  on public.creator_applications
  for all
  to anon, authenticated
  using (false)
  with check (false);
