"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { getClientAuthProfileOnce } from "@/lib/auth/use-client-auth-profile";
import {
  getFavoriteProductIdsAction,
  setFavoriteProductStateAction,
} from "@/lib/customer-account/actions";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type FavoriteToggleButtonProps = {
  productId: string;
  productName?: string;
  className?: string;
  compact?: boolean;
};

type FavoriteProductCache = {
  userId: string;
  productIds: Set<string>;
};

let favoriteProductCache: FavoriteProductCache | null = null;
let favoriteProductCachePromise: Promise<FavoriteProductCache | null> | null = null;
let favoriteProductCachePromiseUserId: string | null = null;
const FAVORITE_UPDATED_EVENT = "alisveris-favorite-updated";

type FavoriteUpdatedDetail = {
  productId: string;
  isActive: boolean;
};

function emitFavoriteUpdate(detail: FavoriteUpdatedDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<FavoriteUpdatedDetail>(FAVORITE_UPDATED_EVENT, { detail }));
  }
}

async function loadFavoriteProductCache() {
  const authProfile = await getClientAuthProfileOnce();

  if (authProfile.status !== "authenticated") {
    favoriteProductCache = null;
    return null;
  }

  if (favoriteProductCache?.userId === authProfile.userId) {
    return favoriteProductCache;
  }

  favoriteProductCache = null;

  if (favoriteProductCachePromiseUserId !== authProfile.userId) {
    favoriteProductCachePromise = null;
  }

  if (!favoriteProductCachePromise) {
    favoriteProductCachePromiseUserId = authProfile.userId;
    favoriteProductCachePromise = (async () => {
      const result = await getFavoriteProductIdsAction();
      if (!result.ok) {
        return null;
      }

      const productIds = new Set<string>();
      for (const productId of result.productIds) productIds.add(productId);

      favoriteProductCache = {
        userId: authProfile.userId,
        productIds,
      };

      return favoriteProductCache;
    })().finally(() => {
      favoriteProductCachePromise = null;
      favoriteProductCachePromiseUserId = null;
    });
  }

  return favoriteProductCachePromise;
}

function updateFavoriteProductCache(userId: string, productId: string, isActive: boolean) {
  if (!favoriteProductCache || favoriteProductCache.userId !== userId) {
    return;
  }

  if (isActive) {
    favoriteProductCache.productIds.add(productId);
    return;
  }

  favoriteProductCache.productIds.delete(productId);
}

export function FavoriteToggleButton({
  productId,
  productName = "Məhsul",
  className,
  compact = false,
}: FavoriteToggleButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const isMutatingRef = useRef(false);
  const isActive = Boolean(favoriteId);

  useEffect(() => {
    let mounted = true;

    async function loadFavoriteState() {
      if (compact) {
        const cache = await loadFavoriteProductCache();

        if (mounted) {
          setFavoriteId(cache?.productIds.has(productId) ? productId : null);
          setIsReady(true);
        }

        return;
      }

      const authProfile = await getClientAuthProfileOnce();

      if (authProfile.status !== "authenticated") {
        if (mounted) {
          setIsReady(true);
        }
        return;
      }

      const result = await getFavoriteProductIdsAction();

      if (mounted) {
        setFavoriteId(result.ok && result.productIds.includes(productId) ? productId : null);
        setIsReady(true);
      }
    }

    void loadFavoriteState();

    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    function handleFavoriteUpdate(event: Event) {
      const detail = (event as CustomEvent<FavoriteUpdatedDetail>).detail;

      if (detail?.productId === productId) {
        setFavoriteId(detail.isActive ? productId : null);
      }
    }

    window.addEventListener(FAVORITE_UPDATED_EVENT, handleFavoriteUpdate);
    return () => window.removeEventListener(FAVORITE_UPDATED_EVENT, handleFavoriteUpdate);
  }, [productId]);

  function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isMutatingRef.current) {
      showToast({ title: "Bir az gözləyin...", description: "Əməliyyat davam edir.", variant: "info" });
      return;
    }

    const previousFavoriteId = favoriteId;
    const wasActive = Boolean(previousFavoriteId);
    isMutatingRef.current = true;
    setIsMutating(true);
    setFavoriteId(wasActive ? null : productId);
    emitFavoriteUpdate({ productId, isActive: !wasActive });

    void (async () => {
      const authProfile = await getClientAuthProfileOnce();

      if (authProfile.status !== "authenticated") {
        setFavoriteId(previousFavoriteId);
        emitFavoriteUpdate({ productId, isActive: wasActive });
        setIsMutating(false);
        isMutatingRef.current = false;
        showToast({
          title: "Giriş tələb olunur",
          description: "Seçilmişlərə əlavə etmək üçün zəhmət olmasa giriş edin.",
          variant: "info",
        });
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const userId = authProfile.userId;

      if (favoriteProductCache && favoriteProductCache.userId !== userId) {
        favoriteProductCache = null;
      }

      updateFavoriteProductCache(userId, productId, !wasActive);

      try {
        const result = await setFavoriteProductStateAction(productId, !wasActive);
        if (!result.ok) throw new Error(result.message);

        if (wasActive) {

        showToast({
          title: "Məhsul seçilmişlərdən çıxarıldı.",
          variant: "info",
        });
        return;
        }

      setFavoriteId(productId);
      updateFavoriteProductCache(userId, productId, true);
      showToast({
        title: "Məhsul seçilmişlərə əlavə edildi.",
        variant: "success",
      });
      } catch {
        setFavoriteId(previousFavoriteId);
        updateFavoriteProductCache(userId, productId, wasActive);
        emitFavoriteUpdate({ productId, isActive: wasActive });
        showToast({
          title: "Əməliyyatı tamamlamaq mümkün olmadı.",
          description: "Yenidən cəhd edin.",
          variant: "error",
        });
      } finally {
        setIsMutating(false);
        isMutatingRef.current = false;
      }
    })();
  }

  return (
    <button
      type="button"
      aria-label={
        isActive
          ? `${productName} seçilmişlərdən çıxar`
          : `${productName} seçilmişlərə əlavə et`
      }
      aria-pressed={isActive}
      disabled={!isReady}
      onClick={toggleFavorite}
      className={cn(
        "inline-flex items-center justify-center rounded-full border bg-background/95 text-foreground shadow-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 md:hover:shadow-md",
        compact ? "size-10" : "size-11",
        isActive && "border-foreground/25 bg-background text-foreground hover:text-foreground",
        className,
      )}
    >
      <Heart
        className={cn("size-5", isActive && "fill-current")}
        aria-hidden="true"
      />
    </button>
  );
}
