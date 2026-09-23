create extension if not exists pgcrypto;

create table if not exists public.newsletter_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  location text,
  captured_at timestamptz not null,
  content_mode text not null check (content_mode in ('general', 'ministry', 'business', 'personal')),
  status text not null check (status in ('queued', 'uploading', 'transcribing', 'generating', 'ready', 'failed')),
  error_message text,
  voice_note_duration_seconds integer not null check (voice_note_duration_seconds between 30 and 180),
  photo_paths text[] not null default '{}',
  voice_note_path text,
  transcript text,
  draft jsonb,
  created_at timestamptz not null default now()
);

alter table public.newsletter_entries enable row level security;

create policy "Users can read their own entries"
  on public.newsletter_entries for select
  using (auth.uid() = user_id);

create policy "Users can create their own entries"
  on public.newsletter_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on public.newsletter_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('travel-media', 'travel-media', false)
on conflict (id) do update set public = false;

create policy "Users can read their own travel media"
  on storage.objects for select
  using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own travel media"
  on storage.objects for insert
  with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own travel media"
  on storage.objects for update
  using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own travel media"
  on storage.objects for delete
  using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);
