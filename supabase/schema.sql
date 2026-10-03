-- Run in your Supabase SQL editor. Also enable Auth > Providers > Anonymous sign-ins.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, business text, sector text, volume text, goal text, tone text,
  shortcuts text[] default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.agents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, instructions text default '',
  voice_enabled boolean default false, voice text,
  status text not null default 'draft' check (status in ('online','draft')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null, email text,
  status text not null default 'pending' check (status in ('pending','trialing','active','canceled','failed')),
  trial_ends_at timestamptz, swychr_reference text,
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.profiles, public.agents to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.profiles, public.agents, public.subscriptions to service_role;

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own agents" on public.agents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- Users may only create/refresh a *pending* row; your Railway backend (service role) sets trialing/active after SwyChr confirms.
create policy "create pending subscription" on public.subscriptions for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "reset to pending" on public.subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'pending');
