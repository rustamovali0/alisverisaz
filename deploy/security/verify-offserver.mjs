import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyBackup } from './backup-crypto.mjs';

const DATABASE = 'alisveris_candidate_20261010';
const REMOTE = 'deploy@178.208.187.209:/home/deploy/alisveris-security-setup/';
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

export async function verifyExport(directory) {
  const state = JSON.parse(fs.readFileSync(path.join(directory, 'rollout-result.json')));
  if (state.phase !== 'prepared' || state.database !== DATABASE) throw Error('Root preparation is not complete');
  const encrypted = path.join(directory, 'database.dump.enc');
  const metadataFile = encrypted + '.json';
  if (sha(encrypted) !== state.encryptedSha256 || sha(metadataFile) !== state.metadataSha256) throw Error('Export checksum mismatch');
  const metadata = JSON.parse(fs.readFileSync(metadataFile));
  if (metadata.context.database !== DATABASE) throw Error('Unexpected backup target');
  const privateKey = path.join(directory, 'private.pem');
  if ((fs.statSync(privateKey).mode & 0o077) !== 0) throw Error('Recovery private key permissions must be 0600');
  const plain = path.join(directory, '.verify-plaintext-' + crypto.randomUUID());
  try {
    await verifyBackup(encrypted, metadata, fs.readFileSync(privateKey), plain);
    if (fs.statSync(plain).size !== state.backupBytes || sha(plain) !== state.backupPlainSha256) throw Error('Decrypted backup does not match the root snapshot');
  } finally { fs.rmSync(plain, { force: true }); }
  const receipt = Object.fromEntries(['encryptedSha256', 'metadataSha256', 'backupPlainSha256'].map(k => [k, state[k]]));
  receipt.verifiedAt = new Date().toISOString();
  receipt.status = 'authenticated-offserver';
  const output = path.join(directory, 'offserver-verified.json');
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(output, 0o600);
  return receipt;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const directory = path.resolve(process.argv[2] || '');
    if (!process.argv[2] || !fs.existsSync(path.join(directory, 'private.pem'))) throw Error('Existing private recovery directory is required');
    fs.chmodSync(directory, 0o700);
    const args = ['-i', path.join(os.homedir(), '.ssh/alisveris_vds'), '-o', 'BatchMode=yes'];
    // Transfer only ciphertext and its public verification receipt. The private
    // recovery key is never an scp source or remote command argument.
    execFileSync('scp', [...args, REMOTE + 'rollout-result.json', path.join(directory, 'rollout-result.json')], { stdio: 'ignore', timeout: 30000 });
    const state = JSON.parse(fs.readFileSync(path.join(directory, 'rollout-result.json')));
    if (state.phase !== 'prepared' || state.database !== DATABASE) throw Error('Root preparation is not complete');
    for (const name of ['database.dump.enc', 'database.dump.enc.json']) {
      execFileSync('scp', [...args, REMOTE + name, path.join(directory, name)], { stdio: 'ignore', timeout: 30000 });
      fs.chmodSync(path.join(directory, name), 0o600);
    }
    const receipt = await verifyExport(directory);
    execFileSync('scp', [...args, path.join(directory, 'offserver-verified.json'), REMOTE + 'offserver-verified.json'], { stdio: 'ignore', timeout: 30000 });
    console.log(JSON.stringify(receipt));
  } catch {
    console.error('Off-server backup verification incomplete; no deployment started.');
    process.exitCode = 1;
  }
}
