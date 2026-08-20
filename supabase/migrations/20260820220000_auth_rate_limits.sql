create table if not exists public.auth_rate_limits (
  bucket_key text primary key,
  endpoint text not null,
  bucket_type text not null,
  identifier_hash text,
  ip_hash text,
  attempts integer not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_rate_limits_attempts_non_negative check (attempts >= 0),
  constraint auth_rate_limits_bucket_type_check check (bucket_type in ('ip', 'identifier'))
);

drop trigger if exists set_auth_rate_limits_updated_at on public.auth_rate_limits;
create trigger set_auth_rate_limits_updated_at
before update on public.auth_rate_limits
for each row execute function public.set_updated_at();

alter table public.auth_rate_limits enable row level security;

drop policy if exists "auth_rate_limits_manage_admin" on public.auth_rate_limits;
create policy "auth_rate_limits_manage_admin"
on public.auth_rate_limits for all
using (public.is_admin())
with check (public.is_admin());

create index if not exists auth_rate_limits_endpoint_idx
on public.auth_rate_limits (endpoint);

create index if not exists auth_rate_limits_blocked_until_idx
on public.auth_rate_limits (blocked_until)
where blocked_until is not null;
