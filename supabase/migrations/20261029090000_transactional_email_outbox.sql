-- Prepared only: delivery remains OFF until sender credentials are supplied.
begin;
create table public.email_delivery_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false
);
insert into public.email_delivery_settings default values;
create table public.email_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  transactional boolean not null default true,
  marketing boolean not null default false
);
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('customer','seller')),
  to_address text not null check (to_address !~ '[\r\n]' and length(to_address) <= 254),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','skipped')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 6),
  available_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  locked_at timestamptz,
  lock_token uuid,
  sent_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now()
);
create index email_outbox_ready on public.email_outbox(available_at,created_at) where status in ('pending','processing');
alter table public.email_delivery_settings enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_outbox enable row level security;
revoke all on public.email_delivery_settings, public.email_outbox from anon, authenticated;
revoke all on public.email_preferences from anon, authenticated;
grant select,insert,update,delete on public.email_preferences to authenticated;
create policy email_preferences_own on public.email_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on public.email_delivery_settings, public.email_preferences, public.email_outbox to service_role;

create function public.email_enqueue(p_user uuid, p_kind text, p_key text, p_payload jsonb,
  p_guest_email text default null) returns void language plpgsql security definer set search_path='' as $$
declare v_email text; v_role text; v_allowed boolean;
begin
  if not exists(select 1 from public.email_delivery_settings where enabled) then return; end if;
  if p_user is not null then
    select email, role::text into v_email,v_role from public.profiles where id=p_user;
    if v_role not in ('customer','seller') then return; end if;
    select case when p_kind='promo' then marketing else transactional end into v_allowed
      from public.email_preferences where user_id=p_user;
    if not coalesce(v_allowed, p_kind <> 'promo') then return; end if;
  else
    if p_guest_email is null or p_kind not like 'order_%' then return; end if;
    v_email := p_guest_email; v_role := 'customer';
  end if;
  if v_email is null or length(v_email)>254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email ~ '[\r\n]' then return; end if;
  insert into public.email_outbox(event_key,kind,recipient_id,recipient_role,to_address,payload)
    values(p_key,p_kind,p_user,v_role,lower(v_email),p_payload)
    on conflict(event_key) do nothing;
end $$;

create function public.email_on_event() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new); o jsonb; owner uuid; buyer uuid; guest text; kind text; k text; data jsonb;
begin
  if not exists(select 1 from public.email_delivery_settings where enabled) then return new; end if;
  if tg_op='UPDATE' then o:=to_jsonb(old); end if;
  k:=tg_table_name||':'||(n->>'id');
  if tg_table_name='orders' then
    if exists(select 1 from public.platform_settings where key='site' and value->>'order_email_notifications_enabled'='false') then return new; end if;
    if tg_op='INSERT' then kind:='order_created';
    elsif n->>'status' is distinct from o->>'status' and n->>'status' <> 'archived' then kind:='order_status';
    elsif n->>'payment_status' is distinct from o->>'payment_status' then kind:='order_payment';
    else return new; end if;
    select owner_id into owner from public.stores where id=(n->>'store_id')::uuid;
    buyer:=(n->>'user_id')::uuid;
    if buyer is null then select email into guest from public.customers where id=(n->>'customer_id')::uuid; end if;
    data:=jsonb_build_object('order_id',n->>'id','status',n->>'status','payment_status',n->>'payment_status');
    -- Separate transitions can revisit a previous status. Each committed transition has its own event.
    if tg_op='UPDATE' then k:=k||':'||gen_random_uuid()::text; end if;
    perform public.email_enqueue(buyer,kind,k||':buyer',data||'{"audience":"customer"}',guest);
    perform public.email_enqueue(owner,kind,k||':seller',data||'{"audience":"seller"}');
  elsif tg_table_name='notifications' then
    -- These have richer dedicated triggers; do not send duplicate notification emails.
    if n->>'type' in ('order_created','new_order','order_status','order_status_updated','message_reply','stock_low') then return new; end if;
    perform public.email_enqueue((n->>'user_id')::uuid,case when n->>'type'='promo' then 'promo' else 'notification' end,
      k, jsonb_build_object('title',n->>'title','body',n->>'body'));
  elsif tg_table_name='profiles' then
    if tg_op='INSERT' then
      perform public.email_enqueue(new.id,'welcome',k,jsonb_build_object('name',n->>'full_name'));
    elsif n->>'role'='seller' and n->>'role' is distinct from o->>'role' then
      perform public.email_enqueue(new.id,'seller_approved',k||':approved',jsonb_build_object('title','Satıcı hesabınız təsdiqləndi'));
    end if;
  elsif tg_table_name='stores' then
    if n->>'status' is distinct from o->>'status' then
      perform public.email_enqueue((n->>'owner_id')::uuid,'store_status',k||':'||gen_random_uuid()::text,
        jsonb_build_object('title','Mağaza statusu yeniləndi','body',n->>'name','status',n->>'status'));
    end if;
  elsif tg_table_name='product_messages' then
    if tg_op='INSERT' then
      select owner_id into owner from public.stores where id=(n->>'store_id')::uuid;
      if owner is distinct from (n->>'sender_id')::uuid then
        perform public.email_enqueue(owner,'message',k,jsonb_build_object('title','Yeni müştəri mesajı','body','Mesajı mağaza panelindən oxuya bilərsiniz.'));
      end if;
    elsif n->>'reply_message' is distinct from o->>'reply_message' and nullif(n->>'reply_message','') is not null then
      perform public.email_enqueue((n->>'sender_id')::uuid,'message_reply',k||':reply:'||gen_random_uuid()::text,
        jsonb_build_object('title','Mesajınıza cavab gəldi','body','Cavabı hesabınızda oxuya bilərsiniz.'));
    end if;
  elsif tg_table_name='reviews' then
    if tg_op='INSERT' then
      select s.owner_id into owner from public.products p join public.stores s on s.id=p.store_id where p.id=(n->>'product_id')::uuid;
      if owner is distinct from (n->>'user_id')::uuid then
        perform public.email_enqueue(owner,'review',k,jsonb_build_object('title','Məhsula yeni rəy yazıldı','body','Rəy moderasiya qaydalarına uyğun paneldə görünəcək.'));
      end if;
    end if;
  elsif tg_table_name='products' then
    if coalesce((n->>'stock_quantity')::integer,0)<=5 and coalesce((o->>'stock_quantity')::integer,0)>5 then
      select owner_id into owner from public.stores where id=(n->>'store_id')::uuid;
      perform public.email_enqueue(owner,'stock_low',k||':stock:'||gen_random_uuid()::text,
        jsonb_build_object('title','Məhsulun stoku azalır','body',n->>'name','stock',n->>'stock_quantity'));
    end if;
  end if;
  return new;
