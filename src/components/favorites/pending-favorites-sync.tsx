"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import { setFavoriteProductStateAction } from "@/lib/customer-account/actions";
import {
  readPendingFavorites,
  savePendingFavorite,
} from "@/lib/catalog/pending-favorites";
let syncing: Promise<void> | null = null;
export function PendingFavoritesSync() {
  const { profile, isResolved } = useClientAuthProfileState();
  const router = useRouter();
  useEffect(() => {
    if (
      !isResolved ||
      profile.status !== "authenticated" ||
      profile.role === "admin"
    )
      return;
    if (!syncing && readPendingFavorites().length)
      syncing = (async () => {
        let changed = false;
        for (const id of readPendingFavorites()) {
          try {
            const result = await setFavoriteProductStateAction(id, true);
            if (!result.ok) continue;
            savePendingFavorite(id, false);
            window.dispatchEvent(
              new CustomEvent("alisveris-favorite-updated", {
                detail: { productId: id, isActive: true },
              }),
            );
            changed = true;
          } catch {
            /* Retain intent for the next authenticated visit. */
          }
        }
        if (changed) router.refresh();
      })().finally(() => {
        syncing = null;
      });
  }, [isResolved, profile.status, profile.userId, profile.role, router]);
  return null;
}
