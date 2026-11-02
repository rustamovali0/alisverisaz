"""Local safety tests; no network, Docker, production SQL or PM2 invocation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('rollout', Path(__file__).with_name('rollout.py'))
rollout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rollout)

SITE = '''server { listen 80; server_name alisveris.az www.alisveris.az *.alisveris.az; return 301 https://$host$request_uri; }
server { listen 443 ssl; server_name alisveris.az www.alisveris.az *.alisveris.az;
client_max_body_size 32m;
location / { proxy_pass http://localhost:3004;
proxy_set_header X-Forwarded-For $remote_addr;
}}
'''


class RolloutSafety(unittest.TestCase):
    def test_project_ingress_preserves_tls_and_upstream(self):
        result = rollout.render_site(SITE, '/trusted-ip.conf', '/security.conf')
        self.assertIn('listen 443 ssl', result)
        self.assertIn('proxy_pass http://localhost:3004', result)
        self.assertEqual(result.count('client_max_body_size'), 1)
        self.assertEqual(result.count('include /trusted-ip.conf;'), 2)
        self.assertIn('proxy_set_header X-Real-IP $remote_addr;', result)
        self.assertIn('proxy_set_header CF-Connecting-IP "";', result)

    def test_unknown_or_already_configured_ingress_is_refused(self):
        for text in [SITE.replace('localhost:3004', 'localhost:3004').replace('32m', '64m'),
                     SITE + '\nproxy_set_header X-Real-IP $remote_addr;',
                     SITE.replace('server_name alisveris.az', 'server_name other.example', 1)]:
            with self.assertRaises(rollout.RolloutError):
                rollout.render_site(text, '/ip', '/server')

    def test_migrations_share_one_transaction_and_bounded_locks(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory)):
            (Path(directory) / 'payload').mkdir()
            for name in rollout.MIGRATIONS:
                (Path(directory) / 'payload' / name).write_text('begin;\nselect 1;\ncommit;')
            result = rollout.migration_sql()
            self.assertEqual(result.lower().count('begin;'), 1)
            self.assertEqual(result.lower().count('commit;'), 1)
            self.assertIn("lock_timeout='5s'", result)
            self.assertEqual(result.count('select 1;'), 3)

    def test_existing_preparation_does_not_repeat_backup(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory)), patch.object(rollout, 'publish'), patch.object(rollout, 'run') as run:
            (Path(directory) / 'state.json').write_text(json.dumps({'phase': 'prepare-failed'}))
            rollout.prepare()
            run.assert_not_called()

    def test_activation_never_repeats_completed_or_failed_rollouts(self):
        for phase in ['preparing', 'prepare-failed', 'activating', 'deployed', 'rolled-back']:
            with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory)), patch.object(rollout, 'sql') as sql:
                (Path(directory) / 'state.json').write_text(json.dumps({'phase': phase}))
                with self.assertRaises(rollout.RolloutError):
                    rollout.activate()
                sql.assert_not_called()

    def test_activation_requires_matching_offserver_backup(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory)), patch.object(rollout, 'BASE', Path(directory)), patch.object(rollout, 'sql') as sql:
            (Path(directory) / 'state.json').write_text(json.dumps({'phase': 'prepared', 'encryptedSha256': 'expected'}))
            (Path(directory) / 'offserver-verified.json').write_text(json.dumps({'encryptedSha256': 'different'}))
            with self.assertRaises(rollout.RolloutError):
                rollout.activate()
            sql.assert_not_called()

    def test_payload_mismatch_stops_before_backup_or_state_creation(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory) / 'absent'), patch.object(rollout, 'EXPECTED', {}), patch.object(rollout, 'run') as run:
            with self.assertRaises(rollout.RolloutError):
                rollout.prepare()
            run.assert_not_called()

    def test_isolated_auth_overrides_all_supported_db_and_port_aliases(self):
        original = {'GOTRUE_DB_DATABASE_URL': 'postgres://example:example@localhost/live',
                    'DATABASE_URL': 'postgres://example:example@localhost/live',
                    'PORT': '9998', 'GOTRUE_API_PORT': '9998', 'GOTRUE_SMTP_PASS': 'example'}
        result = rollout.isolated_auth_env(original, {'TURNSTILE_SECRET_KEY': 'fixture-only'}, 'alisveris_security_check_123456abcdef')
        self.assertEqual(result['PORT'], '19998')
        self.assertEqual(result['GOTRUE_API_PORT'], '19998')
        self.assertEqual(result['DATABASE_URL'], result['GOTRUE_DB_DATABASE_URL'])
        self.assertTrue(result['DATABASE_URL'].endswith('/alisveris_security_check_123456abcdef'))
        self.assertEqual(result['GOTRUE_SMTP_PASS'], '')
        self.assertEqual(original['PORT'], '9998')
        self.assertTrue(original['DATABASE_URL'].endswith('/live'))

    def test_auth_diagnostics_remove_known_secrets_urls_emails_and_jwts(self):
        secret = 'fixture-private-value'
        result = rollout.redact_diagnostic('fatal ' + secret + ' postgres://name:pass@localhost/db jane@example.test eyJabc.def.ghi', {'SECRET': secret})
        for value in [secret, 'name:pass', 'jane@example.test', 'eyJabc.def.ghi']:
            self.assertNotIn(value, result)

    def test_resume_requires_existing_matching_backup_and_never_creates_new_dump(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(rollout, 'STATE', Path(directory)), patch.object(rollout, 'run') as run:
            (Path(directory) / 'state.json').write_text(json.dumps({'phase': 'prepare-failed', 'step': 'isolated-restore-migration-auth', 'backupPlainSha256': 'mismatch'}))
            (Path(directory) / 'database.dump').write_bytes(b'fixture-only')
            with self.assertRaises(rollout.RolloutError):
                rollout.resume_prepare()
            run.assert_not_called()

    def test_failed_isolated_auth_logs_are_captured_before_container_removal(self):
        events = []
        def sql(query, *args):
            if query.startswith('select json_build_object'):
                return '{"tables":1,"profiles":0,"orders":0}'
            if query.startswith('select admin_mfa_required'):
                return 'f'
            if query.startswith('drop database'):
                events.append('drop')
            return ''
        def run(args, *a, **kw):
            if args[:3] == ['docker', 'rm', '-f']:
                events.append('remove')
            return b''
        with tempfile.TemporaryDirectory() as directory:
            dump = Path(directory) / 'database.dump'
            dump.write_bytes(b'fixture-only')
            with patch.object(rollout, 'sql', side_effect=sql), patch.object(rollout, 'run', side_effect=run), patch.object(rollout, 'migration_sql', return_value='select 1;'), patch.object(rollout.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stderr=b'')), patch.object(rollout, 'create_auth', return_value='test-container'), patch.object(rollout, 'wait_health', side_effect=rollout.RolloutError('fixture timeout')), patch.object(rollout, 'capture_auth_failure', side_effect=lambda *a: events.append('capture')):
                with self.assertRaises(rollout.RolloutError):
                    rollout.restore_check(dump, {}, {'GOTRUE_DB_DATABASE_URL': 'postgres://example:example@localhost/live'}, {'TURNSTILE_SECRET_KEY': 'fixture-only'})
        self.assertEqual(events, ['capture', 'remove', 'drop'])


if __name__ == '__main__':
    unittest.main()
