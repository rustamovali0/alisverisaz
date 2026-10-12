begin;
create table public.storage_capacity (
  provider text primary key check (provider in ('r2','local')),
  baseline_bytes bigint not null default 0 check (baseline_bytes >= 0),
  baseline_verified_at timestamptz,
  budget_bytes bigint not null check (budget_bytes > 0)
);
insert into public.storage_capacity(provider,budget_bytes) values ('r2',8000000000),('local',5000000000);
create table public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.storage_capacity(provider),
  owner_id uuid not null references public.profiles(id),
  object_key text not null unique,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  mime_type text not null default 'image/webp' check (mime_type='image/webp'),
  status text not null default 'reserved' check (status in ('reserved','ready','failed','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index storage_objects_capacity_idx on public.storage_objects(provider,status);
alter table public.storage_capacity enable row level security;
alter table public.storage_objects enable row level security;
revoke all on public.storage_capacity, public.storage_objects from public, anon, authenticated;
grant select,insert,update on public.storage_capacity,public.storage_objects to service_role;

create function public.reserve_image_storage(owner_uuid uuid, bytes_required bigint)
returns public.storage_objects language plpgsql security definer set search_path = '' as $$
declare
  capacity public.storage_capacity%rowtype;
  reservation public.storage_objects%rowtype;
  used_bytes bigint;
begin
  if bytes_required not between 1 and 20971520 then raise exception 'INVALID_IMAGE_SIZE'; end if;
  -- Always lock in the same order; existing R2 usage must be reconciled first.
  for capacity in select * from public.storage_capacity order by provider desc for update loop
    if capacity.baseline_verified_at is null then continue; end if;
    select coalesce(sum(size_bytes),0) into used_bytes from public.storage_objects
      where provider=capacity.provider and status in ('reserved','ready');
    if capacity.baseline_bytes + used_bytes + bytes_required > capacity.budget_bytes then continue; end if;
    insert into public.storage_objects(provider,owner_id,object_key,size_bytes)
      values(capacity.provider,owner_uuid,gen_random_uuid()::text || '.webp',bytes_required)
      returning * into reservation;
    return reservation;
  end loop;
  raise exception 'STORAGE_CAPACITY_UNAVAILABLE';
end;
$$;
revoke all on function public.reserve_image_storage(uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_image_storage(uuid,bigint) to service_role;
notify pgrst, 'reload schema';
commit;
