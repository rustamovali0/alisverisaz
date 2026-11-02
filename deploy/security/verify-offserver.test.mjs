import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { encryptBackup } from './backup-crypto.mjs';
import { verifyExport } from './verify-offserver.mjs';
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding:{ type:'spki',format:'pem' },privateKeyEncoding:{type:'pkcs8',format:'pem'} });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for (const scenario of ['valid','wrong-cipher-hash','wrong-plaintext-hash','not-prepared']) test('off-server recovery receipt: '+scenario, async()=>{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alisveris-offserver-'));
  try {
    fs.writeFileSync(path.join(directory, 'private.pem'), keys.privateKey, {mode:0o600});
    const plain = path.join(directory, 'fixture'); fs.writeFileSync(plain, 'fixture-only PostgreSQL backup');
    const encrypted = path.join(directory, 'database.dump.enc');
    await encryptBackup(plain, encrypted, keys.publicKey, 'alisveris_candidate_20261010');
    const state={phase:'prepared',database:'alisveris_candidate_20261010',backupBytes:fs.statSync(plain).size,backupPlainSha256:sha(plain),encryptedSha256:sha(encrypted),metadataSha256:sha(encrypted+'.json')};
    if(scenario==='wrong-cipher-hash')state.encryptedSha256='incorrect';
    if(scenario==='wrong-plaintext-hash')state.backupPlainSha256='incorrect';
    if(scenario==='not-prepared')state.phase='prepare-failed';
    fs.writeFileSync(path.join(directory,'rollout-result.json'),JSON.stringify(state));
    if(scenario==='valid')assert.equal((await verifyExport(directory)).status,'authenticated-offserver');
    else {await assert.rejects(verifyExport(directory));assert.equal(fs.existsSync(path.join(directory,'offserver-verified.json')),false);}
    assert.equal(fs.readdirSync(directory).some(f=>f.startsWith('.verify-plaintext-')),false);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
