"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getStorageUsage } from "./data";
export async function refreshStorageUsage() {
  const current = await requireRole(["admin"], "/radmin/storage");
  const limit = await consumeRateLimit(
    "admin-storage-refresh",
    current.user.id,
    2,
    60,
  );
  if (!limit.ok) return { ok: false, message: limit.message };
  await getStorageUsage(true);
  revalidatePath("/radmin/storage");
  return { ok: true, message: "Ölçülər yeniləndi." };
}
