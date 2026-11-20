-- Daily Discipline: the public accountability board (guest mode).
-- Run once in Supabase (the project Daily Discipline syncs to): SQL Editor > New query > paste > Run.
-- Josh's app writes a summary here after every sync: workouts, streaks, sleep, run pace, bodyweight,
-- and only whether each week was under budget. No money amounts, no bank data. Anyone can read it.
create table if not exists dd_public(
  id text primary key,
  owner uuid not null default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table dd_public enable row level security;
drop policy if exists "anyone reads the board" on dd_public;
drop policy if exists "owner writes the board" on dd_public;
drop policy if exists "owner updates the board" on dd_public;
create policy "anyone reads the board" on dd_public for select to anon, authenticated using (true);
create policy "owner writes the board" on dd_public for insert to authenticated with check (owner = auth.uid());
create policy "owner updates the board" on dd_public for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select on dd_public to anon;
