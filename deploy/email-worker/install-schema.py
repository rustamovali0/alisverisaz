import hashlib,json,os,pathlib,pwd,subprocess
if os.geteuid()!=0: raise SystemExit('Bu əmri root konsolunda icra edin.')
base=pathlib.Path('/home/deploy/alisveris-email-setup')
expected={'20261029090000_transactional_email_outbox.sql': '27de4dab345ffe4a4185095b072a9e5e7cedd25d170b9fdf0b384142c0e55a85', '20261029100000_email_admin_center.sql': '4866306c2228c89bc418da1466dc5a9e2a1d5e0e62d1669a0c5205eadb1ed26e'}
manifest=json.loads(pathlib.Path('/home/deploy/alisveris-email-preflight.json').read_text())
database=manifest['database']['name']
if database!='alisveris_candidate_20261010': raise SystemExit('Gözlənilməyən DB; dəyişiklik edilmədi.')
def sql(query):
 p=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-d',database,'-At'],input=query,text=True,capture_output=True,timeout=90)
 if p.returncode: raise RuntimeError('SQL qurulması alınmadı. Dəyişiklik transaction daxilində geri qaytarıldı.')
 return p.stdout.strip()
core=sql("select to_regclass('public.email_outbox') is not null")=='t'
admin=sql("select to_regclass('public.email_campaigns') is not null")=='t'
if admin and not core: raise SystemExit('Uyğunsuz e-poçt sxemi; dəyişiklik edilmədi.')
parts=[]
for i,(name,checksum) in enumerate(expected.items()):
 data=(base/name).read_bytes()
 if hashlib.sha256(data).hexdigest()!=checksum: raise SystemExit('SQL yoxlama cəmi uyğun deyil.')
 if (i==0 and core) or (i==1 and admin): continue
 source=data.decode().strip()
 # Both source migrations are transactional; combine pending parts atomically.
 if source.startswith('--'): source=source[source.index('begin;'):]
 if not source.startswith('begin;') or not source.endswith('commit;'): raise SystemExit('Gözlənilməyən miqrasiya formatı.')
 parts.append(source[len('begin;'):-len('commit;')])
if parts: sql('begin;\n'+ '\n'.join(parts)+"\nnotify pgrst,'reload schema';\ncommit;")
status=sql("select json_build_object('schemaReady',to_regprocedure('public.email_queue_campaign(uuid,uuid,text,uuid[],text,text,text)') is not null,'deliveryEnabled',(select enabled from public.email_delivery_settings where id),'templates',(select count(*) from public.email_templates))")
p=pathlib.Path('/home/deploy/alisveris-email-schema-result.json');p.write_text(status+'\n');p.chmod(0o600);u=pwd.getpwnam('deploy');os.chown(p,u.pw_uid,u.pw_gid)
print('E-poçt verilənlər bazası hazırdır. SMTP göndərişi bu addımda aktivləşdirilmir.')
