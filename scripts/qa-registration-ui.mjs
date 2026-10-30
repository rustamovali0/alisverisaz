import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

// Local-only regression fixture. All auth/network actions are replaced; no
// account, password, accepted agreement, upload or email is saved externally.
const root = process.cwd();
const output = path.resolve(root, '../registration-ui-preview');
fs.mkdirSync(output, { recursive: true });
const mocks = {
  'next/navigation': `export const useSearchParams=()=>new URLSearchParams('role=seller');`,
  '@/i18n/navigation': `import React from 'react';export function Link(props){return React.createElement('a',props)};export const useRouter=()=>({replace(){}});`,
  '@/lib/auth/use-client-auth-profile': `export const refreshCachedClientAuthProfile=async()=>{};`,
  '@/lib/auth/actions': `export async function registerAction(form){const media={};for(const key of ['avatarFile','bannerFile']){const file=form.get(key);media[key]=file instanceof File?{name:file.name,size:file.size}:null}window.dispatchEvent(new CustomEvent('qa-registration',{detail:media}));return{ok:false,message:'Lokal sınaq tamamlandı. Hesab yaradılmadı.'}};export const googleOAuthAction=async()=>({ok:false,message:'Lokal sınaq'});`,
};
await build({
  stdin: { contents: `import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';import {RegisterForm} from './src/components/auth/register-form';function Fixture(){const[result,setResult]=useState(null);useEffect(()=>{const handler=event=>setResult(event.detail);window.addEventListener('qa-registration',handler);return()=>window.removeEventListener('qa-registration',handler)},[]);return <><p className="mb-4 rounded-lg border bg-amber-50 p-3 text-sm">Lokal UI sınağı: real hesab yaradılmır, razılaşma bağlanmır, fayl və e-poçt göndərilmir.</p><RegisterForm userRegistrationEnabled storeRegistrationEnabled/><output aria-label="Sınaq nəticəsi" className="mt-6 block break-all rounded-lg bg-slate-100 p-4">{JSON.stringify(result)}</output></>};createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir: root, loader: 'tsx' },
  bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', outfile: output+'/app.js', alias: {'@': root+'/src'},
  plugins: [{ name:'mock-auth', setup(b){b.onResolve({filter: /^(next\/navigation|@\/i18n\/navigation|@\/lib\/auth\/(actions|use-client-auth-profile))$/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js',resolveDir:root}));}}],
});
const css=fs.readdirSync('.next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync('.next/static/chunks/'+name,'utf8')).join('\n');
fs.writeFileSync(output+'/app.css',css);
fs.writeFileSync(output+'/index.html','<!doctype html><html lang="az"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qeydiyyat — lokal UI sınağı</title><link rel="stylesheet" href="app.css"><body><main style="max-width:760px;padding:24px;margin:auto"><div id="root"></div></main><script type="module" src="app.js"></script></body></html>');
console.log(output);
