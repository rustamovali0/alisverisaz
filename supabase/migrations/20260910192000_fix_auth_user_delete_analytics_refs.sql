do $$
begin
  if to_regclass('public.product_views') is not null then
    alter table public.product_views
      drop constraint if exists product_views_user_id_fkey;

    alter table public.product_views
      add constraint product_views_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if to_regclass('public.store_views') is not null then
    alter table public.store_views
      drop constraint if exists store_views_user_id_fkey;

    alter table public.store_views
      add constraint store_views_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;
