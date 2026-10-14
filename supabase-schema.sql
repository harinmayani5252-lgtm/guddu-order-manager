-- ============================================================================
-- Guddu Order Manager — OPTIONAL Supabase cloud-sync schema
-- Run this in the Supabase SQL editor only if you enable Cloud Sync.
-- The app works fully offline without any of this.
-- ============================================================================

-- Customers ------------------------------------------------------------------
create table if not exists public.customers (
  id               text primary key,
  customer_name    text not null,
  mobile           text,
  office_address   text,
  delivery_address text,
  transport_name   text,
  broker_name      text,
  broker_phone     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Orders (items stored as JSONB so the sheet round-trips exactly) -------------
create table if not exists public.orders (
  id              text primary key,
  order_number    text not null,
  customer        jsonb not null,          -- snapshot of customer at order time
  order_date      date  not null,
  notes           text,
  payment_terms   text,
  items           jsonb not null default '[]'::jsonb,
  total_pieces    integer not null default 0,
  total_designs   integer not null default 0,
  total_sets      integer not null default 0,
  created_by      text,
  created_by_user text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_order_number_idx on public.orders (order_number);
create index if not exists orders_order_date_idx   on public.orders (order_date);
create index if not exists orders_updated_idx      on public.orders (updated_at);

-- Row Level Security ----------------------------------------------------------
-- The app authenticates with 10 shared local accounts (not Supabase Auth) and
-- syncs using the anon key. The policy below allows the anon role full access
-- so the shared team key can read/write. Because your data is not sensitive
-- personal data and access is limited to teammates holding the key, this is an
-- acceptable trade-off. If you later adopt Supabase Auth, tighten these.
alter table public.customers enable row level security;
alter table public.orders    enable row level security;

drop policy if exists "anon full customers" on public.customers;
drop policy if exists "anon full orders"    on public.orders;

create policy "anon full customers" on public.customers
  for all to anon using (true) with check (true);
create policy "anon full orders" on public.orders
  for all to anon using (true) with check (true);
