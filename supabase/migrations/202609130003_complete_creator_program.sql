alter table public.creator_applications
  add column if not exists creator_slug text,
  add column if not exists tier smallint,
  add column if not exists commission_rate numeric(5,2),
  add column if not exists approved_at timestamptz,
  add column if not exists reviewed_at timestamptz;

alter table public.creator_applications
  drop constraint if exists creator_applications_tier_check,
  add constraint creator_applications_tier_check check (tier is null or tier between 1 and 3),
  drop constraint if exists creator_applications_commission_rate_check,
  add constraint creator_applications_commission_rate_check check (commission_rate is null or commission_rate in (10, 20, 30)),
  drop constraint if exists creator_applications_creator_slug_check,
  add constraint creator_applications_creator_slug_check check (
    creator_slug is null or creator_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

create unique index if not exists creator_applications_email_unique
  on public.creator_applications (lower(email));

create unique index if not exists creator_applications_creator_slug_unique
  on public.creator_applications (creator_slug)
  where creator_slug is not null;

alter table public.creator_applications enable row level security;

revoke all on table public.creator_applications from anon, authenticated;
grant select, insert, update, delete on table public.creator_applications to service_role;
