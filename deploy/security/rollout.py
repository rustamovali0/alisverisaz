"""Guarded, project-specific rollout. Root operator: prepare, then activate.

Never imports application secrets into output. Production data is never restored,
reset, or deleted. A disposable restore database is blocked from PUBLIC connects.
"""
import datetime
import hashlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = Path('/home/deploy/alisveris-security-setup')
STATE = Path('/root/alisveris-security-rollout-20261102')
DB = 'alisveris_candidate_20261010'
RELEASE = Path('/srv/alisveris/releases/enterprise-security-20261102')
OLD_APP = '/srv/alisveris/releases/header-hover-20261101/app'
APP = str(RELEASE / 'app')
COMMIT = 'f600819777f44805ebfec59c9c2a88be3b9ec5fe'
OLD_AUTH = '99fd9668bd9d528b6cd948e78f7b6da0ed01a2bce1b5d41201dc76ecaafb9e7b'
NEW_AUTH = 'alisveris-auth-security-20261102'
SITE = Path('/etc/nginx/sites-available/alisveris')
HTTP_CONFIG = Path('/etc/nginx/conf.d/alisveris-security.conf')
IP_CONFIG = Path('/etc/nginx/snippets/alisveris-cloudflare-real-ip.conf')
SERVER_CONFIG = Path('/etc/nginx/snippets/alisveris-security.conf')
MIGRATIONS = ['20261102090000_atomic_security_limits.sql',
              '20261102093000_profile_security_columns.sql',
              '20261102100000_admin_mfa_gate.sql']
PAYLOAD = ['backup-crypto.mjs', 'public.pem', 'activate-app.mjs',
           'nginx-http.conf.example', 'nginx-server.conf.example', *MIGRATIONS]
# Filled by the reviewed publisher; checked before any preparation.
EXPECTED = {'backup-crypto.mjs': 'a9cd5676e3ac05b9329e18327374acfd5efeb5394cab588e1bbc203cdd1a5ead', 'activate-app.mjs': 'c561dbde130d78bae72b19a67946fd3c8805a2f413dfd1c702788ba4a4b43bae', 'nginx-http.conf.example': 'e92348761f8781e65d80f41b3e94e684795e7b0425b9ad362a51c8dc3a421b03', 'nginx-server.conf.example': '0699ffa5ad9bf62f7319fce2524ba1fffeeab5a3a5552904ca37c54f0635f8cf', 'public.pem': '52e23adffb286383d8fb9e5f019abcefeb154be5b250b8aa0e70f210d4e1bfec', '20261102090000_atomic_security_limits.sql': '5264e7bd575351320ba2fa4125ed5c7c69908546c0deaef74f9ed41df62f2fce', '20261102093000_profile_security_columns.sql': '963f11b6e6ed195b2914abc9605439039d9e1578420045ae4ebd3c4816cd0edf', '20261102100000_admin_mfa_gate.sql': '6b1fe551815bc034ca50bc304ac57828109d6b82401110d17dfbfa1351700fd6'}  # PAYLOAD_HASHES


class RolloutError(Exception):
    pass


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def candidate_digest():
    root = Path(APP)
    files = [root / 'server.js', root / 'app.env', root / 'deploy/live-marketplace-vds.config.cjs']
    for folder in ['.next', 'public']:
        files.extend(p for p in (root / folder).rglob('*') if p.is_file())
    h = hashlib.sha256()
    for p in sorted(files):
        h.update(str(p.relative_to(root)).encode() + b'\0' + digest(p).encode())
    return h.hexdigest()


def run(args, data=None, timeout=120, output=None, env=None):
    p = subprocess.run(args, input=data, stdout=output or subprocess.PIPE,
                       stderr=subprocess.PIPE, timeout=timeout, env=env)
    if p.returncode:
        # Subprocess errors can contain URLs/passwords/row values. Keep private.
        if STATE.exists():
            private_write(STATE / 'last-command-error.txt', p.stderr)
        raise RolloutError('Command failed: ' + Path(args[0]).name + '; private diagnostic saved.')
    return b'' if output else p.stdout


def private_write(path, data):
    path = Path(path)
    data = data if isinstance(data, bytes) else data.encode()
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'wb') as f:
        f.write(data)
    path.chmod(0o600)


