alter table public.creator_applications
  drop constraint if exists creator_applications_tier_check,
  add constraint creator_applications_tier_check check (tier is null or tier between 1 and 5),
  drop constraint if exists creator_applications_commission_rate_check,
  add constraint creator_applications_commission_rate_check check (commission_rate is null or commission_rate in (10, 20, 30, 40, 50));

alter table public.creator_profiles
  drop constraint if exists creator_profiles_tier_check,
  add constraint creator_profiles_tier_check check (tier between 1 and 5),
  drop constraint if exists creator_profiles_commission_rate_check,
  add constraint creator_profiles_commission_rate_check check (commission_rate in (10, 20, 30, 40, 50));

alter table public.creator_commissions
  drop constraint if exists creator_commissions_commission_rate_check,
  add constraint creator_commissions_commission_rate_check check (commission_rate in (10, 20, 30, 40, 50));
