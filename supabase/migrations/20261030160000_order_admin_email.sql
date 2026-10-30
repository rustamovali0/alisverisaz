begin;
insert into public.email_system_templates(key,name,title,body,button_label) values
('order_created_admin','Yeni sifariş → administrator','Yeni sifariş yaradıldı','Sifariş: {sifaris}. Mağaza: {magaza}. Status: {status}.','Sifarişə bax') on conflict(key) do nothing;
create or replace function public.email_order_admin_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare address text;
begin
 select admin_address into address from public.email_delivery_settings where enabled;
 if address is null or exists(select 1 from public.platform_settings where key='site' and value->>'order_email_notifications_enabled'='false') then return new; end if;
 insert into public.email_outbox(event_key,kind,recipient_role,to_address,payload)
 values('order-admin:'||new.id,'order_created','administrator',address,jsonb_build_object('order_id',new.id,'audience','administrator','status',new.status,'payment_status',new.payment_status)) on conflict(event_key) do nothing;
 return new;
end $$;
revoke all on function public.email_order_admin_notice() from public,anon,authenticated;
create trigger email_order_admin after insert on public.orders for each row execute function public.email_order_admin_notice();
commit;