def save_state(data):
    data['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    private_write(STATE / 'state.json', json.dumps(data, indent=2))


def publish(data):
    p = BASE / 'rollout-result.json'
    private_write(p, json.dumps(data, indent=2))
    owner = pwd.getpwnam('deploy')
    os.chown(p, owner.pw_uid, owner.pw_gid)


def deploy(args, timeout=180):
    return run(['runuser', '-u', 'deploy', '--', *args], timeout=timeout)


def sql(query, database=DB, timeout=120):
    return run(['runuser', '-u', 'postgres', '--', 'psql', '-X', '-q', '-At',
                '-v', 'ON_ERROR_STOP=1', '-d', database], query.encode(), timeout).decode().strip()


def pm2():
    return json.loads(deploy(['pm2', 'jlist']))


def check_app(cwd=OLD_APP):
    main = [p for p in pm2() if p['name'] == 'alisveris-vds']
    if len(main) != 1 or main[0]['pm2_env']['status'] != 'online' or main[0]['pm2_env']['pm_cwd'] != cwd:
        raise RolloutError('Production application changed; inspect before retrying.')
    return main[0]


def inspect_auth(identifier=OLD_AUTH):
    auth = json.loads(run(['docker', 'inspect', identifier]))[0]
    e = dict(x.split('=', 1) for x in auth['Config']['Env'] if '=' in x)
    u = urllib.parse.urlsplit(e.get('GOTRUE_DB_DATABASE_URL', ''))
    if u.path.lstrip('/') != DB or e.get('GOTRUE_SITE_URL', '').rstrip('/') != 'https://alisveris.az' or e.get('GOTRUE_API_PORT') != '9998':
        raise RolloutError('Unexpected production Auth target.')
    if auth['HostConfig']['NetworkMode'] != 'host' or auth.get('Mounts'):
        raise RolloutError('Auth runtime layout needs review.')
    return auth, e


def installed():
    return json.loads(sql("""select json_build_object(
      'rates',to_regprocedure('public.security_consume_rate(text,integer,integer)') is not null,
      'guard',to_regprocedure('public.security_guard_profile_write()') is not null,
      'mfa',to_regclass('public.security_configuration') is not null)"""))


def read_app_env():
    # Node's own dotenv parser is the same parser used by the PM2 runtime.
    code = 'console.log(JSON.stringify(Object.fromEntries(["TURNSTILE_SECRET_KEY","NEXT_PUBLIC_TURNSTILE_SITE_KEY","SECURITY_REDIS_URL","AUTH_CAPTCHA_MODE","TRUSTED_PROXY_MODE"].map(k=>[k,process.env[k]]))))'
    e = json.loads(deploy(['node', '--env-file=' + APP + '/app.env', '-e', code]))
    if not e.get('TURNSTILE_SECRET_KEY') or not e.get('NEXT_PUBLIC_TURNSTILE_SITE_KEY') or e.get('AUTH_CAPTCHA_MODE') != 'supabase' or e.get('TRUSTED_PROXY_MODE') != 'nginx':
        raise RolloutError('Candidate environment is not ready.')
    r = urllib.parse.urlsplit(e.get('SECURITY_REDIS_URL', ''))
    if r.hostname != '127.0.0.1' or r.port != 16379 or not r.password:
        raise RolloutError('Dedicated limiter is not configured.')
    env = {**os.environ, 'REDISCLI_AUTH': urllib.parse.unquote(r.password)}
    for key, value in [('maxmemory-policy', 'noeviction'), ('appendonly', 'yes')]:
        values = run(['redis-cli', '-p', '16379', '--raw', 'CONFIG', 'GET', key], env=env).decode().splitlines()
        if values != [key, value]:
            raise RolloutError('Dedicated limiter configuration is not safe.')
    return e


def migration_sql():
    parts = []
    for name in MIGRATIONS:
        content = (STATE / 'payload' / name).read_text().strip()
        if not re.match(r'^begin;', content, re.I) or not re.search(r'commit;$', content, re.I):
            raise RolloutError('Unexpected migration transaction shape.')
        parts.append(re.sub(r'commit;$', '', re.sub(r'^begin;', '', content, flags=re.I), flags=re.I))
    return "begin; set local lock_timeout='5s'; set local statement_timeout='45s';\n" + '\n'.join(parts) + '\ncommit;'


def render_site(original, ip_file, server_file):
    # Deliberately refuse arbitrary nginx layouts instead of guessing blocks.
    declaration = 'server_name alisveris.az www.alisveris.az *.alisveris.az;'
    if original.count(declaration) != 2 or original.count('proxy_set_header X-Forwarded-For $remote_addr;') != 1:
        raise RolloutError('Marketplace nginx layout changed; no configuration replaced.')
    if 'alisveris-security.conf' in original or 'X-Real-IP' in original:
        raise RolloutError('Marketplace ingress already customized; inspect first.')
    result = original.replace(declaration, declaration + '\n    include ' + str(ip_file) + ';')
    marker = 'proxy_set_header X-Forwarded-For $remote_addr;'
    headers = marker + '\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header CF-Connecting-IP "";\n        proxy_set_header True-Client-IP "";\n        proxy_set_header X-Vercel-Forwarded-For "";'
    result = result.replace(marker, headers)
    # One TLS server in the inspected project file; HTTP redirect is unchanged.
    if result.count('client_max_body_size 32m;') != 1:
        raise RolloutError('Unexpected body-size directive.')
    return result.replace('client_max_body_size 32m;', 'client_max_body_size 32m;\n    include ' + str(server_file) + ';\n    access_log /var/log/nginx/alisveris-security.log security_json;')


def nginx_prepare():
    if any(p.exists() for p in [HTTP_CONFIG, IP_CONFIG, SERVER_CONFIG]):
        raise RolloutError('Security nginx paths already exist; inspect before retrying.')
    original = SITE.read_text()
    if Path('/etc/nginx/sites-enabled/alisveris').resolve() != SITE.resolve():
        raise RolloutError('Unexpected active marketplace nginx path.')
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/ips', headers={'User-Agent': 'alisveris-security-rollout/1'})
    with urllib.request.urlopen(req, timeout=20) as response:
        doc = json.load(response)
    if doc.get('success') is not True:
        raise RolloutError('Official Cloudflare address lookup failed.')
    ranges = doc['result']['ipv4_cidrs'] + doc['result']['ipv6_cidrs']
    if not 15 <= len(ranges) <= 100:
        raise RolloutError('Unexpected Cloudflare CIDR list.')
    for value in ranges:
        if ipaddress.ip_network(value).prefixlen == 0:
            raise RolloutError('Unsafe Cloudflare trust range.')
    private_write(STATE / 'cloudflare-real-ip.conf', '\n'.join('set_real_ip_from ' + str(ipaddress.ip_network(x)) + ';' for x in ranges) + '\nreal_ip_header CF-Connecting-IP;\nreal_ip_recursive on;\n')
    private_write(STATE / 'http.conf', (STATE / 'payload' / 'nginx-http.conf.example').read_bytes())
    server = (STATE / 'payload' / 'nginx-server.conf.example').read_text()
    server = re.sub(r'^client_max_body_size 32m;\n', '', server, flags=re.M)
    private_write(STATE / 'server.conf', server)
    private_write(STATE / 'site.before.conf', original)
    private_write(STATE / 'site.after.conf', render_site(original, IP_CONFIG, SERVER_CONFIG))
    private_write(STATE / 'site.test.conf', render_site(original, STATE / 'cloudflare-real-ip.conf', STATE / 'server.conf'))
    conf = Path('/etc/nginx/nginx.conf').read_text()
    conf_dir = 'include /etc/nginx/conf.d/*.conf;'
    sites = 'include /etc/nginx/sites-enabled/*;'
    if conf.count(conf_dir) != 1 or conf.count(sites) != 1:
        raise RolloutError('Unexpected nginx root include layout.')
    conf = conf.replace(conf_dir, conf_dir + '\ninclude ' + str(STATE / 'http.conf') + ';')
    includes = []
    for p in sorted(Path('/etc/nginx/sites-enabled').iterdir()):
        includes.append('include ' + str(STATE / 'site.test.conf' if p.name == 'alisveris' else p) + ';')
    private_write(STATE / 'nginx.test.conf', conf.replace(sites, '\n'.join(includes)))
    run(['nginx', '-t', '-c', str(STATE / 'nginx.test.conf')])
    return {'siteHash': digest(SITE), 'rootHash': digest('/etc/nginx/nginx.conf'), 'cloudflareRanges': len(ranges)}


class DockerConnection(http.client.HTTPConnection):
    def __init__(self):
        super().__init__('localhost', timeout=45)

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect('/var/run/docker.sock')


def create_auth(source, env, name):
    # Same immutable image, command, user, capabilities, network and restart policy.
    config = {k: v for k, v in source['Config'].items() if k in (
        'User', 'AttachStdin', 'AttachStdout', 'AttachStderr', 'ExposedPorts',
        'Tty', 'OpenStdin', 'StdinOnce', 'Cmd', 'Healthcheck', 'WorkingDir',
        'Entrypoint', 'NetworkDisabled', 'Labels', 'StopSignal', 'StopTimeout', 'Shell')}
    config.update(Image=source['Image'], Env=[k + '=' + v for k, v in env.items()], Hostname=name,
                  HostConfig=source['HostConfig'])
    client = DockerConnection()
    try:
        client.request('POST', '/v1.47/containers/create?name=' + urllib.parse.quote(name),
                       json.dumps(config), {'Content-Type': 'application/json'})
        response = client.getresponse()
        body = response.read()
        if response.status != 201:
            private_write(STATE / 'docker-create-error.json', body)
            raise RolloutError('Auth clone could not be prepared; production remains unchanged.')
        return json.loads(body)['Id']
    finally:
        client.close()


def wait_health(port):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen('http://127.0.0.1:' + str(port) + '/health', timeout=2) as r:
                if r.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(.5)
    raise RolloutError('Auth health check timed out.')


def check_captcha(port):
    req = urllib.request.Request('http://127.0.0.1:' + str(port) + '/token?grant_type=password',
            data=json.dumps({'email': 'security-check@invalid.example', 'password': uuid.uuid4().hex}).encode(),
            headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req, timeout=15)
    except urllib.error.HTTPError as e:
        body = e.read().decode().lower()
        if e.code in (400, 403, 422) and 'captcha' in body:
            return
    raise RolloutError('Isolated Auth did not reject a missing CAPTCHA token.')


def restore_check(dump, source, auth_env, app_env):
    temporary_db = 'alisveris_security_check_' + uuid.uuid4().hex[:12]
    temporary_auth = 'alisveris-security-auth-check-' + uuid.uuid4().hex[:12]
    created = False
    container = None
    try:
        sql('create database ' + temporary_db + ' template template0;', 'postgres')
        created = True
        sql('revoke connect on database ' + temporary_db + ' from public;', 'postgres')
        auth_role = urllib.parse.unquote(urllib.parse.urlsplit(auth_env['GOTRUE_DB_DATABASE_URL']).username or '')
        if not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_]*', auth_role):
            raise RolloutError('Unexpected Auth database role.')
        sql('grant connect on database ' + temporary_db + ' to "' + auth_role + '";', 'postgres')
        # Complete restore, not merely a TOC check; ACLs/ownership restored on same server.
        with dump.open('rb') as f:
            p = subprocess.run(['runuser', '-u', 'postgres', '--', 'pg_restore', '--exit-on-error',
                  '--single-transaction', '-d', temporary_db], stdin=f,
                  stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=180)
        if p.returncode:
            private_write(STATE / 'restore-error.txt', p.stderr)
            raise RolloutError('Disposable database restore failed; production was not migrated.')
        result = json.loads(sql("select json_build_object('tables',(select count(*) from information_schema.tables where table_schema in('public','auth')),'profiles',(select count(*) from public.profiles),'orders',(select count(*) from public.orders))", temporary_db))
        sql(migration_sql(), temporary_db)
        if sql('select admin_mfa_required from public.security_configuration where id=true;', temporary_db) != 'f':
            raise RolloutError('Staging MFA flag must remain disabled.')
        # Workers never target this database. The temporary Auth has SMTP disabled.
        e = dict(auth_env)
        u = urllib.parse.urlsplit(e['GOTRUE_DB_DATABASE_URL'])
        e['GOTRUE_DB_DATABASE_URL'] = urllib.parse.urlunsplit(u._replace(path='/' + temporary_db))
        e.update(GOTRUE_API_PORT='19998', GOTRUE_API_HOST='127.0.0.1', GOTRUE_DISABLE_SIGNUP='false',
                 GOTRUE_SECURITY_CAPTCHA_ENABLED='true', GOTRUE_SECURITY_CAPTCHA_PROVIDER='turnstile',
                 GOTRUE_SECURITY_CAPTCHA_SECRET=app_env['TURNSTILE_SECRET_KEY'],
                 GOTRUE_JWT_SECRET=uuid.uuid4().hex + uuid.uuid4().hex,
                 GOTRUE_MAILER_AUTOCONFIRM='false', GOTRUE_SMTP_HOST='', GOTRUE_SMTP_USER='', GOTRUE_SMTP_PASS='')
        container = create_auth(source, e, temporary_auth)
        run(['docker', 'start', container])
        wait_health(19998)
        check_captcha(19998)
        result.update(fullRestore=True, migrations=True, nativeCaptcha=True)
        return result
    finally:
        if container:
            run(['docker', 'rm', '-f', container])
        if created:
            # The name is generated here, never supplied by a browser/env/user.
            if not re.fullmatch(r'alisveris_security_check_[0-9a-f]{12}', temporary_db) or temporary_db == DB:
                raise RolloutError('Temporary database cleanup guard failed.')
            sql('drop database ' + temporary_db + ' with (force);', 'postgres')


