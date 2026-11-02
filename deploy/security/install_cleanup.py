#!/usr/bin/env python3
"""Install reviewed root-owned cleanup and log retention, then apply its safe plan."""
import hashlib,json,os,pathlib,pwd,shutil,subprocess,time
SOURCE=pathlib.Path('/home/deploy/alisveris-security-setup/release_cleanup.py')
EXPECTED_SHA='d35bce9dcd3d6ae53c71c0a3c5237643145178e1d12e1dabdd1b0bc6a7a37132'
TARGET=pathlib.Path('/usr/local/sbin/alisveris-release-cleanup.py')
CRON=pathlib.Path('/etc/cron.d/alisveris-release-cleanup')
CRON_TEXT='SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n17 23 * * * root /usr/bin/python3 /usr/local/sbin/alisveris-release-cleanup.py --apply --auto >>/var/log/alisveris-release-cleanup.log 2>&1\n'

def run(args):
    result=subprocess.run(args,text=True,capture_output=True,timeout=240)
    if result.returncode:raise RuntimeError('Cleanup preparation/execution stopped; inspect the existing result before retrying.')
    return result.stdout.strip()

def main():
    if os.geteuid()!=0:raise RuntimeError('Run this installer in the root terminal.')
    if TARGET.is_symlink() or CRON.is_symlink():raise RuntimeError('Unexpected maintenance symlink; installation stopped.')
    if SOURCE.is_symlink() or hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=EXPECTED_SHA:raise RuntimeError('Reviewed source checksum does not match.')
    # A complete, non-mutating root inventory must succeed before installation/deletion.
    plan=json.loads(run(['/usr/bin/python3',str(SOURCE)]))
    required={'header-hover-20261101','enterprise-security-20261102','rtest-premium-20261014','branded-email-20261030'}
    if not required.issubset(plan['protected']):raise RuntimeError('An active/staged/rollback release was not protected; no cleanup applied.')
    backup=pathlib.Path('/root/alisveris-maintenance-config-20261102');backup.mkdir(mode=0o700,exist_ok=True)
    for path in (TARGET,CRON):
        saved=backup/path.name
        if path.exists() and not saved.exists():shutil.copyfile(path,saved);saved.chmod(0o600)
    pins=pathlib.Path('/etc/alisveris/cleanup-pins.json');pins.parent.mkdir(mode=0o755,exist_ok=True)
    if pins.is_symlink():raise RuntimeError('Unexpected retention configuration symlink.')
    configuration=json.loads(pins.read_text()) if pins.exists() else {}
    configuration['pendingDeployments']=sorted(set(configuration.get('pendingDeployments',[]))|{'enterprise-security-20261102'})
    pins.write_text(json.dumps(configuration,indent=2)+'\n');os.chown(pins,0,0);pins.chmod(0o600)
    TARGET.write_bytes(SOURCE.read_bytes());os.chown(TARGET,0,0);TARGET.chmod(0o750)
    CRON.write_text(CRON_TEXT);os.chown(CRON,0,0);CRON.chmod(0o644)
    log=pathlib.Path('/var/log/alisveris-release-cleanup.log')
    if not log.exists():log.touch(mode=0o600)
    rotation=pathlib.Path('/etc/logrotate.d/alisveris-maintenance')
    if not rotation.exists():
        text='/var/log/alisveris-release-cleanup.log {\n weekly\n rotate 4\n maxsize 1M\n compress\n missingok\n notifempty\n create 0600 root root\n}\n'
        existing=[]
        for path in pathlib.Path('/etc/logrotate.d').iterdir():
            if path.is_file() and '/home/deploy/.pm2/logs' in path.read_text(errors='ignore'):existing.append(path.name)
        if not existing:
            text+='\n/home/deploy/.pm2/logs/alisveris*.log {\n daily\n rotate 14\n maxsize 20M\n compress\n delaycompress\n missingok\n notifempty\n copytruncate\n su deploy deploy\n}\n'
        rotation.write_text(text);os.chown(rotation,0,0);rotation.chmod(0o644)
        run(['/usr/sbin/logrotate','-d',str(rotation)])
    result=json.loads(run(['/usr/bin/python3',str(TARGET),'--apply']))
    summary={'status':result['status'],'removedReleases':result['removedReleases'],'removedBuildArtifacts':result['removedBuildArtifacts'],'protected':list(result['protected']),'freedBytes':result['freedBytes'],'freeBytes':result['freeBytesAfter'],'schedule':'daily 03:17 Asia/Baku (23:17 UTC)','minimumReleaseAgeHours':48,'databaseBackupsTouched':False,'databaseOrAuthChanged':False}
    out=pathlib.Path('/home/deploy/alisveris-security-setup/cleanup-install-result.json');out.write_text(json.dumps(summary,indent=2)+'\n');out.chmod(0o600);owner=pwd.getpwnam('deploy');os.chown(out,owner.pw_uid,owner.pw_gid)
    print('Avtomatik təmizləmə quruldu. Lazımsız köhnə buraxılışlar silindi; işlək tətbiqlər, rollback və backup-lar saxlanıldı.')

if __name__=='__main__':
    try:main()
    except Exception as error:raise SystemExit(str(error) if type(error) is RuntimeError else 'Installer stopped; inspect status before retrying.')