end $$;
create trigger email_orders after insert or update on public.orders for each row execute function public.email_on_event();
create trigger email_notifications after insert on public.notifications for each row execute function public.email_on_event();
create trigger email_profiles after insert or update on public.profiles for each row execute function public.email_on_event();
create trigger email_stores after update on public.stores for each row execute function public.email_on_event();
create trigger email_messages after insert or update on public.product_messages for each row execute function public.email_on_event();
create trigger email_reviews after insert on public.reviews for each row execute function public.email_on_event();
create trigger email_stock after update on public.products for each row execute function public.email_on_event();

create function public.email_claim_jobs(p_limit integer default 10) returns setof public.email_outbox
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.email_delivery_settings where enabled) then return; end if;
  update public.email_outbox set status='failed',last_error_code='expired_or_attempts_exhausted',lock_token=null
    where status in ('pending','processing') and (expires_at<now() or (attempt_count>=6 and locked_at<now()-interval '10 minutes'));
  return query with ready as (
    select id from public.email_outbox
    where attempt_count<6 and expires_at>now() and available_at<=now()
      and (status='pending' or (status='processing' and locked_at<now()-interval '10 minutes'))
    order by created_at for update skip locked limit greatest(1,least(p_limit,10))
  ) update public.email_outbox e set status='processing',attempt_count=attempt_count+1,locked_at=now(),lock_token=gen_random_uuid()
    from ready where e.id=ready.id returning e.*;
end $$;
create function public.email_finish_job(p_id uuid,p_token uuid,p_result text,p_code text default null,p_message_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_result not in ('sent','retry','failed','skipped') then raise exception 'INVALID_EMAIL_RESULT'; end if;
  update public.email_outbox set
    status=case when p_result='retry' then case when attempt_count>=6 then 'failed' else 'pending' end else p_result end,
    available_at=now()+make_interval(secs=>least(3600,30*power(2,attempt_count-1))::integer),
    sent_at=case when p_result='sent' then now() else null end,
    provider_message_id=case when p_result='sent' then left(p_message_id,255) else null end,
    last_error_code=left(regexp_replace(coalesce(p_code,''),'[^a-zA-Z0-9_-]','','g'),80),
    lock_token=null,locked_at=null
    where id=p_id and lock_token=p_token and status='processing';
  return found;
end $$;
revoke all on function public.email_enqueue(uuid,text,text,jsonb,text), public.email_on_event(),
  public.email_claim_jobs(integer),public.email_finish_job(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.email_claim_jobs(integer),public.email_finish_job(uuid,uuid,text,text,text) to service_role;
commit;
