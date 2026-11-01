"""Run as root after the email schema and application release are verified.
Uses existing server credentials, never prints credentials, and restores Auth if startup fails.
"""
import http.client,json,os,pathlib,pwd,secrets,smtplib,socket,ssl,subprocess,time,urllib.request
BASE=pathlib.Path('/home/deploy/alisveris-email-service')
SETUP=pathlib.Path('/home/deploy/alisveris-email-setup')
DATABASE='alisveris_candidate_20261010'
OWNER=pwd.getpwnam('deploy')
def run(args,input=None,timeout=60):
    p=subprocess.run(args,input=input,text=True,capture_output=True,timeout=timeout)
    if p.returncode: raise RuntimeError('Command failed: '+args[0])
    return p.stdout.strip()
def sql(query):
    return run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-d',DATABASE,'-At'],query)
def save(path,data,mode=0o600,deploy=False):
    path.write_text(data);path.chmod(mode)
    os.chown(path,OWNER.pw_uid if deploy else 0,OWNER.pw_gid if deploy else 0)
class DockerConnection(http.client.HTTPConnection):
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(45);self.sock.connect('/var/run/docker.sock')
def docker(method,path,data=None):
    c=DockerConnection('localhost');body=json.dumps(data).encode() if data is not None else None
    c.request(method,path,body,{'Content-Type':'application/json'});r=c.getresponse();raw=r.read();status=r.status;c.close()
    if status>=300: raise RuntimeError('Docker operation failed with HTTP '+str(status))
    return json.loads(raw) if raw else None

