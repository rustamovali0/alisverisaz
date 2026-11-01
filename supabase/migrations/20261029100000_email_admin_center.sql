begin;
alter table public.email_delivery_settings add column admin_address text not null default 'admin@alisveris.az';
alter table public.email_outbox drop constraint email_outbox_recipient_role_check;
alter table public.email_outbox add constraint email_outbox_recipient_role_check check(recipient_role in ('customer','seller','administrator'));
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 120),
  subject text not null check(length(subject) between 1 and 160 and subject !~ '[\r\n]'),
  body text not null check(length(body) between 1 and 20000),
  purpose text not null default 'service' check(purpose in ('service','marketing')),
  updated_at timestamptz not null default now()
);
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_payload jsonb not null,
  created_by uuid not null references public.profiles(id),
  subject text not null,
  body text not null,
  audience text not null check(audience in ('customer','seller','all','selected')),
  purpose text not null check(purpose in ('service','marketing')),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.email_outbox add column campaign_id uuid references public.email_campaigns(id);
create index email_outbox_campaign on public.email_outbox(campaign_id,status);
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
revoke all on public.email_templates,public.email_campaigns from public,anon,authenticated;
grant all on public.email_templates,public.email_campaigns to service_role;
insert into public.email_templates(name,subject,body,purpose) values
 ('Salamlaşma','ALİSVERİS.AZ-a xoş gəldiniz','Salam {ad}, hesabınız yaradıldı. Məhsulları kəşf etmək və sifarişlərinizi izləmək üçün hesabınıza daxil olun.','service'),
 ('Satıcı məlumatlandırılması','Mağazanız haqqında məlumat','Salam {ad}, {magaza} mağazanızla bağlı məlumatı satıcı panelinizdə yoxlayın.','service'),
 ('Sifariş xatırlatması','Sifarişinizlə bağlı yenilik','Salam {ad}, sifarişinizlə bağlı məlumat yenilənib. Son vəziyyətə hesabınızın sifarişlər bölməsindən baxa bilərsiniz.','service'),
 ('Xidmət elanı','ALİSVERİS.AZ xidmət məlumatı','Salam {ad}, sizin üçün vacib xidmət məlumatımız var.','service'),
 ('Kampaniya','Yeni təkliflər sizi gözləyir','Salam {ad}, yeni endirim və təkliflərimizlə tanış olun: {sayt}','marketing');

create function public.email_registration_admin_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare address text; meta jsonb; requested text;
begin
  if new.role::text not in ('customer','seller') then return new; end if;
  select admin_address into address from public.email_delivery_settings where enabled;
  if address is null then return new; end if;
  select raw_user_meta_data into meta from auth.users where id=new.id;
  requested:=case when meta->>'requested_role'='seller' or new.role::text='seller' then 'seller' else 'customer' end;
  insert into public.email_outbox(event_key,kind,recipient_role,to_address,payload)
  values('registration-admin:'||new.id,'registration_admin','administrator',address,
    jsonb_build_object('requested_role',requested,'name',coalesce(new.full_name,meta->>'full_name'),
      'email',new.email,'phone',to_jsonb(new)->>'phone','store',meta->>'store_name'))
  on conflict(event_key) do nothing;
  return new;
end $$;
create trigger email_registration_admin after insert on public.profiles for each row execute function public.email_registration_admin_notice();

