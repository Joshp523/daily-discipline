-- Daily Discipline: push reminders.
-- Run once in Supabase (the project Daily Discipline syncs to): SQL Editor > New query > paste > Run.
-- Each phone that turns on reminders gets one row. The dd-remind function reads them every hour.
create table if not exists dd_push_subs(
  endpoint text primary key,
  owner uuid not null default auth.uid(),
  sub jsonb not null,
  tz text not null default 'America/New_York',
  hours int[] not null default '{9,13,18,20,21,22}',
  last_slot text,
  updated_at timestamptz not null default now()
);
alter table dd_push_subs enable row level security;
drop policy if exists "own reminder rows" on dd_push_subs;
create policy "own reminder rows" on dd_push_subs for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on dd_push_subs to authenticated;

-- The hourly alarm clock.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('dd-remind') where exists (select 1 from cron.job where jobname = 'dd-remind');
select cron.schedule('dd-remind', '0 * * * *', $$
  select net.http_post(
    url := 'https://hrhlgscfgqjqslejlpqa.supabase.co/functions/v1/dd-remind',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"tick":1}'::jsonb)
$$);
