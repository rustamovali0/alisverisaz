import "server-only";
import { statfs, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/config/env.server";
import { createClient } from "@supabase/supabase-js";
const usageClient = (signal = AbortSignal.timeout(6000)) =>
  createClient(serverEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
  });
import { directoryUsage } from "./filesystem";

type Usage = {
  available: boolean;
  bytes: number;
  objects: number;
  complete: boolean;
  message: string;
};
const unavailable = (message: string): Usage => ({
  available: false,
  bytes: 0,
  objects: 0,
  complete: false,
  message,
});
export async function getMachineUsage() {
  const disk = await statfs(process.cwd());
  let availableRam = os.freemem();
  try {
    const info = await readFile("/proc/meminfo", "utf8");
    const k = Number(info.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
    if (Number.isFinite(k) && k > 0) availableRam = k * 1024;
  } catch {}
  return {
    disk: {
      total: disk.blocks * disk.bsize,
      available: disk.bavail * disk.bsize,
      used: (disk.blocks - disk.bfree) * disk.bsize,
    },
    ram: {
      total: os.totalmem(),
      available: availableRam,
      used: os.totalmem() - availableRam,
    },
    appRam: process.memoryUsage().rss,
    cpuCount: os.cpus().length,
    load: os.loadavg()[0],
    updatedAt: new Date().toISOString(),
  };
}
async function r2Usage(): Promise<Usage> {
  if (!serverEnv.hasR2Config)
    return unavailable("Cloudflare R2 bağlantısı sazlanmayıb.");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.r2AccessKeyId,
      secretAccessKey: serverEnv.r2SecretAccessKey,
    },
    maxAttempts: 1,
  });
  let bytes = 0,
    objects = 0,
    token: string | undefined;
  const abortSignal = AbortSignal.timeout(6000);
  try {
    for (let page = 0; page < 10; page++) {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: serverEnv.r2BucketName,
          MaxKeys: 1000,
          ContinuationToken: token,
        }),
        { abortSignal },
      );
      for (const object of result.Contents || []) {
        objects++;
        bytes += object.Size || 0;
      }
      if (!result.IsTruncated)
        return {
          available: true,
          bytes,
          objects,
          complete: true,
          message: "R2 fayllarının faktiki həcmi",
        };
      token = result.NextContinuationToken;
      if (!token) break;
    }
    return {
      available: true,
      bytes,
      objects,
      complete: false,
      message: "İlk 10 000 obyekt üzrə ölçü; tam həcm daha böyük ola bilər.",
    };
  } catch {
    return unavailable(
      "R2 siyahısını oxumaq mümkün olmadı. Mövcud açarın oxuma icazəsini yoxlayın.",
    );
  } finally {
    client.destroy();
  }
}
async function supabaseUsage(): Promise<Usage> {
  try {
    const db = usageClient();
    const buckets = await db.storage.listBuckets();
    if (buckets.error)
      return unavailable("Saytın Supabase Storage xidməti ölçülə bilmədi.");
    let bytes = 0,
      objects = 0,
      calls = 0,
      complete = true;
    const queue = (buckets.data || []).map((bucket) => ({
      bucket: bucket.id,
      prefix: "",
      offset: 0,
    }));
    while (queue.length && calls < 20) {
      const task = queue.shift()!;
      calls++;
      const r = await db.storage
        .from(task.bucket)
        .list(task.prefix, { limit: 1000, offset: task.offset });
      if (r.error)
        return unavailable("Supabase fayl siyahısına giriş alınmadı.");
      for (const object of r.data || []) {
        if (!object.id) {
          queue.push({
            bucket: task.bucket,
            prefix: [task.prefix, object.name].filter(Boolean).join("/"),
            offset: 0,
          });
          continue;
        }
        objects++;
        const size = Number(object.metadata?.size);
        if (Number.isFinite(size)) bytes += size;
        else complete = false;
      }
      if (r.data?.length === 1000)
        queue.push({ ...task, offset: task.offset + 1000 });
    }
    return {
      available: true,
      bytes,
      objects,
      complete: complete && !queue.length,
      message: queue.length
        ? "Oxuma limiti daxilində ölçülüb; yekun həcm daha böyük ola bilər."
        : "Saytın bağlı olduğu Supabase Storage faylları",
    };
  } catch {
    return unavailable("Supabase Storage yoxlaması cavab vermədi.");
  }
}
async function databaseUsage() {
  try {
    const db = usageClient() as any;
    const result = await db.rpc("admin_storage_usage");
    if (result.error)
      return {
        available: false,
        bytes: 0,
        message:
          "Bazanın dəqiq disk ölçüsü üçün admin ölçmə funksiyası quraşdırılmalıdır.",
      };
    const bytes = Number(result.data?.database_bytes);
    if (Number.isFinite(bytes) && bytes > 0)
      return {
        available: true,
        bytes,
        message: "PostgreSQL bazasının faktiki disk həcmi",
      };
  } catch {
    // The storage dashboard can render without the database metric.
  }
  return {
    available: false,
    bytes: 0,
    message: "Bazanın disk ölçüsü alınmadı.",
  };
}
let cached: Awaited<ReturnType<typeof measure>> | null = null;
let running: Promise<Awaited<ReturnType<typeof measure>>> | null = null;
async function measure() {
  const cwd = process.cwd();
  const production = cwd.startsWith("/srv/alisveris/releases/");
  const folders = [
    { label: "Aktiv tətbiq", folder: cwd },
    { label: "Şəkillər və statik fayllar", folder: path.join(cwd, "public") },
    { label: "Tətbiqin yığılmış versiyası", folder: path.join(cwd, ".next") },
  ];
  const [machine, r2, supabase, database, directories] = await Promise.all([
    getMachineUsage(),
    r2Usage(),
    supabaseUsage(),
    databaseUsage(),
    Promise.all(
      folders.map(async (item) => ({
        label: item.label,
        ...(await directoryUsage(item.folder)),
      })),
    ),
  ]);
  let releases: number | null = null;
  if (production)
    try {
      releases = (
        await readdir(path.resolve(cwd, "../.."), { withFileTypes: true })
      ).filter((d) => d.isDirectory()).length;
    } catch {}
  return {
    machine,
    r2,
    supabase,
    database,
    directories,
    releases,
    updatedAt: new Date().toISOString(),
    measuredAt: Date.now(),
  };
}
export async function getStorageUsage(force = false) {
  if (!force && cached && Date.now() - cached.measuredAt < 300000)
    return cached;
  running ??= measure()
    .then((value) => ((cached = value), value))
    .finally(() => {
      running = null;
    });
  return running;
}
export function formatBytes(value: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${new Intl.NumberFormat("az-AZ", { maximumFractionDigits: 1 }).format(value)} ${units[index]}`;
}
