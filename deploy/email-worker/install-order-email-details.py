import hashlib,json,os,pathlib,pwd,subprocess
if os.geteuid()!=0:raise SystemExit('Bu əmri root terminalında icra edin.')
base=pathlib.Path('/home/deploy/alisveris-email-setup')
data=(base/'20261030160000_order_admin_email.sql').read_bytes()
if hashlib.sha256(data).hexdigest()!='59f5475c266920efe036b16e998b998f6b7c304b0b2da82620969cdf107baf7f':raise SystemExit('SQL yoxlama cəmi uyğun deyil.')
database=json.loads(pathlib.Path('/home/deploy/alisveris-email-preflight.json').read_text())['database']['name']
if database!='alisveris_candidate_20261010':raise SystemExit('Gözlənilməyən DB; dəyişiklik edilmədi.')
def sql(source):
 p=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-d',database,'-At'],input=source,text=True,capture_output=True,timeout=90)
 if p.returncode:raise RuntimeError('SQL yenilənmədi; transaction geri qaytarıldı.')
 return p.stdout.strip()
if sql("select exists(select 1 from pg_trigger where tgname='email_order_admin' and tgrelid='public.orders'::regclass and not tgisinternal)")!='t':sql(data.decode())
result=sql("select json_build_object('adminOrderTrigger',exists(select 1 from pg_trigger where tgname='email_order_admin' and tgrelid='public.orders'::regclass and not tgisinternal),'adminTemplate',exists(select 1 from public.email_system_templates where key='order_created_admin'))")
p=pathlib.Path('/home/deploy/alisveris-order-email-schema-result.json');p.write_text(result+'\n');p.chmod(0o600);owner=pwd.getpwnam('deploy');os.chown(p,owner.pw_uid,owner.pw_gid)
print('Admin sifariş bildirişi və ətraflı sifariş şablonu hazırdır. Test sifarişi və məktub yaradılmadı.')
