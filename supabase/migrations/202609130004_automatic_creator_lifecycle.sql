create sequence if not exists public.creator_handle_sequence start with 1 increment by 1 no cycle;

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.creator_applications(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  creator_number bigint not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+$'),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  tier smallint not null default 1 check (tier between 1 and 3),
  commission_rate numeric(5,2) not null default 10 check (commission_rate in (10, 20, 30)),
  agreement_version text,
  agreement_accepted_at timestamptz,
  access_token_hash text,
  access_token_expires_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz
);

create unique index if not exists creator_profiles_email_unique
  on public.creator_profiles (lower(email));

create table if not exists public.creator_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.creator_payout_accounts (
  creator_id uuid primary key references public.creator_profiles(id) on delete cascade,
  method text not null check (method in ('nequi', 'paypal')),
  destination text not null,
  destination_masked text not null,
  status text not null default 'verified' check (status in ('pending', 'verified', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  order_id text not null unique,
  payment_method text not null,
  product_subtotal numeric(14,2) not null check (product_subtotal >= 0),
  commission_rate numeric(5,2) not null check (commission_rate in (10, 20, 30)),
  commission_amount numeric(14,2) not null check (commission_amount >= 0),
  products jsonb not null default '[]'::jsonb,
  status text not null default 'earned' check (status in ('earned', 'batched', 'paid', 'reversed')),
  earned_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.creator_payout_batches (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'processing', 'paid', 'failed')),
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  unique (period_start, period_end)
);

create table if not exists public.creator_payout_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.creator_payout_batches(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  commission_ids uuid[] not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  provider_reference text,
  paid_at timestamptz,
  unique (batch_id, creator_id)
);

insert into public.creator_profiles (
  application_id, first_name, last_name, email, creator_number, slug,
  status, tier, commission_rate, activated_at
)
select
  application.id,
  application.first_name,
  application.last_name,
  application.email,
  nextval('public.creator_handle_sequence'),
  application.creator_slug,
  'active',
  coalesce(application.tier, 1),
  coalesce(application.commission_rate, 10),
  coalesce(application.approved_at, now())
from public.creator_applications application
where application.status = 'approved'
  and application.creator_slug ~ '^[a-z0-9]+$'
on conflict (application_id) do nothing;

create or replace function public.approve_creator_application(
  p_application_id uuid,
  p_access_token_hash text,
  p_access_token_expires_at timestamptz
)
returns setof public.creator_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  application public.creator_applications%rowtype;
  existing_profile_id uuid;
  assigned_number bigint;
  assigned_slug text;
  normalized_name text;
begin
  select * into application
  from public.creator_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Creator application not found';
  end if;

  select id into existing_profile_id
  from public.creator_profiles
  where application_id = p_application_id;

  if found then
    update public.creator_profiles
    set access_token_hash = p_access_token_hash,
        access_token_expires_at = p_access_token_expires_at,
        updated_at = now(),
        status = case when status = 'active' then status else 'invited' end
    where application_id = p_application_id;
  else
    assigned_number := nextval('public.creator_handle_sequence');
    normalized_name := translate(lower(application.first_name), 'áéíóúüñ', 'aeiouun');
    normalized_name := regexp_replace(normalized_name, '[^a-z0-9]+', '', 'g');
    if normalized_name = '' then normalized_name := 'creadora'; end if;
    assigned_slug := left(normalized_name, 45) || assigned_number::text;

    insert into public.creator_profiles (
      application_id, first_name, last_name, email, creator_number, slug,
      access_token_hash, access_token_expires_at
    ) values (
      application.id, application.first_name, application.last_name, application.email,
      assigned_number, assigned_slug, p_access_token_hash, p_access_token_expires_at
    );
  end if;

  update public.creator_applications
  set status = 'approved',
      creator_slug = (select slug from public.creator_profiles where application_id = p_application_id),
      tier = (select tier from public.creator_profiles where application_id = p_application_id),
      commission_rate = (select commission_rate from public.creator_profiles where application_id = p_application_id),
      approved_at = coalesce(approved_at, now()),
      reviewed_at = now()
  where id = p_application_id;

  return query select * from public.creator_profiles where application_id = p_application_id;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'creator_profiles', 'creator_sessions', 'creator_payout_accounts',
    'creator_commissions', 'creator_payout_batches', 'creator_payout_items'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  end loop;
end $$;

revoke all on sequence public.creator_handle_sequence from public, anon, authenticated;
grant usage, select on sequence public.creator_handle_sequence to service_role;
revoke all on function public.approve_creator_application(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.approve_creator_application(uuid, text, timestamptz) to service_role;

create index if not exists creator_sessions_creator_active_idx
  on public.creator_sessions (creator_id, expires_at) where revoked_at is null;
create index if not exists creator_commissions_creator_status_idx
  on public.creator_commissions (creator_id, status, earned_at desc);
