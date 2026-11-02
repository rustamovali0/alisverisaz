#!/usr/bin/env python3
"""Retain active Alisveris runtimes and one immediate rollback; expire unused releases.

Default: read-only plan. --apply requires root. Never traverses backup, database,
upload or persistent state directories. Scheduled code must be owned by root.
"""
import argparse
import fcntl
import json
import os
import pathlib
import pwd
import re
import shutil
import subprocess
import time
import tempfile

BASE = pathlib.Path('/srv/alisveris/releases')
PATTERN = re.compile(r'/srv/alisveris/releases/([A-Za-z0-9][A-Za-z0-9._-]*)')
MIN_AGE = 48 * 3600
ARTIFACT = re.compile(r'(?:build-before-repair|nested-dependencies-backup)-[0-9]+$')
_REFERENCES = set()
RESULT = pathlib.Path('/home/deploy/alisveris-disk-cleanup-result.json')


def release_names(text):
    return set(PATTERN.findall(str(text)))


def retain_reasons(protected, text, reason):
    _REFERENCES.update(re.findall(r'/srv/alisveris/releases/[A-Za-z0-9._/-]+', str(text)))
    for name in release_names(text):
        protected.setdefault(name, set()).add(reason)


def immediate_rollbacks(base, active):
    """Read one rollback per active runtime, not the history of every rollback."""
    found = set()
    for name in active:
        for filename in ('rollback.config.cjs', 'deployment-result.json'):
            path = base / name / filename
            if path.is_file() and not path.is_symlink() and path.stat().st_size < 2_000_000:
                if filename == 'deployment-result.json':
                    found.update(release_names(json.loads(path.read_text()).get('previousRelease', '')))
                else:
                    found.update(release_names(path.read_text()))
    return found


def path_referenced(path, references):
    value = str(path.resolve())
    return any(ref == value or ref.startswith(value + '/') for ref in references)


def dependency_closure(base, initial):
    protected = set(initial)
    for _ in range(100):
        before = (frozenset(protected), frozenset(_REFERENCES))
        for name in sorted(protected):
            root = base / name
            if not root.is_dir():
                continue
            for path in (root / 'server.js', root / 'app/server.js', root / 'app/.next/required-server-files.json'):
                if path.is_file() and path.stat().st_size < 2_000_000:
                    text = path.read_text(errors='replace')
                    _REFERENCES.update(re.findall(r'/srv/alisveris/releases/[A-Za-z0-9._/-]+', text))
                    protected.update(release_names(text))
            for parent, dirs, files in os.walk(root, followlinks=False):
                dirs[:] = [d for d in dirs if d != '.git' and
                           (not ARTIFACT.fullmatch(d) or path_referenced(pathlib.Path(parent) / d, _REFERENCES))]
                for child in dirs + files:
                    path = pathlib.Path(parent) / child
                    if path.is_symlink():
                        resolved = str(path.resolve())
                        _REFERENCES.add(resolved)
                        protected.update(release_names(resolved))
        if before == (frozenset(protected), frozenset(_REFERENCES)):
            return protected
    raise RuntimeError('Dependency closure did not stabilize; refusing cleanup')


def eligible_artifacts(base, protected, references, now):
    result = []
    for name in protected:
        root = base / name
        if not root.is_dir() or root.is_symlink():
            continue
        for path in root.iterdir():
            if ARTIFACT.fullmatch(path.name) and path.is_dir() and not path.is_symlink() and \
               now - path.stat().st_mtime >= MIN_AGE and not path_referenced(path, references):
                result.append(path)
    return sorted(result)


def pending_deployments(base, configuration):
    names = set()
    for name in configuration.get('pendingDeployments', []):
        if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', name):
            raise RuntimeError('Invalid pending deployment pin')
        marker = base / name / 'deployment-result.json'
        if not marker.is_file() or json.loads(marker.read_text()).get('status') != 'deployed':
            names.add(name)
    return names


def collect_protected(base=BASE):
    _REFERENCES.clear()
    raw = subprocess.check_output(['runuser', '-u', 'deploy', '--', 'pm2', 'jlist'], text=True, timeout=30)
    processes = json.loads(raw)
    if not any(p.get('name') == 'alisveris-vds' for p in processes):
        raise RuntimeError('Production PM2 entry missing; refusing cleanup')
    protected = {}
    active = set()
    for process in processes:
        text = json.dumps(process.get('pm2_env', {}))
        retain_reasons(protected, text, 'pm2:' + process.get('name', 'unknown'))
        names = release_names(text)
        active.update(names)
        for name in names:
            protected.setdefault(name, set()).add('pm2:' + process.get('name', 'unknown'))
    dump = pathlib.Path('/home/deploy/.pm2/dump.pm2')
    if not dump.is_file():
        raise RuntimeError('Saved PM2 configuration missing; refusing cleanup')
    retain_reasons(protected, dump.read_text(), 'saved-pm2')
    for proc in pathlib.Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        for item in ('cwd', 'exe', 'root'):
            try:
                retain_reasons(protected, os.readlink(proc / item), 'running-process')
            except FileNotFoundError:
                pass
            except PermissionError:
                raise RuntimeError('Cannot inspect process paths; refusing cleanup')
        for item in ('cmdline', 'maps'):
            try:
                retain_reasons(protected, (proc / item).read_text(errors='replace'), 'running-process')
            except FileNotFoundError:
                pass
            except PermissionError:
                # A running process with unreadable dependency mappings cannot
                # safely be assumed unrelated to a release.
                raise RuntimeError('Cannot inspect process dependencies; refusing cleanup')
    for directory in ('/etc/nginx', '/etc/systemd/system', '/etc/cron.d'):
        for parent, _, files in os.walk(directory):
            for filename in files:
                path = pathlib.Path(parent) / filename
                try:
                    allowed = (directory == '/etc/cron.d' or path.suffix in ('.conf', '.service', '.socket', '.target', '.timer') or
                               ('sites-enabled' in path.parts or 'sites-available' in path.parts))
                    if allowed and path.is_file() and path.stat().st_size < 2_000_000:
                        retain_reasons(protected, path.read_text(errors='replace'), 'system-config')
                except FileNotFoundError:
                    pass
    pins = pathlib.Path('/etc/alisveris/cleanup-pins.json')
    if pins.exists():
        if pins.is_symlink() or pins.stat().st_uid != 0 or pins.stat().st_mode & 0o022:
            raise RuntimeError('Unsafe release retention configuration')
        for name in pending_deployments(base, json.loads(pins.read_text())):
            protected.setdefault(name, set()).add('pending-deployment')
    for name in immediate_rollbacks(base, active):
        protected.setdefault(name, set()).add('immediate-rollback')
    for name in dependency_closure(base, protected):
        protected.setdefault(name, set()).add('runtime-dependency')
    return protected


