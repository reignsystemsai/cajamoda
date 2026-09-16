create table if not exists public.creator_marketing_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  asset_type text not null check (asset_type in ('reel','story','photo','whatsapp','caption','campaign','guide')),
  media_path text,
  thumbnail_path text,
  suggested_text text,
  related_product_id text,
  related_product_name text,
  related_product_url text,
  campaign text,
  city text,
  minimum_tier smallint not null default 1 check (minimum_tier between 1 and 3),
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'inactive' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at >= start_at)
);

create index if not exists creator_marketing_assets_distribution_idx
  on public.creator_marketing_assets (status, minimum_tier, start_at, end_at);

create index if not exists creator_marketing_assets_city_idx
  on public.creator_marketing_assets (lower(city))
  where city is not null;

create table if not exists public.creator_reward_state (
  creator_id uuid primary key references public.creator_profiles(id) on delete cascade,
  unboxing_status text not null default 'locked' check (unboxing_status in ('locked','earned','preparing','sent')),
  level2_notified_at timestamptz,
  level3_notified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.creator_marketing_assets enable row level security;
alter table public.creator_reward_state enable row level security;

revoke all on table public.creator_marketing_assets from anon, authenticated;
revoke all on table public.creator_reward_state from anon, authenticated;
grant select, insert, update, delete on table public.creator_marketing_assets to service_role;
grant select, insert, update, delete on table public.creator_reward_state to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-marketing-assets',
  'creator-marketing-assets',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','video/mp4','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
