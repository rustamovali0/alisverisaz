-- Read-only catalog audit. No application rows, credentials or auth tokens.
select current_database() as database, current_user as auditor;
select c.relname as table_name,c.relrowsecurity as rls,c.relforcerowsecurity as forced,
 (select count(*) from pg_policy p where p.polrelid=c.oid) as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname;
select n.nspname as schema,p.proname as function,p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as user_execute,p.proconfig as fixed_settings
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef order by p.proname;
select policyname,tablename,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname;
