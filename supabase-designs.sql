-- ============================================================================
-- Guddu Order Manager — Design Library (photos) setup
-- Run this AFTER supabase-schema.sql, and also create a PUBLIC Storage bucket
-- named exactly:  designs   (Storage → New bucket → name "designs" → Public).
-- ============================================================================

create table if not exists public.designs (
  id            text primary key,
  design_number text not null,
  norm          text not null,            -- normalized key for matching
  path          text not null,            -- object path inside the "designs" bucket
  url           text not null,            -- public URL of the photo
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists designs_norm_idx on public.designs (norm);

-- Row Level Security: allow the shared team anon key full access (same trade-off
-- as the orders table — see the note in supabase-schema.sql).
alter table public.designs enable row level security;
drop policy if exists "anon full designs" on public.designs;
create policy "anon full designs" on public.designs
  for all to anon using (true) with check (true);

-- ----------------------------------------------------------------------------
-- STORAGE policies for the "designs" bucket.
-- If you ticked "Public bucket" when creating it, public READ already works.
-- These extra policies let the shared anon key UPLOAD and DELETE photos.
-- ----------------------------------------------------------------------------
drop policy if exists "anon read designs bucket"   on storage.objects;
drop policy if exists "anon write designs bucket"  on storage.objects;
drop policy if exists "anon update designs bucket" on storage.objects;
drop policy if exists "anon delete designs bucket" on storage.objects;

create policy "anon read designs bucket" on storage.objects
  for select to anon using (bucket_id = 'designs');
create policy "anon write designs bucket" on storage.objects
  for insert to anon with check (bucket_id = 'designs');
create policy "anon update designs bucket" on storage.objects
  for update to anon using (bucket_id = 'designs') with check (bucket_id = 'designs');
create policy "anon delete designs bucket" on storage.objects
  for delete to anon using (bucket_id = 'designs');
