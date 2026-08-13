create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text,
  email text,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'open',
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_messages_status_check check (status in ('open', 'answered', 'closed'))
);

alter table public.support_messages enable row level security;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null
    and not exists (
      select 1
      from pg_trigger
      where tgname = 'set_support_messages_updated_at'
    )
  then
    create trigger set_support_messages_updated_at
      before update on public.support_messages
      for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists support_messages_user_id_idx on public.support_messages(user_id);
create index if not exists support_messages_status_idx on public.support_messages(status);
create index if not exists support_messages_created_at_idx on public.support_messages(created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
      and policyname = 'support_messages_insert_anyone'
  ) then
    create policy support_messages_insert_anyone
      on public.support_messages
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
      and policyname = 'support_messages_select_own_or_admin'
  ) then
    create policy support_messages_select_own_or_admin
      on public.support_messages
      for select
      using (
        auth.uid() = user_id
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
      and policyname = 'support_messages_update_admin'
  ) then
    create policy support_messages_update_admin
      on public.support_messages
      for update
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'support_messages'
      and policyname = 'support_messages_delete_admin'
  ) then
    create policy support_messages_delete_admin
      on public.support_messages
      for delete
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      );
  end if;
end $$;
