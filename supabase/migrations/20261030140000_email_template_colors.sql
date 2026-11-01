begin;
alter table public.email_system_templates add column theme jsonb not null default '{}'::jsonb check(jsonb_typeof(theme)='object');
commit;
