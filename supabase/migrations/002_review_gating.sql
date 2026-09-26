alter table public.newsletter_entries
  add column if not exists location_confirmed boolean not null default false,
  add column if not exists human_reviewed boolean not null default false,
  add column if not exists reviewed_at timestamptz;
