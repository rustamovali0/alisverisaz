#!/usr/bin/env python3
"""Print a REVIEWABLE realip fragment; never modifies Nginx or the firewall."""
import ipaddress,urllib.request
networks=[]
for family in (4,6):
 with urllib.request.urlopen('https://www.cloudflare.com/ips-v'+str(family),timeout=10) as r:
  if r.geturl()!='https://www.cloudflare.com/ips-v'+str(family):raise RuntimeError('Unexpected redirect')
  values=r.read(32768).decode().splitlines()
 parsed=[ipaddress.ip_network(v.strip()) for v in values if v.strip()]
 if len(parsed)<5 or any(n.version!=family or not n.is_global for n in parsed):raise RuntimeError('Unexpected CIDR response')
 networks+=parsed
print('# REVIEW before loading. Only trust actual Cloudflare source networks.')
for network in networks: print('set_real_ip_from '+str(network)+';')
print('real_ip_header CF-Connecting-IP;\nreal_ip_recursive on;')
