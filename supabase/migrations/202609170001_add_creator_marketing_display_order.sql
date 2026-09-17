alter table public.creator_marketing_assets
  add column if not exists display_order integer not null default 0;

create index if not exists creator_marketing_assets_display_order_idx
  on public.creator_marketing_assets (asset_type, display_order, created_at desc);
