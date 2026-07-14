-- Kitchen Kit Tracker Supabase schema
-- Run this in Supabase SQL Editor first, then open kitchen-kit-tracker-supabase.html.
-- Supabase JS apps use a public anon key in the browser; RLS policies below restrict data to app_users only.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  email text primary key,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

insert into public.app_users (email, role) values
  ('info@temporary-kitchens.com', 'admin'),
  ('catering.trailer.hire@gmail.com', 'staff')
on conflict (email) do update set role = excluded.role;

create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  old_code text,
  name text not null,
  category text not null,
  status text not null default 'Available' check (status in ('Available','On Hire','In Repair','Lost','Retired')),
  condition text not null default 'Good' check (condition in ('Good','Damaged','In Repair','Lost','Retired')),
  location text default 'Yard',
  serial text,
  replacement_value numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_no text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  site text,
  contact_name text,
  contact_phone text,
  start_date date not null,
  end_date date not null,
  status text not null default 'Quoted' check (status in ('Quoted','Confirmed','Out','Returned','Completed','Cancelled')),
  value numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.job_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  out_at timestamptz,
  returned_at timestamptz,
  return_condition text,
  notes text,
  unique(job_id, asset_id)
);

create table if not exists public.damage_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  reported_date date not null default current_date,
  reported_by text,
  severity text not null default 'Medium' check (severity in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In Repair','Repaired','Charged','Written Off')),
  repair_cost numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigserial primary key,
  event_type text not null,
  message text not null,
  user_email text,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists touch_customers on public.customers;
create trigger touch_customers before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists touch_assets on public.assets;
create trigger touch_assets before update on public.assets for each row execute function public.touch_updated_at();
drop trigger if exists touch_jobs on public.jobs;
create trigger touch_jobs before update on public.jobs for each row execute function public.touch_updated_at();
drop trigger if exists touch_damage_logs on public.damage_logs;
create trigger touch_damage_logs before update on public.damage_logs for each row execute function public.touch_updated_at();

alter table public.app_users enable row level security;
alter table public.customers enable row level security;
alter table public.assets enable row level security;
alter table public.jobs enable row level security;
alter table public.job_assets enable row level security;
alter table public.damage_logs enable row level security;
alter table public.activity_log enable row level security;

do $$ begin
  perform 1;
exception when others then null;
end $$;

-- Drop/recreate policies safely
DO $$ DECLARE r record; BEGIN
  FOR r IN (select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('app_users','customers','assets','jobs','job_assets','damage_logs','activity_log')) LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

create policy "app users can read app users" on public.app_users for select to authenticated using (public.is_app_user());
create policy "app users can read customers" on public.customers for select to authenticated using (public.is_app_user());
create policy "app users can write customers" on public.customers for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "app users can read assets" on public.assets for select to authenticated using (public.is_app_user());
create policy "app users can write assets" on public.assets for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "app users can read jobs" on public.jobs for select to authenticated using (public.is_app_user());
create policy "app users can write jobs" on public.jobs for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "app users can read job assets" on public.job_assets for select to authenticated using (public.is_app_user());
create policy "app users can write job assets" on public.job_assets for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "app users can read damage" on public.damage_logs for select to authenticated using (public.is_app_user());
create policy "app users can write damage" on public.damage_logs for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "app users can read activity" on public.activity_log for select to authenticated using (public.is_app_user());
create policy "app users can write activity" on public.activity_log for insert to authenticated with check (public.is_app_user());

create index if not exists idx_assets_code on public.assets(code);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_jobs_dates on public.jobs(start_date, end_date);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_job_assets_job on public.job_assets(job_id);
create index if not exists idx_job_assets_asset on public.job_assets(asset_id);
create index if not exists idx_damage_asset on public.damage_logs(asset_id);
