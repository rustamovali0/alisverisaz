create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  type text not null default 'info',
  target text not null default 'all',
  plan_ids uuid[] not null default '{}'::uuid[],
  store_ids uuid[] not null default '{}'::uuid[],
  starts_at timestamptz,
  ends_at timestamptz,
  is_dismissible boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements
  add column if not exists body text,
  add column if not exists type text not null default 'info',
  add column if not exists target text not null default 'all',
  add column if not exists plan_ids uuid[] not null default '{}'::uuid[],
  add column if not exists store_ids uuid[] not null default '{}'::uuid[],
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists is_dismissible boolean not null default true,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcements_type_check'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_type_check
      check (type in ('info', 'warning', 'campaign', 'maintenance'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcements_target_check'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_target_check
      check (target in ('all', 'seller', 'customer', 'admin', 'store'));
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

create index if not exists announcements_target_active_idx
on public.announcements (target, is_active);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_active" on public.announcements;
create policy "announcements_select_active"
on public.announcements
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);

drop policy if exists "announcements_manage_admin" on public.announcements;
create policy "announcements_manage_admin"
on public.announcements
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
