alter table public.telegram_pending_admin_actions
drop constraint if exists telegram_pending_admin_actions_phase_check;

alter table public.telegram_pending_admin_actions
add constraint telegram_pending_admin_actions_phase_check
check (phase in ('password', 'confirmation', 'unlock'));
