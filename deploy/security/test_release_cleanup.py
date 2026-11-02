import hashlib
import importlib.util
import os
import pathlib
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location('cleanup', pathlib.Path(__file__).with_name('release_cleanup.py'))
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)


class ReleaseCleanupTests(unittest.TestCase):
    def test_only_immediate_rollback_is_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            base = pathlib.Path(directory).resolve()
            for name in ('current', 'previous', 'ancient'):
                (base / name).mkdir()
            (base / 'current/rollback.config.cjs').write_text('/srv/alisveris/releases/previous/app')
            (base / 'previous/rollback.config.cjs').write_text('/srv/alisveris/releases/ancient/app')
            self.assertEqual(cleanup.immediate_rollbacks(base, {'current'}), {'previous'})

    def test_recent_protected_and_symlinked_releases_are_not_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            base = pathlib.Path(directory).resolve()
            for name in ('old', 'active', 'fresh'):
                (base / name).mkdir()
            for name in ('old', 'active'):
                os.utime(base / name, (0, 0))
            (base / 'alias').symlink_to(base / 'old', target_is_directory=True)
            eligible, recent = cleanup.eligible_releases(base, {'active'}, time.time())
            self.assertEqual([p.name for p in eligible], ['old'])
            self.assertEqual(recent, ['fresh'])

    def test_transitive_runtime_symlinks_protect_shared_dependencies(self):
        with tempfile.TemporaryDirectory(prefix='alisveris-cleanup-') as directory:
            base = pathlib.Path(directory).resolve()
            for name in ('current', 'shared', 'older'):
                (base / name).mkdir()
            (base / 'current/modules').symlink_to(base / 'shared', target_is_directory=True)
            (base / 'shared/library').symlink_to(base / 'older', target_is_directory=True)
            # Resolve the local fixture through the same production path recognizer.
            original = cleanup.release_names
            cleanup.release_names = lambda value: {part for part in ('current','shared','older') if str(value).startswith(str(base / part))}
            try:
                self.assertEqual(cleanup.dependency_closure(base, {'current'}), {'current','shared','older'})
            finally:
                cleanup.release_names = original

    def test_live_hardlinks_are_not_counted_as_reclaimed_space(self):
        with tempfile.TemporaryDirectory() as directory:
            base = pathlib.Path(directory).resolve()
            (base / 'old').mkdir(); (base / 'active').mkdir()
            (base / 'old/file').write_bytes(b'x' * 100000)
            os.link(base / 'old/file', base / 'active/file')
            self.assertLess(cleanup.allocated_bytes([base / 'old']), 100000)
            self.assertGreater(cleanup.allocated_bytes([base / 'old',base / 'active']), 100000)

    def test_database_backups_and_active_build_archives_are_never_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            base = pathlib.Path(directory).resolve()
            for name in ('old.tgz','active.tgz','database.dump','database.sql.gz','database-backup.tar.gz'):
                (base / name).write_text('fixture');os.utime(base / name,(0,0))
            self.assertEqual([p.name for p in cleanup.archives(base, {'active'},time.time())], ['old.tgz'])

    def test_legacy_build_snapshots_are_removed_only_when_unreferenced(self):
        with tempfile.TemporaryDirectory() as directory:
            base=pathlib.Path(directory).resolve(); (base/'runtime').mkdir()
            old=base/'runtime/build-before-repair-123';old.mkdir();os.utime(old,(0,0))
            self.assertEqual(cleanup.eligible_artifacts(base, {'runtime'},set(),time.time()), [old])
            self.assertEqual(cleanup.eligible_artifacts(base, {'runtime'},{str(old/'node_modules/lib.js')},time.time()), [])
            outside=base/'runtime/database-backup-123';outside.mkdir();os.utime(outside,(0,0))
            self.assertNotIn(outside,cleanup.eligible_artifacts(base,{'runtime'},set(),time.time()))

    def test_dormant_build_snapshot_symlinks_do_not_protect_themselves(self):
        with tempfile.TemporaryDirectory() as directory:
            base=pathlib.Path(directory).resolve();root=base/'runtime';root.mkdir()
            old=root/'build-before-repair-123';old.mkdir();os.utime(old,(0,0))
            (old/'self').symlink_to(old,target_is_directory=True)
            cleanup._REFERENCES.clear()
            cleanup.dependency_closure(base,{'runtime'})
            self.assertFalse(cleanup.path_referenced(old,cleanup._REFERENCES))
            (root/'live-library').symlink_to(old,target_is_directory=True)
            cleanup.dependency_closure(base,{'runtime'})
            self.assertTrue(cleanup.path_referenced(old,cleanup._REFERENCES))

    def test_pending_deployment_survives_a_reboot_until_successful_cutover(self):
        with tempfile.TemporaryDirectory() as directory:
            base=pathlib.Path(directory);(base/'candidate').mkdir()
            policy={'pendingDeployments':['candidate']}
            self.assertEqual(cleanup.pending_deployments(base,policy),{'candidate'})
            (base/'candidate/deployment-result.json').write_text('{"status":"deployed"}')
            self.assertEqual(cleanup.pending_deployments(base,policy),set())

    def test_installer_checksum_and_published_filename_match_the_reviewed_bundle(self):
        location=pathlib.Path(__file__).with_name('publish_cleanup.py')
        spec=importlib.util.spec_from_file_location('publisher',location)
        publisher=importlib.util.module_from_spec(spec);spec.loader.exec_module(publisher)
        bundle=publisher.reviewed_bundle(location.parent)
        self.assertEqual(set(bundle),{'release_cleanup.py','install-cleanup.py'})
        self.assertEqual(bundle['install-cleanup.py'],location.with_name('install_cleanup.py').read_bytes())
        with tempfile.TemporaryDirectory() as directory:
            base=pathlib.Path(directory)
            (base/'release_cleanup.py').write_text('unreviewed source')
            (base/'install_cleanup.py').write_text("EXPECTED_SHA='incorrect'")
            with self.assertRaisesRegex(RuntimeError,'nothing uploaded'):
                publisher.reviewed_bundle(base)

    def test_raw_secrets_are_not_retained_in_protection_output(self):
        self.assertEqual(cleanup.release_names('{"password":"example-private","cwd":"/srv/alisveris/releases/current/app"}'), {'current'})


if __name__ == '__main__':
    unittest.main()
