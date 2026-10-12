import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { assertObjectKey, LocalStorageProvider } from "@/lib/storage/providers";
it.each(["../a.webp", "/tmp/a.webp", "a.php", "%2e%2e/a.webp", "a.webp?x=1"])("rejects unsafe object key %s", (key) => {
  expect(() => assertObjectKey(key)).toThrow();
});
it("writes exclusively and deletes within the upload root", async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "storage-test-")));
  const provider = new LocalStorageProvider(root, "https://media.example.test", 0);
  const key = `${crypto.randomUUID()}.webp`;
  try {
    await provider.put(key, Buffer.from("fixture"));
    expect(await readFile(path.join(root, key), "utf8")).toBe("fixture");
    await expect(provider.put(key, Buffer.from("replace"))).rejects.toThrow();
    await provider.delete(key);
    await expect(readFile(path.join(root, key))).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
it("fails closed when required free space exceeds available disk", async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "storage-full-")));
  try { await expect(new LocalStorageProvider(root, "https://media.example.test", Number.MAX_SAFE_INTEGER).put(`${crypto.randomUUID()}.webp`, Buffer.from("fixture"))).rejects.toThrow("UPLOAD_DISK_RESERVE"); }
  finally { await rm(root, { recursive: true, force: true }); }
});
