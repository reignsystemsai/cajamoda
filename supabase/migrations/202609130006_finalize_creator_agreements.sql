create table if not exists public.creator_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  agreement_version text not null,
  agreement_sha256 text not null check (agreement_sha256 ~ '^[a-f0-9]{64}$'),
  agreement_text text not null,
  consent_text text not null,
  legal_name text not null,
  email text not null,
  signature_type text not null default 'clickwrap' check (signature_type = 'clickwrap'),
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create unique index if not exists creator_agreement_acceptance_version_unique
  on public.creator_agreement_acceptances (creator_id, agreement_version);

alter table public.creator_agreement_acceptances enable row level security;
revoke all on table public.creator_agreement_acceptances from anon, authenticated;
grant select, insert on table public.creator_agreement_acceptances to service_role;

drop policy if exists "No browser access" on public.creator_agreement_acceptances;
create policy "No browser access" on public.creator_agreement_acceptances
  for all to anon, authenticated using (false) with check (false);

create index if not exists creator_agreement_acceptances_creator_idx
  on public.creator_agreement_acceptances (creator_id, accepted_at desc);
