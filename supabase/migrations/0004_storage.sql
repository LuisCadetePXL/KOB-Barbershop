-- Migration: 0004_storage
-- Creates the avatars bucket for barber profile photos

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Staff can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and public.is_staff());

create policy "Staff can update avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and public.is_staff());

create policy "Staff can delete avatars"
  on storage.objects for delete
  using (bucket_id = 'avatars' and public.is_staff());
