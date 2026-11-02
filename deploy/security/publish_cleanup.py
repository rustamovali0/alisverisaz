#!/usr/bin/env python3
"""Publish the reviewed pair to canonical CLI filenames; no root operations."""
import ast
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile

DESTINATION = 'deploy@178.208.187.209'
REMOTE = '/home/deploy/alisveris-security-setup'
ARTIFACTS = {'release_cleanup.py': 'release_cleanup.py', 'install_cleanup.py': 'install-cleanup.py'}


def reviewed_bundle(directory):
    contents = {target: (directory / source).read_bytes() for source, target in ARTIFACTS.items()}
    tree = ast.parse(contents['install-cleanup.py'])
    expected = next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign)
                    and any(isinstance(target, ast.Name) and target.id == 'EXPECTED_SHA' for target in node.targets))
    if hashlib.sha256(contents['release_cleanup.py']).hexdigest() != expected:
        raise RuntimeError('Local reviewed source checksum mismatch; nothing uploaded')
    return contents


def main():
    contents = reviewed_bundle(pathlib.Path(__file__).resolve().parent)
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()}
    ssh = ['ssh', '-i', str(pathlib.Path('~/.ssh/alisveris_vds').expanduser()), '-o', 'BatchMode=yes', DESTINATION]
    staging = subprocess.check_output(ssh + ['umask 077; mktemp -d ' + REMOTE + '/.cleanup-upload-XXXXXXXX'], text=True).strip()
    if not re.fullmatch(re.escape(REMOTE) + r'/\.cleanup-upload-[A-Za-z0-9]+', staging):
        raise RuntimeError('Unexpected upload directory; publication stopped')
    with tempfile.TemporaryDirectory() as directory:
        for name, data in contents.items():
            path = pathlib.Path(directory) / name
            path.write_bytes(data)
            subprocess.run(['scp', '-i', str(pathlib.Path('~/.ssh/alisveris_vds').expanduser()), '-o', 'BatchMode=yes', str(path), DESTINATION + ':' + staging + '/' + name], check=True)
    # Verify every staged byte before replacing either canonical filename. A root
    # installer invoked during publication still fails closed on a mixed pair.
    remote_code = '''import ast,hashlib,json,os,pathlib,shutil
base=pathlib.Path(%r); staging=pathlib.Path(%r); expected=%r
for name,digest in expected.items():
    assert hashlib.sha256((staging/name).read_bytes()).hexdigest()==digest
for name in expected:
    os.chmod(staging/name,0o644);os.replace(staging/name,base/name)
for name,digest in expected.items():
    assert hashlib.sha256((base/name).read_bytes()).hexdigest()==digest
staging.rmdir()
print(json.dumps({'status':'verified','files':expected}))
''' % (REMOTE, staging, hashes)
    subprocess.run(ssh + ['python3 -'], input=remote_code, text=True, check=True)


if __name__ == '__main__':
    main()
