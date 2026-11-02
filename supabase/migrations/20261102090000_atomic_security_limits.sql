begin;
create table if not exists public.security_rate_buckets (
 bucket_key text primary key check (length(bucket_key) <= 90),
 attempts integer not null check (attempts >= 0),
 expires_at timestamptz not null
);
alter table public.security_rate_buckets enable row level security;
revoke all on public.security_rate_buckets from public, anon, authenticated;
grant all on public.security_rate_buckets to service_role;
create or replace function public.security_consume_rate(p_key text,p_limit integer,p_window integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.security_rate_buckets; t timestamptz := clock_timestamp();
begin
 if p_key !~ '^security:v1:[a-f0-9]{64}$' or p_limit < 1 or p_limit > 100000 or p_window < 1 or p_window > 86400 then raise exception 'invalid limit'; end if;
 insert into public.security_rate_buckets values(p_key,1,t+make_interval(secs=>p_window))
 on conflict(bucket_key) do update set
 attempts=case when security_rate_buckets.expires_at <= t then 1 else least(security_rate_buckets.attempts+1,p_limit+1) end,
 expires_at=case when security_rate_buckets.expires_at <= t then t+make_interval(secs=>p_window) else security_rate_buckets.expires_at end
 returning * into b;
 return jsonb_build_object('allowed',b.attempts<=p_limit,'remaining',greatest(0,p_limit-b.attempts),'retry_after',greatest(1,ceil(extract(epoch from (b.expires_at-t)))));
end $$;
create or replace function public.security_reset_rate(p_key text) returns void language sql security definer set search_path='' as $$ delete from public.security_rate_buckets where bucket_key=p_key; $$;
create or replace function public.security_prune_rates() returns bigint language plpgsql security definer set search_path='' as $$
declare n bigint; begin
 delete from public.security_rate_buckets where bucket_key in(select bucket_key from public.security_rate_buckets where expires_at<now()-interval '1 day' limit 10000);
 get diagnostics n=row_count; return n; end $$;
revoke all on function public.security_consume_rate(text,integer,integer), public.security_reset_rate(text), public.security_prune_rates() from public,anon,authenticated;
grant execute on function public.security_consume_rate(text,integer,integer), public.security_reset_rate(text), public.security_prune_rates() to service_role;
commit;
