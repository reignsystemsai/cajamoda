alter table public.creator_profiles
  add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-profile-photos',
  'creator-profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
