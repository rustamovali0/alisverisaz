"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();
  const isActive = Boolean(favoriteId);

  useEffect(() => {
    let mounted = true;

    async function loadFavoriteState() {
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

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast({
          title: "Giriş tələb olunur",
          description: "Seçilmişlərə əlavə etmək üçün zəhmət olmasa giriş edin.",
          variant: "info",
        });
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (favoriteId) {
        const { error } = await (supabase as any)
          .from("favorites")
          .delete()
          .eq("id", favoriteId)
          .eq("user_id", user.id);

        if (error) {
          showToast({
            title: "Əməliyyatı tamamlamaq mümkün olmadı.",
            description: "Yenidən cəhd edin.",
            variant: "error",
          });
          return;
        }

        setFavoriteId(null);
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
        showToast({
          title: "Əməliyyatı tamamlamaq mümkün olmadı.",
          description: "Yenidən cəhd edin.",
          variant: "error",
        });
        return;
      }

      setFavoriteId(data.id);
      showToast({
        title: "Məhsul seçilmişlərə əlavə edildi.",
        variant: "success",
      });
    });
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
      disabled={!isReady || isPending}
      onClick={toggleFavorite}
      className={cn(
        "inline-flex items-center justify-center rounded-full border bg-background/95 text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
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