def prepare():
    if STATE.exists():
        data = json.loads((STATE / 'state.json').read_text())
        publish(data)
        print('Mövcud hazırlıq vəziyyəti: ' + data['phase'] + '. Backup/migration təkrarlanmadı.')
        return
    if not EXPECTED or set(EXPECTED) != set(PAYLOAD):
        raise RolloutError('Reviewed payload hashes are missing.')
    for name, expected in EXPECTED.items():
        if (BASE / name).is_symlink() or digest(BASE / name) != expected:
            raise RolloutError('Reviewed rollout payload checksum does not match: ' + name)
    main = check_app()
    source, auth_env = inspect_auth()
    if not source['State']['Running'] or any(installed().values()):
        raise RolloutError('Auth/migration state changed; nothing repeated.')
    # Explicitly refuse an already running backup rather than spawning another.
    processes = run(['ps', '-eo', 'comm=']).decode().splitlines()
    if any(Path(p.strip()).name in ('pg_dump', 'pg_restore', 'pg_basebackup') for p in processes):
        raise RolloutError('Existing database backup/restore process must be inspected first.')
    if shutil.disk_usage('/').free < 5 * 1024**3:
        raise RolloutError('Insufficient free space for a safe restore check.')
    app_env = read_app_env()
    STATE.mkdir(mode=0o700)
    (STATE / 'payload').mkdir(mode=0o700)
    for name in PAYLOAD:
        private_write(STATE / 'payload' / name, (BASE / name).read_bytes())
    data = {'phase': 'preparing', 'database': DB, 'productionPid': main['pid'],
            'authId': source['Id'], 'authImage': source['Image'],
            'authConfigHash': hashlib.sha256(json.dumps(source['Config'], sort_keys=True).encode()).hexdigest(),
            'release': APP, 'sourceCommit': COMMIT, 'payloadHashes': EXPECTED,
            'candidateHash': candidate_digest(),
            'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save_state(data)
    try:
        data['step'] = 'nginx-validation'
        save_state(data)
        data['nginx'] = nginx_prepare()
        print('Cari database backup-ı hazırlanır; canlı servis dəyişdirilmir.', flush=True)
        dump = STATE / 'database.dump'
        data['step'] = 'database-backup'
        save_state(data)
        with dump.open('xb') as f:
            dump.chmod(0o600)
            run(['runuser', '-u', 'postgres', '--', 'pg_dump', '-Fc', '--lock-wait-timeout=5s', '-d', DB], output=f, timeout=180)
        run(['pg_restore', '--list', str(dump)], timeout=60)
        run(['pg_restore', '--no-owner', '--no-privileges', '--file=/dev/null', str(dump)], timeout=90)
        data['backupPlainSha256'] = digest(dump)
        data['backupBytes'] = dump.stat().st_size
        print('Backup bərpası və migration-lar izolə bazada yoxlanır.', flush=True)
        data['step'] = 'isolated-restore-migration-auth'
        save_state(data)
        data['staging'] = restore_check(dump, source, auth_env, app_env)
        encrypted = STATE / 'database.dump.enc'
        data['step'] = 'backup-encryption'
        save_state(data)
        run(['node', str(STATE / 'payload' / 'backup-crypto.mjs'), 'encrypt', str(dump), str(encrypted), str(STATE / 'payload' / 'public.pem'), DB], timeout=180)
        data['encryptedSha256'] = digest(encrypted)
        data['metadataSha256'] = digest(str(encrypted) + '.json')
        for p in [encrypted, Path(str(encrypted) + '.json')]:
            destination = BASE / p.name
            private_write(destination, p.read_bytes())
            owner = pwd.getpwnam('deploy')
            os.chown(destination, owner.pw_uid, owner.pw_gid)
        # The only remaining snapshot is authenticated ciphertext. Its recovery
        # private key lives on the operator's Mac, never on this server.
        dump.unlink()
        check_app()
        data['phase'] = 'prepared'
        save_state(data)
        publish(data)
        print('Hazırlıq tamamlandı: backup bərpa olundu, migration və CAPTCHA sınağı keçdi. Canlı tətbiq, Auth və Nginx dəyişdirilmədi.')
    except Exception as error:
        data['phase'] = 'prepare-failed'
        data['errorClass'] = type(error).__name__
        save_state(data)
        publish(data)
        raise


def restore_ingress():
    private_write(SITE, (STATE / 'site.before.conf').read_bytes())
    SITE.chmod(0o644)
    for p in [HTTP_CONFIG, IP_CONFIG, SERVER_CONFIG]:
        p.unlink(missing_ok=True)
    run(['nginx', '-t'])
    run(['systemctl', 'reload', 'nginx'])


def activate():
    if not STATE.exists():
        raise RolloutError('Run reviewed preparation first.')
    data = json.loads((STATE / 'state.json').read_text())
    if data['phase'] != 'prepared':
        raise RolloutError('Current phase is ' + data['phase'] + '; activation was not repeated.')
    # Require a separately downloaded and authenticated off-server snapshot.
    verified = json.loads((BASE / 'offserver-verified.json').read_text())
    for key in ['encryptedSha256', 'metadataSha256', 'backupPlainSha256']:
        if verified.get(key) != data.get(key):
            raise RolloutError('Off-server backup verification is incomplete.')
    if digest(STATE / 'database.dump.enc') != data['encryptedSha256'] or digest(STATE / 'database.dump.enc.json') != data['metadataSha256']:
        raise RolloutError('Prepared backup changed.')
    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(data['startedAt'])
    if age.total_seconds() > 6 * 3600:
        raise RolloutError('Prepared backup is older than six hours; inspect before any fresh preparation.')
    main = check_app()
    if main['pid'] != data['productionPid'] or any(installed().values()):
        raise RolloutError('Production state changed after preparation.')
    source, auth_env = inspect_auth()
    if hashlib.sha256(json.dumps(source['Config'], sort_keys=True).encode()).hexdigest() != data['authConfigHash'] or not source['State']['Running']:
        raise RolloutError('Production Auth configuration changed.')
    if digest(SITE) != data['nginx']['siteHash'] or digest('/etc/nginx/nginx.conf') != data['nginx']['rootHash']:
        raise RolloutError('Production nginx configuration changed.')
    if any(p.exists() for p in [HTTP_CONFIG, IP_CONFIG, SERVER_CONFIG]):
        raise RolloutError('Security nginx destination already exists.')
    app_env = read_app_env()
    if candidate_digest() != data['candidateHash']:
        raise RolloutError('Prepared application files changed.')
    for name, expected in data['payloadHashes'].items():
        if digest(STATE / 'payload' / name) != expected:
            raise RolloutError('Prepared payload changed.')
    e = dict(auth_env)
    e.update(GOTRUE_DISABLE_SIGNUP='false', GOTRUE_SECURITY_CAPTCHA_ENABLED='true',
             GOTRUE_SECURITY_CAPTCHA_PROVIDER='turnstile',
             GOTRUE_SECURITY_CAPTCHA_SECRET=app_env['TURNSTILE_SECRET_KEY'], GOTRUE_MAILER_AUTOCONFIRM='false')
    # Failures here occur before the old Auth is stopped.
    new_auth = create_auth(source, e, NEW_AUTH)
    data.update(phase='activating', newAuthId=new_auth)
    save_state(data)
    auth_stopped = False
    ingress_changed = False
    try:
        print('Migration-lar vahid transaction ilə tətbiq olunur.', flush=True)
        sql(migration_sql())
        data['migrationsApplied'] = True
        save_state(data)
        for target, source_path in [(HTTP_CONFIG, STATE / 'http.conf'), (IP_CONFIG, STATE / 'cloudflare-real-ip.conf'), (SERVER_CONFIG, STATE / 'server.conf'), (SITE, STATE / 'site.after.conf')]:
            ingress_changed = True
            private_write(target, source_path.read_bytes())
            target.chmod(0o644)
        run(['nginx', '-t'])
        run(['systemctl', 'reload', 'nginx'])
        print('Auth əvvəlki JWT/SMTP/database parametrləri qorunaraq yenilənir.', flush=True)
        run(['docker', 'stop', '--time', '15', OLD_AUTH])
        auth_stopped = True
        run(['docker', 'start', new_auth])
        wait_health(9998)
        print('Tətbiq canlı porta keçirilir və 25 oxuma yoxlaması icra olunur.', flush=True)
        # Frozen, reviewed script is copied to a deploy-readable private path.
        activation = BASE / 'activate-reviewed.mjs'
        private_write(activation, (STATE / 'payload' / 'activate-app.mjs').read_bytes())
        owner = pwd.getpwnam('deploy')
        os.chown(activation, owner.pw_uid, owner.pw_gid)
        output = deploy(['node', str(activation), COMMIT], timeout=420)
        app_result = json.loads(output)
        check_app(APP)
        if not all(installed().values()) or sql('select admin_mfa_required from public.security_configuration where id=true') != 'f':
            raise RolloutError('Post-deployment database security state is unexpected.')
        data.update(phase='deployed', app=app_result, adminMfaRequired=False,
                    deployedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
        save_state(data)
        publish(data)
        print('Təhlükəsizlik release-i canlıdır. 25 yoxlama keçdi; database, Auth və tətbiq sağlamdır. MFA mövcud adminləri bloklamamaq üçün mərhələli rejimdə saxlanıldı.')
    except Exception:
        # Additive DB guards remain, MFA OFF. Never restore over live orders.
        try:
            current = [p for p in pm2() if p['name'] == 'alisveris-vds']
            if current and current[0]['pm2_env']['pm_cwd'] == APP:
                deploy(['pm2', 'delete', 'alisveris-vds'])
                deploy(['pm2', 'start', str(RELEASE / 'rollback.config.cjs'), '--only', 'alisveris-vds'])
                deploy(['pm2', 'save'])
            if auth_stopped:
                run(['docker', 'stop', '--time', '10', new_auth])
                run(['docker', 'start', OLD_AUTH])
                wait_health(9998)
            if ingress_changed:
                restore_ingress()
            marker = RELEASE / 'deployment-result.json'
            if marker.exists():
                result = json.loads(marker.read_text())
                result['status'] = 'rolled-back'
                private_write(marker, json.dumps(result, indent=2))
                owner = pwd.getpwnam('deploy')
                os.chown(marker, owner.pw_uid, owner.pw_gid)
            data['phase'] = 'rolled-back'
        except Exception:
            data['phase'] = 'rollback-needs-attention'
        save_state(data)
        publish(data)
        raise


if __name__ == '__main__':
    try:
        if os.geteuid() != 0:
            raise RolloutError('Bu əmri açıq root terminalında başladın.')
        os.umask(0o077)
        if sys.argv[1:] == ['prepare']:
            prepare()
        elif sys.argv[1:] == ['activate']:
            activate()
        elif sys.argv[1:] == ['status']:
            data = json.loads((STATE / 'state.json').read_text())
            publish(data)
            print('Rollout mərhələsi: ' + data['phase'] + '. Heç bir iş təkrarlanmadı.')
        else:
            raise RolloutError('Usage: rollout.py prepare|activate|status')
    except Exception as e:
        # Never echo an unexpected exception that might contain a credential.
        print(str(e) if isinstance(e, RolloutError) else 'Rollout dayandı. Məxfi məlumat çıxarılmadı; vəziyyəti yoxlayın.', file=sys.stderr)
        sys.exit(1)