def main():
    if os.geteuid()!=0: raise RuntimeError('Run this command in the root terminal.')
    if sql("select to_regclass('public.email_campaigns') is not null")!='t': raise RuntimeError('Apply email schema first.')
    process=json.loads(run(['sudo','-u','deploy','-H','pm2','jlist']))
    live=next(p for p in process if p['name']=='alisveris-vds')
    app=pathlib.Path(live['pm2_env']['pm_cwd'])
    if app!=pathlib.Path('/srv/alisveris/releases/email-system-20261029/app'): raise RuntimeError('Deploy the verified email application release first.')
    smtp=json.loads((SETUP/'smtp.json').read_text())
    if smtp.get('SMTP_USER')!='admin@alisveris.az' or smtp.get('SMTP_HOST')!='smtp.hostinger.com': raise RuntimeError('Unexpected SMTP account.')
    with smtplib.SMTP_SSL('smtp.hostinger.com',465,timeout=15,context=ssl.create_default_context()) as connection:
        connection.login(smtp['SMTP_USER'],smtp['SMTP_PASSWORD'])
    # Public templates must be reachable before replacing Auth.
    for name in ['recovery','confirmation','email-change','password-changed','email-changed']:
        with urllib.request.urlopen('http://127.0.0.1:3004/email-templates/'+name+'.html',timeout=10) as response:
            body=response.read().decode()
            if response.status!=200 or 'ALİSVERİS.AZ' not in body: raise RuntimeError('Auth template unavailable.')
            if name=='recovery' and '.TokenHash' not in body: raise RuntimeError('Recovery template invalid.')
    # Node's dotenv parser handles existing server env quoting without printing it.
    node="const fs=require('node:fs');const {parseEnv}=require('node:util'); const e=parseEnv(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(JSON.stringify({SUPABASE_URL:e.NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:e.SUPABASE_SECRET_KEY||e.SUPABASE_SERVICE_ROLE_KEY}));"
    backend=json.loads(run(['node','-e',node,str(app/'app.env')]))
    if backend.get('SUPABASE_URL')!='https://api.alisveris.az' or not backend.get('SUPABASE_SERVICE_ROLE_KEY'): raise RuntimeError('Unexpected production backend.')
    if not (BASE/'worker.mjs').is_file() or not (BASE/'node_modules/nodemailer').is_dir(): raise RuntimeError('Worker runtime missing.')
    preflight=json.loads(pathlib.Path('/home/deploy/alisveris-email-preflight.json').read_text())
    old=preflight['authContainer']['id']
    source=docker('GET','/containers/'+old+'/json')
    if source['HostConfig']['NetworkMode']!='host' or source.get('Mounts'): raise RuntimeError('Auth configuration changed; inspect it first.')
    env=dict(item.split('=',1) for item in source['Config']['Env'] if '=' in item)
    env.update({
        'GOTRUE_SITE_URL':'https://alisveris.az',
        'GOTRUE_SMTP_HOST':'smtp.hostinger.com','GOTRUE_SMTP_PORT':'465',
        'GOTRUE_SMTP_USER':smtp['SMTP_USER'],'GOTRUE_SMTP_PASS':smtp['SMTP_PASSWORD'],
        'GOTRUE_SMTP_ADMIN_EMAIL':'no-reply@alisveris.az','GOTRUE_SMTP_SENDER_NAME':'ALİSVERİS.AZ',
        'GOTRUE_MAILER_TEMPLATES_RECOVERY':'http://127.0.0.1:3004/email-templates/recovery.html',
        'GOTRUE_MAILER_TEMPLATES_CONFIRMATION':'http://127.0.0.1:3004/email-templates/confirmation.html',
        'GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE':'http://127.0.0.1:3004/email-templates/email-change.html',
        'GOTRUE_MAILER_TEMPLATES_PASSWORD_CHANGED_NOTIFICATION':'http://127.0.0.1:3004/email-templates/password-changed.html',
        'GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGED_NOTIFICATION':'http://127.0.0.1:3004/email-templates/email-changed.html',
        'GOTRUE_MAILER_NOTIFICATIONS_PASSWORD_CHANGED_ENABLED':'true',
        'GOTRUE_MAILER_NOTIFICATIONS_EMAIL_CHANGED_ENABLED':'true',
        'GOTRUE_MAILER_SUBJECTS_RECOVERY':'ALİSVERİS.AZ — şifrə bərpası',
        'GOTRUE_MAILER_SUBJECTS_PASSWORD_CHANGED_NOTIFICATION':'ALİSVERİS.AZ — şifrəniz dəyişdirildi',
        'GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGED_NOTIFICATION':'ALİSVERİS.AZ — e-poçt ünvanınız dəyişdirildi',
    })
    urls=[u for u in env.get('GOTRUE_URI_ALLOW_LIST','').split(',') if u]
    recovery='https://alisveris.az/reset-password?mode=recovery'
    if recovery not in urls: urls.append(recovery)
    env['GOTRUE_URI_ALLOW_LIST']=','.join(urls)
    config=dict(source['Config']);config.pop('Hostname',None);config.pop('Domainname',None)
    config['Env']=[k+'='+v for k,v in env.items()];config['Image']=source['Image'];config['HostConfig']=source['HostConfig']
    replacement='alisveris-auth-email-20261029'
    result_path=pathlib.Path('/home/deploy/alisveris-email-activation-result.json')
    # An existing successful activation is not repeated.
    if result_path.exists() and json.loads(result_path.read_text()).get('activated'):
        print('E-poçt sistemi artıq aktivdir. Təkrar aktivləşdirilmədi.');return
    existing=run(['docker','ps','-aq','--filter','name=^/'+replacement+'$'])
    if existing:
        candidate=docker('GET','/containers/'+existing+'/json')
        candidate_env=dict(x.split('=',1) for x in candidate['Config']['Env'] if '=' in x)
        if candidate_env.get('GOTRUE_SMTP_PASS')!=smtp['SMTP_PASSWORD'] or candidate_env.get('GOTRUE_DB_DATABASE_URL')!=env.get('GOTRUE_DB_DATABASE_URL'):
            raise RuntimeError('Existing Auth replacement needs inspection; no changes made.')
        new=candidate['Id']
    else: new=docker('POST','/containers/create?name='+replacement,config)['Id']
    started=False
    try:
        docker('POST','/containers/'+old+'/stop?t=15')
        docker('POST','/containers/'+new+'/start');started=True
        port=env.get('GOTRUE_API_PORT','9999')
        for attempt in range(40):
            try:
                with urllib.request.urlopen('http://127.0.0.1:'+port+'/health',timeout=2) as response:
                    if response.status==200: break
            except Exception: time.sleep(.5)
        else: raise RuntimeError('Auth health check failed.')
    except Exception:
        if started:
            try: docker('POST','/containers/'+new+'/stop?t=10')
            except Exception: pass
        docker('POST','/containers/'+old+'/start')
        raise RuntimeError('Auth activation failed; original Auth restored.')
    BASE.mkdir(mode=0o700,parents=True,exist_ok=True);os.chown(BASE,OWNER.pw_uid,OWNER.pw_gid);BASE.chmod(0o700)
    config_file=BASE/'config.json'
    dispatch=json.loads(config_file.read_text()).get('EMAIL_DISPATCH_SECRET') if config_file.exists() else secrets.token_hex(32)
    worker={**backend,**smtp,'APP_ORIGIN':'https://alisveris.az','EMAIL_DELIVERY_ENABLED':'true','EMAIL_DISPATCH_SECRET':dispatch}
    save(config_file,json.dumps(worker)+'\n',deploy=True)
    if not (BASE/'worker.mjs').is_file() or not (BASE/'node_modules/nodemailer').is_dir(): raise RuntimeError('Worker runtime missing.')
    save(pathlib.Path('/etc/cron.d/alisveris-email'), 'SHELL=/bin/sh\nPATH=/usr/local/bin:/usr/bin:/bin\n* * * * * deploy /usr/bin/flock -n /home/deploy/alisveris-email-service/dispatch.lock /usr/bin/node /home/deploy/alisveris-email-service/worker.mjs >>/home/deploy/alisveris-email-worker.log 2>&1\n',0o644)
    save(pathlib.Path('/etc/logrotate.d/alisveris-email'),'/home/deploy/alisveris-email-worker.log {\n daily\n rotate 7\n size 1M\n compress\n missingok\n notifempty\n copytruncate\n su deploy deploy\n}\n',0o644)
    sql("update public.email_delivery_settings set enabled=true,admin_address='admin@alisveris.az' where id; insert into public.email_outbox(event_key,kind,recipient_role,to_address,payload) values('installation-delivery-test:20261029','delivery_test','administrator','admin@alisveris.az','{\"title\":\"ALİSVERİS.AZ — e-poçt sistemi testi\",\"body\":\"Supabase növbəsi və Hostinger göndərişi aktivləşdirildi. Bu, quraşdırmanın bir dəfəlik test məktubudur.\"}') on conflict(event_key) do nothing;")
    run(['sudo','-u','deploy','-H','node',str(BASE/'worker.mjs')],timeout=90)
    test=sql("select status from public.email_outbox where event_key='installation-delivery-test:20261029'")
    save(result_path,json.dumps({'activated':True,'authHealthy':True,'sender':'no-reply@alisveris.az','ownerTestStatus':test,'scheduler':'every_minute','at':time.time()})+'\n',deploy=True)
    print('Supabase Auth SMTP və e-poçt növbəsi aktivdir. Admin test məktubunun statusu: '+test)
if __name__=='__main__':
    try: main()
    except Exception as error:
        # Do not echo provider responses or auth/environment values.
        print('Aktivləşdirmə tamamlanmadı: '+ (str(error) if isinstance(error,RuntimeError) else type(error).__name__))
        raise SystemExit(1)