def eligible_releases(base, protected, now):
    eligible, recent = [], []
    for path in sorted(base.iterdir()):
        if path.is_symlink() or not path.is_dir() or path.name in protected:
            continue
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', path.name):
            continue
        if now - path.stat().st_mtime < MIN_AGE:
            recent.append(path.name)
        else:
            eligible.append(path)
    return eligible, recent


def allocated_bytes(paths):
    """Only count hard-linked file blocks when all links will be removed."""
    files = {}
    directory_bytes = 0
    for root in paths:
        for parent, dirs, names in os.walk(root, followlinks=False):
            directory_bytes += os.lstat(parent).st_blocks * 512
            for child in dirs + names:
                path = pathlib.Path(parent) / child
                if path.is_dir() and not path.is_symlink():
                    continue
                s = path.lstat()
                key = (s.st_dev, s.st_ino)
                count, _, _ = files.get(key, (0, s.st_nlink, s.st_blocks))
                files[key] = (count + 1, s.st_nlink, s.st_blocks)
    return directory_bytes + sum(blocks * 512 for count, links, blocks in files.values() if count >= links)


def archives(base, protected, now):
    # Only direct release build archives; never guess whether a .dump/.sql or
    # a backup archive elsewhere is disposable.
    return [p for p in base.iterdir() if p.is_file() and not p.is_symlink()
            and p.name.endswith(('.tgz', '.tar.gz')) and 'backup' not in p.name.lower()
            and not any(p.name.startswith(name) for name in protected)
            and now - p.stat().st_mtime >= MIN_AGE]


def store_result(result):
    owner = pwd.getpwnam('deploy')
    fd, name = tempfile.mkstemp(prefix='.alisveris-cleanup-', dir=RESULT.parent)
    temporary = pathlib.Path(name)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
        os.chown(temporary, owner.pw_uid, owner.pw_gid)
        os.replace(temporary, RESULT)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--auto', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError('Root is required for a complete process/config inventory')
    if BASE.is_symlink() or BASE.resolve() != BASE or not shutil.rmtree.avoids_symlink_attacks:
        raise RuntimeError('Unsafe release base or filesystem deletion implementation')
    with open('/run/lock/alisveris-release-cleanup.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        protected = collect_protected()
        eligible, recent = eligible_releases(BASE, protected, time.time())
        artifacts = eligible_artifacts(BASE, protected, _REFERENCES, time.time())
        removable_archives = archives(BASE, protected, time.time())
        before = shutil.disk_usage(BASE)
        result = {'at': time.time(), 'mode': 'apply' if args.apply else 'plan',
                  'protected': {k: sorted(v) for k, v in sorted(protected.items())},
                  'recentRetained': recent, 'eligibleReleases': [p.name for p in eligible],
                  'eligibleBuildArtifacts': [str(p.relative_to(BASE)) for p in artifacts],
                  'estimatedReclaimBytes': allocated_bytes(eligible + artifacts) + sum(p.stat().st_size for p in removable_archives),
                  'removedReleases': [], 'removedBuildArtifacts': [], 'removedArchives': [], 'freeBytesBefore': before.free}
        if args.apply:
            for path in eligible:
                # Recheck live references immediately before every deletion.
                latest = collect_protected()
                if path.name in latest or path.is_symlink() or time.time() - path.stat().st_mtime < MIN_AGE:
                    continue
                shutil.rmtree(path)
                result['removedReleases'].append(path.name)
                result['status'] = 'in_progress'
                store_result(result)
            for path in artifacts:
                latest = collect_protected()
                if path.is_symlink() or path_referenced(path, _REFERENCES):
                    continue
                if path not in eligible_artifacts(BASE, latest, _REFERENCES, time.time()):
                    continue
                shutil.rmtree(path)
                result['removedBuildArtifacts'].append(str(path.relative_to(BASE)))
                result['status'] = 'in_progress'
                store_result(result)
            for path in removable_archives:
                if path.is_symlink() or any(path.name.startswith(name) for name in collect_protected()):
                    continue
                path.unlink()
                result['removedArchives'].append(path.name)
                result['status'] = 'in_progress'
                store_result(result)
        after = shutil.disk_usage(BASE)
        result.update(freeBytesAfter=after.free, freedBytes=after.free - before.free, status='complete')
        store_result(result)
        if not args.auto or result['removedReleases'] or result['removedBuildArtifacts'] or result['removedArchives']:
            print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never emit PM2 env, configuration text, credentials or exception payloads.
        reason = str(error) if type(error) is RuntimeError else type(error).__name__
        print('Alisveris cleanup failed closed: ' + reason, file=__import__('sys').stderr)
        raise SystemExit(1)
