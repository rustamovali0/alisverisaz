"""Local safety tests; no network, Docker, production SQL or PM2 invocation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

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


if __name__ == '__main__':
    unittest.main()
