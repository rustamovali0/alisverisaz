import { opendir, lstat } from "node:fs/promises";
import path from "node:path";
/** Bounded and read-only. Never follows symlinks or reads file contents. */
export async function directoryUsage(
  root: string,
  budgetMs = 2000,
  maxEntries = 20000,
) {
  let bytes = 0,
    files = 0,
    entries = 0,
    complete = true;
  const deadline = Date.now() + budgetMs;
  async function walk(directory: string): Promise<void> {
    if (Date.now() > deadline || entries >= maxEntries) {
      complete = false;
      return;
    }
    try {
      const dir = await opendir(directory);
      for await (const entry of dir) {
        if (++entries > maxEntries || Date.now() > deadline) {
          complete = false;
          break;
        }
        const target = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) await walk(target);
        else if (entry.isFile()) {
          try {
            const stat = await lstat(target);
            bytes += stat.size;
            files++;
          } catch {
            complete = false;
          }
        }
      }
    } catch {
      complete = false;
    }
  }
  await walk(root);
  return { bytes, files, complete };
}
