-- Run in your Supabase SQL editor (safe to re-run).
-- Auth: enable Email and Google in Authentication > Providers.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, business text, sector text, volume text, goal text, tone text,
  shortcuts text[] default '{}',
  onboarding_completed boolean not null default false,
  updated_at timestamptz default now()
);
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

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

-- WhatsApp pairing: the app sets status 'pending'; your WhatsApp worker writes qr / 'connected'.
create table if not exists public.whatsapp_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'idle' check (status in ('idle','pending','qr','connected','disconnected')),
  qr text, phone text,
  updated_at timestamptz default now()
);

create table if not exists public.antispam_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}',
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.profiles, public.agents, public.antispam_settings to authenticated;
grant select, insert, update on public.subscriptions, public.whatsapp_sessions to authenticated;
grant all on public.profiles, public.agents, public.subscriptions, public.whatsapp_sessions, public.antispam_settings to service_role;

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.subscriptions enable row level security;
alter table public.whatsapp_sessions enable row level security;
alter table public.antispam_settings enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own agents" on public.agents;
create policy "own agents" on public.agents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own antispam" on public.antispam_settings;
create policy "own antispam" on public.antispam_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- Users may only write a *pending* row; the swychr-webhook function (service role) sets trialing/active.
drop policy if exists "create pending subscription" on public.subscriptions;
create policy "create pending subscription" on public.subscriptions for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "reset to pending" on public.subscriptions;
create policy "reset to pending" on public.subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "read own wa session" on public.whatsapp_sessions;
create policy "read own wa session" on public.whatsapp_sessions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "request pairing" on public.whatsapp_sessions;
create policy "request pairing" on public.whatsapp_sessions for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "re-request pairing" on public.whatsapp_sessions;
create policy "re-request pairing" on public.whatsapp_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and status = 'pending');

-- Realtime for live QR / connection status.
do $$ begin alter publication supabase_realtime add table public.whatsapp_sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.subscriptions; exception when duplicate_object then null; end $$;
