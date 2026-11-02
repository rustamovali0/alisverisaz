import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { encryptBackup, verifyBackup } from './backup-crypto.mjs';
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type:'spki',format:'pem' }, privateKeyEncoding:{type:'pkcs8',format:'pem'} });
for (const manipulation of ['none','ciphertext','metadata','wrong-key']) test('authenticated backup: '+manipulation, async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alisveris-crypto-'));
 try {
  const input=path.join(dir,'input'),output=path.join(dir,'backup.enc');
  fs.writeFileSync(input,'PGDMP example fixture data');
  const metadata=await encryptBackup(input,output,keys.publicKey,'example_database');
  if(manipulation==='ciphertext'){const bytes=fs.readFileSync(output);bytes[0]^=1;fs.writeFileSync(output,bytes);}
  if(manipulation==='metadata')metadata.context.database='another_database';
  const privateKey=manipulation==='wrong-key'?crypto.generateKeyPairSync('rsa',{modulusLength:2048}).privateKey:keys.privateKey;
  const result=verifyBackup(output,metadata,privateKey);
  if(manipulation==='none')await result;else await assert.rejects(result);
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
