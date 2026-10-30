import hashlib,json,os,pathlib,pwd,subprocess
if os.geteuid()!=0:raise SystemExit('Bu əmri root terminalında icra edin.')
base=pathlib.Path('/home/deploy/alisveris-email-setup');expected={'20261030120000_system_email_templates.sql': 'a73dd5e9d40e6eabbb56a3ad9be117a9596520cead0975789cfe4aa97d305ee7', '20261030130000_seller_email_campaigns.sql': 'b5a945cc94dbdf183495a89e480325c4b0818fac419b6af05c34e53bf296c0ac'}
database=json.loads(pathlib.Path('/home/deploy/alisveris-email-preflight.json').read_text())['database']['name']
if database!='alisveris_candidate_20261010':raise SystemExit('Gözlənilməyən DB; dəyişiklik edilmədi.')
def sql(source):
 p=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-d',database,'-At'],input=source,text=True,capture_output=True,timeout=90)
 if p.returncode:raise RuntimeError('SQL yenilənmədi; transaction geri qaytarıldı.')
 return p.stdout.strip()
if sql("select to_regclass('public.email_campaigns') is not null")!='t':raise SystemExit('Əsas e-poçt sxemi yoxdur; dəyişiklik edilmədi.')
parts=[]
for index,(name,checksum) in enumerate(expected.items()):
 data=(base/name).read_bytes()
 if hashlib.sha256(data).hexdigest()!=checksum:raise SystemExit('SQL yoxlama cəmi uyğun deyil.')
 table='email_system_templates' if index==0 else 'seller_email_permissions'
 if sql("select to_regclass('public."+table+"') is not null")=='t':continue
 source=data.decode().strip()
 if not source.startswith('begin;') or not source.endswith('commit;'):raise SystemExit('Miqrasiya formatı uyğun deyil.')
 parts.append(source[len('begin;'):-len('commit;')])
if parts:sql('begin;\n'+'\n'.join(parts)+"\nnotify pgrst,'reload schema';\ncommit;")
result=sql("select json_build_object('systemTemplates',(select count(*) from public.email_system_templates),'sellerPermissionFunction',to_regprocedure('public.email_queue_seller_campaign(uuid,uuid,uuid,text,text)') is not null,'enabledSellerPermissions',(select count(*) from public.seller_email_permissions where enabled),'deliveryEnabled',(select enabled from public.email_delivery_settings where id))")
p=pathlib.Path('/home/deploy/alisveris-system-email-schema-result.json');p.write_text(result+'\n');p.chmod(0o600);owner=pwd.getpwnam('deploy');os.chown(p,owner.pw_uid,owner.pw_gid)
print('Avtomatik məktub şablonları və satıcı kampaniya icazələri hazırdır. Mövcud göndəriş sistemi dəyişdirilmədi.')
