import fs from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

function decipher(metadata, key) {
  if (metadata.format !== 'alisveris-backup-v1' || metadata.cipher !== 'aes-256-gcm') throw Error('Unsupported backup format');
  const transform = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(metadata.iv, 'base64'));
  transform.setAAD(Buffer.from(JSON.stringify(metadata.context)));
  transform.setAuthTag(Buffer.from(metadata.tag, 'base64'));
  return transform;
}
export async function encryptBackup(input, output, publicKey, database) {
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const context = { database, createdAt: new Date().toISOString() };
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(context)));
  await pipeline(fs.createReadStream(input), cipher, fs.createWriteStream(output, { flags: 'wx', mode: 0o600 }));
  const metadata = { format: 'alisveris-backup-v1', cipher: 'aes-256-gcm', context,
    iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    wrappedKey: crypto.publicEncrypt({ key: publicKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, key).toString('base64') };
  // Authenticate the entire ciphertext before releasing the plaintext snapshot.
  await pipeline(fs.createReadStream(output), decipher(metadata, key), fs.createWriteStream('/dev/null'));
  fs.writeFileSync(output + '.json', JSON.stringify(metadata, null, 2) + '\n', { flags: 'wx', mode: 0o600 });
  key.fill(0);
  return metadata;
}
export async function verifyBackup(input, metadata, privateKey, output = '/dev/null') {
  const key = crypto.privateDecrypt({ key: privateKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(metadata.wrappedKey, 'base64'));
  try {
    await pipeline(fs.createReadStream(input), decipher(metadata, key), fs.createWriteStream(output, output === '/dev/null' ? {} : { flags: 'wx', mode: 0o600 }));
  } finally { key.fill(0); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, input, output, keyPath, database] = process.argv.slice(2);
  try {
    if (mode === 'encrypt') await encryptBackup(input, output, fs.readFileSync(keyPath), database);
    else if (mode === 'verify') await verifyBackup(input, JSON.parse(fs.readFileSync(input + '.json')), fs.readFileSync(output));
    else throw Error('Unknown operation');
    console.log(JSON.stringify({ status: 'verified', operation: mode }));
  } catch { console.error('Backup cryptographic validation failed'); process.exitCode = 1; }
}
