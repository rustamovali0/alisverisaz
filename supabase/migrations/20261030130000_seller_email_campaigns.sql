begin;
create table public.seller_email_permissions (
 store_id uuid primary key references public.stores(id) on delete cascade,
 enabled boolean not null default false,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now()
);
alter table public.seller_email_permissions enable row level security;
revoke all on public.seller_email_permissions from public,anon,authenticated;
grant all on public.seller_email_permissions to service_role;
alter table public.email_campaigns add column sender_store_id uuid references public.stores(id) on delete set null;
alter table public.email_campaigns add column created_by_role text not null default 'admin' check(created_by_role in ('admin','seller'));
create index email_campaigns_seller_history on public.email_campaigns(created_by,created_at desc) where created_by_role='seller';

create function public.email_seller_allowed(p_actor uuid,p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.stores s join public.profiles p on p.id=s.owner_id join auth.users owner_user on owner_user.id=p.id join public.seller_email_permissions ep on ep.store_id=s.id
 where s.id=p_store and s.owner_id=p_actor and s.status::text='active' and p.role::text='seller' and owner_user.deleted_at is null and (owner_user.banned_until is null or owner_user.banned_until<now()) and ep.enabled
 and exists(select 1 from public.promotion_requests pr where pr.store_id=s.id and pr.target_type::text='store' and pr.status::text='approved' and pr.starts_at<=now() and (pr.ends_at is null or pr.ends_at>now())));
$$;
create function public.email_seller_eligible_stores(p_actor uuid) returns table(id uuid,name text,slug text) language sql stable security definer set search_path='' as $$
 select s.id,s.name::text,s.slug::text from public.stores s where s.owner_id=p_actor and public.email_seller_allowed(p_actor,s.id) order by s.name;
$$;
create function public.email_preview_seller_campaign(p_actor uuid,p_store uuid) returns integer language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 if not public.email_seller_allowed(p_actor,p_store) then raise exception 'EMAIL_SELLER_ACCESS_DENIED'; end if;
 if not exists(select 1 from public.email_delivery_settings where enabled) then raise exception 'EMAIL_DELIVERY_DISABLED'; end if;
 select count(*) into amount from public.profiles p join auth.users u on u.id=p.id join public.email_preferences ep on ep.user_id=p.id
 where p.role::text in ('customer','seller') and p.id<>p_actor and ep.marketing and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())
 and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(p.email)<=254 and p.email !~ '[\r\n]';
 return amount;
end $$;
create function public.email_queue_seller_campaign(p_actor uuid,p_store uuid,p_request uuid,p_subject text,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cid uuid; previous public.email_campaigns%rowtype; count_recipients integer; shop text; payload jsonb;
begin
 if not public.email_seller_allowed(p_actor,p_store) then raise exception 'EMAIL_SELLER_ACCESS_DENIED'; end if;
 if not exists(select 1 from public.email_delivery_settings where enabled) then raise exception 'EMAIL_DELIVERY_DISABLED'; end if;
 if p_request is null or p_subject is null or p_body is null or length(trim(p_subject)) not between 1 and 160 or p_subject ~ '[\r\n]' or length(trim(p_body)) not between 1 and 5000 then raise exception 'EMAIL_INVALID_CAMPAIGN'; end if;
 perform pg_advisory_xact_lock(hashtext('seller-email:'||p_actor::text));
 payload:=jsonb_build_object('actor',p_actor,'store',p_store,'subject',p_subject,'body',p_body);
 select * into previous from public.email_campaigns where request_id=p_request;
 if found then
  if previous.created_by<>p_actor or previous.request_payload is distinct from payload then raise exception 'EMAIL_REQUEST_CONFLICT'; end if;
  return jsonb_build_object('id',previous.id,'count',previous.recipient_count);
 end if;
 if exists(select 1 from public.email_campaigns where created_by=p_actor and created_by_role='seller' and created_at>now()-interval '24 hours') then raise exception 'EMAIL_SELLER_DAILY_LIMIT'; end if;
 select name into shop from public.stores where id=p_store;
 insert into public.email_campaigns(request_id,request_payload,created_by,subject,body,audience,purpose,sender_store_id,created_by_role)
 values(p_request,payload,p_actor,shop||' — '||p_subject,p_body,'all','marketing',p_store,'seller') returning id into cid;
 insert into public.email_outbox(event_key,kind,recipient_id,recipient_role,to_address,payload,campaign_id)
 select 'seller-campaign:'||cid||':'||p.id,'seller_campaign',p.id,p.role::text,lower(p.email),
 jsonb_build_object('title',shop||' — '||p_subject,'body',p_body,'campaign_subject',p_subject,'sender_store_id',p_store,'sender_id',p_actor),cid
 from public.profiles p join auth.users u on u.id=p.id join public.email_preferences ep on ep.user_id=p.id
 where p.role::text in ('customer','seller') and p.id<>p_actor and ep.marketing and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())
 and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(p.email)<=254 and p.email !~ '[\r\n]';
 get diagnostics count_recipients=row_count;
 if count_recipients=0 then raise exception 'EMAIL_NO_ELIGIBLE_RECIPIENTS'; end if;
 update public.email_campaigns set recipient_count=count_recipients where id=cid;
 return jsonb_build_object('id',cid,'count',count_recipients);
end $$;
create function public.email_seller_campaign_history(p_actor uuid) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(result)),'[]') from (
  select c.id,c.subject,c.recipient_count,c.created_at,
   (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='sent') as sent,
   (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status in ('pending','processing')) as pending,
   (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='failed') as failed,
   (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='skipped') as skipped
  from public.email_campaigns c where c.created_by=p_actor and c.created_by_role='seller' order by c.created_at desc limit 20
 ) result;
$$;
revoke all on function public.email_seller_allowed(uuid,uuid),public.email_seller_eligible_stores(uuid),public.email_preview_seller_campaign(uuid,uuid),public.email_queue_seller_campaign(uuid,uuid,uuid,text,text),public.email_seller_campaign_history(uuid) from public,anon,authenticated;
grant execute on function public.email_seller_allowed(uuid,uuid),public.email_seller_eligible_stores(uuid),public.email_preview_seller_campaign(uuid,uuid),public.email_queue_seller_campaign(uuid,uuid,uuid,text,text),public.email_seller_campaign_history(uuid) to service_role;
commit;