create function public.email_queue_campaign(p_actor uuid,p_request uuid,p_audience text,p_selected uuid[],p_subject text,p_body text,p_purpose text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid; previous jsonb; payload jsonb; count_recipients integer;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role::text='admin') then raise exception 'EMAIL_ADMIN_REQUIRED'; end if;
  if not exists(select 1 from public.email_delivery_settings where enabled) then raise exception 'EMAIL_DELIVERY_DISABLED'; end if;
  if p_audience not in ('customer','seller','all','selected') or p_purpose not in ('service','marketing')
    or length(trim(p_subject)) not between 1 and 160 or p_subject ~ '[\r\n]'
    or length(trim(p_body)) not between 1 and 20000 or coalesce(cardinality(p_selected),0)>1000
    or (p_audience='selected' and coalesce(cardinality(p_selected),0)=0) then raise exception 'EMAIL_INVALID_CAMPAIGN'; end if;
  payload:=jsonb_build_object('audience',p_audience,'selected',p_selected,'subject',p_subject,'body',p_body,'purpose',p_purpose,'actor',p_actor);
  -- Serialize equal request IDs so retries do not send a second copy.
  perform pg_advisory_xact_lock(hashtext(p_request::text));
  select id,request_payload into cid,previous from public.email_campaigns where request_id=p_request;
  if cid is not null then
    if previous is distinct from payload then raise exception 'EMAIL_REQUEST_CONFLICT'; end if;
    return jsonb_build_object('id',cid,'count',(select recipient_count from public.email_campaigns where id=cid));
  end if;
  insert into public.email_campaigns(request_id,request_payload,created_by,subject,body,audience,purpose)
    values(p_request,payload,p_actor,p_subject,p_body,p_audience,p_purpose) returning id into cid;
  insert into public.email_outbox(event_key,kind,recipient_id,recipient_role,to_address,payload,campaign_id)
  select 'campaign:'||cid||':'||p.id,case when p_purpose='marketing' then 'campaign_marketing' else 'admin_campaign' end,
    p.id,p.role::text,lower(p.email),jsonb_build_object('title',
      replace(replace(replace(p_subject,'{ad}',coalesce(p.full_name,'İstifadəçi')),'{sayt}','https://alisveris.az'),'{magaza}',coalesce(s.name,'mağazanız')),
      'body',replace(replace(replace(p_body,'{ad}',coalesce(p.full_name,'İstifadəçi')),'{sayt}','https://alisveris.az'),'{magaza}',coalesce(s.name,'mağazanız'))),cid
  from public.profiles p join auth.users u on u.id=p.id
  left join public.email_preferences pref on pref.user_id=p.id
  left join lateral (select name from public.stores where owner_id=p.id order by id limit 1) s on true
  where p.role::text in ('customer','seller') and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(p.email)<=254 and p.email !~ '[\r\n]'
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())
    and (p_audience='all' or p.role::text=p_audience or (p_audience='selected' and p.id=any(p_selected)))
    and case when p_purpose='marketing' then coalesce(pref.marketing,false) else coalesce(pref.transactional,true) end
  on conflict(event_key) do nothing;
  get diagnostics count_recipients=row_count;
  update public.email_campaigns set recipient_count=count_recipients where id=cid;
  return jsonb_build_object('id',cid,'count',count_recipients);
end $$;
revoke all on function public.email_registration_admin_notice(),public.email_queue_campaign(uuid,uuid,text,uuid[],text,text,text) from public,anon,authenticated;
grant execute on function public.email_queue_campaign(uuid,uuid,text,uuid[],text,text,text) to service_role;

create function public.email_preview_campaign(p_actor uuid,p_audience text,p_selected uuid[],p_purpose text)
returns integer language plpgsql security definer set search_path='' as $$
declare result integer;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role::text='admin') then raise exception 'EMAIL_ADMIN_REQUIRED'; end if;
  if p_audience not in ('customer','seller','all','selected') or p_purpose not in ('service','marketing') then raise exception 'EMAIL_INVALID_CAMPAIGN'; end if;
  select count(*) into result from public.profiles p join auth.users u on u.id=p.id
    left join public.email_preferences pref on pref.user_id=p.id
    where p.role::text in ('customer','seller') and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(p.email)<=254 and p.email !~ '[\r\n]'
      and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())
      and (p_audience='all' or p.role::text=p_audience or (p_audience='selected' and p.id=any(p_selected)))
      and case when p_purpose='marketing' then coalesce(pref.marketing,false) else coalesce(pref.transactional,true) end;
  return result;
end $$;
create function public.email_campaign_history(p_limit integer default 20) returns jsonb
language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(result)),'[]') from (
    select c.id,c.subject,c.audience,c.purpose,c.recipient_count,c.created_at,
      (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='sent') as sent,
      (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status in ('pending','processing')) as pending,
      (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='failed') as failed,
      (select count(*) from public.email_outbox e where e.campaign_id=c.id and e.status='skipped') as skipped
    from public.email_campaigns c order by c.created_at desc limit greatest(1,least(p_limit,50))
  ) result;
$$;
revoke all on function public.email_preview_campaign(uuid,text,uuid[],text),public.email_campaign_history(integer) from public,anon,authenticated;
grant execute on function public.email_preview_campaign(uuid,text,uuid[],text),public.email_campaign_history(integer) to service_role;
commit;
