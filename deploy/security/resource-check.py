#!/usr/bin/env python3
"""Read-only, silent when healthy. Example systemd timer: every 5 minutes.
No mail, external monitoring, credentials, or automatic service restarts."""
import json,os,shutil,subprocess
issues=[]
disk=shutil.disk_usage('/')
if disk.free/disk.total<0.10:issues.append('disk_free_under_10_percent')
mem={line.split(':')[0]:int(line.split()[1]) for line in open('/proc/meminfo')}
if mem.get('MemAvailable',0)/mem.get('MemTotal',1)<0.10:issues.append('memory_available_under_10_percent')
if os.getloadavg()[0]>max(2,os.cpu_count()*2):issues.append('load_over_2x_cpus')
if subprocess.run(['systemctl','is-active','--quiet','nginx'],check=False).returncode:issues.append('nginx_inactive')
if issues:print(json.dumps({'event':'resource_warning','issues':issues}));raise SystemExit(2)
