"use client";

import { useEffect, useState } from "react";
import { Heart, Home, LogIn, ShoppingCart, Store, UserRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  className?: string;
};

function accountPath(role: AuthRole | null) {
  if (role === "seller") {
    return "/admin";
  }

  return "/dashboard";
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const [role, setRole] = useState<AuthRole | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setRole(null);
          setIsChecked(true);
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .returns<Array<{ role: AuthRole }>>()
        .maybeSingle();

      if (mounted) {
        setRole(data?.role === "seller" ? "seller" : "customer");
        setIsChecked(true);
      }
    }

    void loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  const centerHref = isChecked && role ? accountPath(role) : "/login";
  const centerLabel = isChecked && role ? (role === "seller" ? "Panel" : "Hesabım") : "Giriş et";
  const AccountIcon = role === "seller" ? Store : UserRound;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-2xl shadow-slate-950/15 backdrop-blur md:hidden",
        className,
      )}
      aria-label="Mobil naviqasiya"
    >
      <div className="grid grid-cols-5 items-end text-center">
        <Link href="/" className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <Home className="mx-auto size-7" aria-hidden="true" />
          Əsas
        </Link>
        <Link href="/dashboard/favorites" className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <Heart className="mx-auto size-7" aria-hidden="true" />
          Seçilmişlər
        </Link>
        <Link
          href={centerHref}
          className="-mt-8 grid justify-items-center gap-1 text-[10px] font-bold uppercase text-primary"
        >
          <span className="grid size-16 place-items-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/35">
            {isChecked && role ? (
              <AccountIcon className="size-8" aria-hidden="true" />
            ) : (
              <LogIn className="size-8" aria-hidden="true" />
            )}
          </span>
          {centerLabel}
        </Link>
        <Link href="/cart" className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <ShoppingCart className="mx-auto size-7" aria-hidden="true" />
          Səbət
        </Link>
        <Link href={accountPath(role)} className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <UserRound className="mx-auto size-7" aria-hidden="true" />
          Kabinet
        </Link>
      </div>
    </nav>
  );
}
