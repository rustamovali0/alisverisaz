"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

async function loadFavoriteProductCache() {
  if (favoriteProductCache) {
    return favoriteProductCache;
  }

  if (!favoriteProductCachePromise) {
    favoriteProductCachePromise = (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) {
        return null;
      }

      const productIds = new Set<string>();
      for (const item of data ?? []) {
        if (typeof item?.product_id === "string") {
          productIds.add(item.product_id);
        }
      }

      favoriteProductCache = {
        userId: user.id,
        productIds,
      };

      return favoriteProductCache;
    })().finally(() => {
      favoriteProductCachePromise = null;
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

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setIsReady(true);
        }
        return;
      }

      const { data } = await (supabase as any)
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (mounted) {
        setFavoriteId(data?.id ?? null);
        setIsReady(true);
      }
    }

    void loadFavoriteState();

    return () => {
      mounted = false;
    };
  }, [productId]);

  function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isMutating) {
      showToast({ title: "Bir az gözləyin...", description: "Əməliyyat davam edir.", variant: "info" });
      return;
    }

    const previousFavoriteId = favoriteId;
    const wasActive = Boolean(previousFavoriteId);
    setIsMutating(true);
    setFavoriteId(wasActive ? null : productId);

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFavoriteId(previousFavoriteId);
        setIsMutating(false);
        showToast({
          title: "Giriş tələb olunur",
          description: "Seçilmişlərə əlavə etmək üçün zəhmət olmasa giriş edin.",
          variant: "info",
        });
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (favoriteProductCache && favoriteProductCache.userId !== user.id) {
        favoriteProductCache = null;
      }

      updateFavoriteProductCache(user.id, productId, !wasActive);

      try {
        if (wasActive) {
        let deleteQuery = (supabase as any)
          .from("favorites")
          .delete()
          .eq("user_id", user.id);

        deleteQuery = compact
          ? deleteQuery.eq("product_id", productId)
          : deleteQuery.eq("id", previousFavoriteId);

        const { error } = await deleteQuery;

          if (error) {
            throw error;
          }

        showToast({
          title: "Məhsul seçilmişlərdən çıxarıldı.",
          variant: "info",
        });
        return;
        }

      const { data, error } = await (supabase as any)
        .from("favorites")
        .insert({
          user_id: user.id,
          product_id: productId,
        })
        .select("id")
        .single();

        if (error) {
          throw error;
        }

      setFavoriteId(data.id);
      updateFavoriteProductCache(user.id, productId, true);
      showToast({
        title: "Məhsul seçilmişlərə əlavə edildi.",
        variant: "success",
      });
      } catch {
        setFavoriteId(previousFavoriteId);
        updateFavoriteProductCache(user.id, productId, wasActive);
        showToast({
          title: "Əməliyyatı tamamlamaq mümkün olmadı.",
          description: "Yenidən cəhd edin.",
          variant: "error",
        });
      } finally {
        setIsMutating(false);
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
        isActive && "border-primary/40 bg-primary text-primary-foreground hover:text-primary-foreground",
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
