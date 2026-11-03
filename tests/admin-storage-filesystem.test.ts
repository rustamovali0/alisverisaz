import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { directoryUsage } from "@/lib/admin/storage/filesystem";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("measures file sizes without following a symlink outside the reviewed root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "alisveris-usage-"));
  roots.push(root);
  await mkdir(path.join(root, "app"));
  await writeFile(path.join(root, "app", "image"), "abc");
  await writeFile(path.join(root, "outside"), "a".repeat(100));
  await symlink(path.join(root, "outside"), path.join(root, "app", "link"));
  expect(await directoryUsage(path.join(root, "app"))).toEqual({
    bytes: 3,
    files: 1,
    complete: true,
  });
});
it("marks a bounded filesystem walk incomplete rather than inventing a total", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "alisveris-usage-"));
  roots.push(root);
  await writeFile(path.join(root, "a"), "123");
  await writeFile(path.join(root, "b"), "456");
  expect((await directoryUsage(root, 2000, 1)).complete).toBe(false);
});
