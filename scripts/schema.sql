-- ICE 3.0 Sprint Tracker — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ── Team members ─────────────────────────────────────────────────────────
create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text,  -- 'BE', 'FE', 'QA'
  created_at timestamptz default now()
);

-- ── Tasks (planning data from Excel, never overwritten by status updates) ─
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  fr           text not null,        -- e.g. FR-001
  task_num     text not null,        -- e.g. BE-01
  sprint       text not null,        -- e.g. Sprint 1
  wave         text,                 -- W0, W1, W2, W3
  task_type    text,                 -- Backend Dev / Frontend Dev / QA / Both Devs
  task_details text,
  estimate     numeric(5,2),         -- buffered estimate in days
  planned_start date,
  planned_end   date,
  -- Supabase-owned fields (never overwritten by sync)
  assignee_id  uuid references team_members(id),
  status       text default 'Not Started'
                check (status in ('Not Started','In Progress','Done','Blocked')),
  actual_start date,
  actual_end   date,
  actual_days  numeric(5,2),
  notes        text,
  -- Sync metadata
  synced_at    timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (fr, task_num)
);

-- ── Last sync log ─────────────────────────────────────────────────────────
create table if not exists sync_log (
  id         serial primary key,
  synced_at  timestamptz default now(),
  rows_added integer default 0,
  rows_updated integer default 0,
  rows_skipped integer default 0,
  source     text default 'ICE_Plan_v18.xlsx'
);

-- ── Auto-update updated_at ────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- ── Row Level Security (read: anyone with anon key, write: anon key) ──────
alter table tasks enable row level security;
alter table team_members enable row level security;
alter table sync_log enable row level security;

create policy "anon read tasks"  on tasks for select using (true);
create policy "anon write tasks" on tasks for all    using (true);
create policy "anon read team"   on team_members for select using (true);
create policy "anon write team"  on team_members for all    using (true);
create policy "anon read log"    on sync_log for select using (true);
create policy "anon write log"   on sync_log for all    using (true);
