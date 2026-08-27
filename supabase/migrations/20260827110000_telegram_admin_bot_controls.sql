alter table public.admin_audit_logs
add column if not exists success boolean not null default true,
add column if not exists telegram_user_id text,
add column if not exists telegram_chat_id text;

alter table public.profiles
add column if not exists session_revoked_at timestamptz;

create table if not exists public.telegram_pending_admin_actions (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique,
  telegram_user_id text not null,
  telegram_chat_id text not null,
  command text not null,
  command_args text,
  phase text not null default 'password',
  message_id bigint,
  callback_message_id bigint,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint telegram_pending_admin_actions_phase_check
    check (phase in ('password', 'confirmation')),
  constraint telegram_pending_admin_actions_command_check
    check (command ~ '^/[a-z0-9_]+$')
);

create index if not exists telegram_pending_admin_actions_lookup_idx
on public.telegram_pending_admin_actions (telegram_user_id, telegram_chat_id, phase, expires_at)
where used_at is null;

create index if not exists telegram_pending_admin_actions_expires_idx
on public.telegram_pending_admin_actions (expires_at)
where used_at is null;

alter table public.telegram_pending_admin_actions enable row level security;

create table if not exists public.telegram_rate_limits (
  bucket_key text primary key,
  scope text not null,
  attempts integer not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_rate_limits_attempts_non_negative check (attempts >= 0)
);

drop trigger if exists set_telegram_rate_limits_updated_at on public.telegram_rate_limits;
create trigger set_telegram_rate_limits_updated_at
before update on public.telegram_rate_limits
for each row execute function public.set_updated_at();

create index if not exists telegram_rate_limits_scope_idx
on public.telegram_rate_limits (scope);

create index if not exists telegram_rate_limits_blocked_until_idx
on public.telegram_rate_limits (blocked_until)
where blocked_until is not null;

alter table public.telegram_rate_limits enable row level security;

create table if not exists public.admin_session_registry (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_login_at timestamptz not null default now(),
  last_logout_all_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_admin_session_registry_updated_at on public.admin_session_registry;
create trigger set_admin_session_registry_updated_at
before update on public.admin_session_registry
for each row execute function public.set_updated_at();

create index if not exists admin_session_registry_active_idx
on public.admin_session_registry (is_active, last_login_at desc);

alter table public.admin_session_registry enable row level security;

insert into public.platform_settings (key, value)
values
  ('order_notifications_enabled', 'true'::jsonb),
  ('user_notifications_enabled', 'true'::jsonb),
  ('seller_notifications_enabled', 'true'::jsonb),
  ('admin_notifications_enabled', 'true'::jsonb),
  ('admin_panel_enabled', 'true'::jsonb),
  ('seller_panel_enabled', 'true'::jsonb),
  ('user_access_enabled', 'true'::jsonb),
  ('site_enabled', 'true'::jsonb)
on conflict (key) do nothing;
