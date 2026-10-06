-- Keep session revocation available on installations missing the Telegram migration.
alter table public.profiles
  add column if not exists session_revoked_at timestamptz;

notify pgrst, 'reload schema';
