import hashlib,json,os,pathlib,pwd,subprocess
if os.geteuid()!=0:raise SystemExit('Bu əmri root terminalında icra edin.')
p=pathlib.Path('/home/deploy/alisveris-email-setup/20261030140000_email_template_colors.sql');raw=p.read_bytes()
if hashlib.sha256(raw).hexdigest()!='2e8ec3f32b62b829d020edb1c5a26af2462ba38283c77122b7a05b419fe83ec2':raise SystemExit('SQL yoxlama cəmi uyğun deyil.')
def sql(q):
 r=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-d','alisveris_candidate_20261010','-At'],input=q,text=True,capture_output=True,timeout=45)
 if r.returncode:raise SystemExit('Rəng ayarları qurulmadı; SQL geri qaytarıldı.')
 return r.stdout.strip()
exists=sql("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='email_system_templates' and column_name='theme')")
if exists!='t':sql(raw.decode())
sql("notify pgrst,'reload schema'")
print('Məktub şablonlarının rəng ayarları hazırdır.')
