do $$
declare table_name text;
begin
  foreach table_name in array array[
    'creator_profiles', 'creator_sessions', 'creator_payout_accounts',
    'creator_commissions', 'creator_payout_batches', 'creator_payout_items'
  ] loop
    execute format('drop policy if exists "No browser access" on public.%I', table_name);
    execute format(
      'create policy "No browser access" on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;
end $$;

create index if not exists creator_payout_items_creator_idx
  on public.creator_payout_items (creator_id);
