import "server-only";
import { constants } from "node:fs";
import { mkdir, open, realpath, statfs, unlink } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface StorageProvider {
  put(key: string, bytes: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  url(key: string): string;
}
export function assertObjectKey(key: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(key)) throw new Error("INVALID_OBJECT_KEY");
}
export class R2StorageProvider implements StorageProvider {
  constructor(private client: S3Client, private bucket: string, private publicBase: string) {}
  url(key: string) { assertObjectKey(key); return `${this.publicBase.replace(/\/+$/, "")}/${key}`; }
  async put(key: string, bytes: Buffer) {
    assertObjectKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
  }
  async delete(key: string) { assertObjectKey(key); await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
}
export class LocalStorageProvider implements StorageProvider {
  constructor(private root: string, private publicBase: string, private reserveBytes = 10_000_000_000) {
    if (!path.isAbsolute(root)) throw new Error("ABSOLUTE_UPLOAD_ROOT_REQUIRED");
  }
  url(key: string) { assertObjectKey(key); return `${this.publicBase.replace(/\/+$/, "")}/${key}`; }
  async put(key: string, bytes: Buffer) {
    assertObjectKey(key);
    await mkdir(this.root, { recursive: true, mode: 0o750 });
    if (await realpath(this.root) !== path.resolve(this.root)) throw new Error("UPLOAD_ROOT_SYMLINK_FORBIDDEN");
    const disk = await statfs(this.root);
    if (disk.bavail * disk.bsize - bytes.length < this.reserveBytes) throw new Error("UPLOAD_DISK_RESERVE");
    const target = path.join(this.root, key);
    const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o640);
    try { await handle.writeFile(bytes); await handle.sync(); }
    catch (error) { await unlink(target).catch(() => undefined); throw error; }
    finally { await handle.close(); }
  }
  async delete(key: string) {
    assertObjectKey(key);
    if (await realpath(this.root) !== path.resolve(this.root)) throw new Error("UPLOAD_ROOT_SYMLINK_FORBIDDEN");
    await unlink(path.join(this.root, key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
}
