create table if not exists public.tracked_opportunities (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 preparation_start date,
 end_date date,
 calendar_event_id uuid references public.calendar_events(id) on delete set null,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id, opportunity_id),
 check (preparation_start is null or end_date is null or preparation_start <= end_date)
);
alter table public.tracked_opportunities enable row level security;
drop policy if exists "Users read own tracked opportunities" on public.tracked_opportunities;
create policy "Users read own tracked opportunities" on public.tracked_opportunities for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users insert own tracked opportunities" on public.tracked_opportunities;
create policy "Users insert own tracked opportunities" on public.tracked_opportunities for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users update own tracked opportunities" on public.tracked_opportunities;
create policy "Users update own tracked opportunities" on public.tracked_opportunities for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Users delete own tracked opportunities" on public.tracked_opportunities;
create policy "Users delete own tracked opportunities" on public.tracked_opportunities for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.tracked_opportunities to authenticated;
