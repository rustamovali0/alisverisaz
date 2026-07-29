"use client";

import {
  Grid2X2,
  Home,
  MessageCircle,
  ShoppingCart,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  className?: string;
};

function accountPath(role: AuthRole | null) {
  if (role === "admin") {
    return "/radmin";
  }

  if (role === "seller") {
    return "/admin";
  }

  return role ? "/dashboard" : "/login?next=/dashboard";
}

function messagesPath(role: AuthRole | null) {
  if (role === "admin") {
    return "/radmin/messages";
  }

  if (role === "seller") {
    return "/admin/messages";
  }

  return role ? "/dashboard/messages" : "/login?next=/dashboard/messages";
}

function accountLabel(role: AuthRole | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "seller") {
    return "Panel";
  }

  return role ? "Hesabım" : "Giriş";
}

function AccountIcon({ role }: { role: AuthRole | null }) {
  if (role === "admin") {
    return <ShieldCheck className="mx-auto size-6" aria-hidden="true" />;
  }

  if (role === "seller") {
    return <Store className="mx-auto size-6" aria-hidden="true" />;
  }

  return <UserRound className="mx-auto size-6" aria-hidden="true" />;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const profile = useClientAuthProfile();
  const pathname = usePathname();
  const role = profile.status === "authenticated" ? profile.role : null;
  const items = [
    { href: "/", label: "Ana", icon: Home },
    { href: "/products", label: "Məhsullar", icon: Grid2X2 },
    { href: "/cart", label: "Səbət", icon: ShoppingCart },
    { href: messagesPath(role), label: "Mesajlar", icon: MessageCircle },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 w-full max-w-full overflow-x-clip border-t bg-background/95 px-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-2xl shadow-slate-950/15 backdrop-blur sm:px-2 md:hidden",
        className,
      )}
      aria-label="Mobil naviqasiya"
    >
      <div className="grid w-full min-w-0 grid-cols-5 items-center text-center">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid min-h-14 min-w-0 place-items-center gap-1 rounded-md px-1 text-[10px] font-semibold uppercase text-muted-foreground transition hover:bg-accent hover:text-accent-foreground min-[390px]:text-[11px]",
                isActive && "bg-primary/10 text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="mx-auto size-6" aria-hidden="true" />
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href={accountPath(role)}
          className={cn(
            "grid min-h-14 min-w-0 place-items-center gap-1 rounded-md px-1 text-[10px] font-semibold uppercase text-muted-foreground transition hover:bg-accent hover:text-accent-foreground min-[390px]:text-[11px]",
            (pathname.startsWith("/dashboard") ||
              pathname.startsWith("/admin") ||
              pathname.startsWith("/radmin")) &&
              "bg-primary/10 text-primary",
          )}
          aria-current={
            pathname.startsWith("/dashboard") ||
            pathname.startsWith("/admin") ||
            pathname.startsWith("/radmin")
              ? "page"
              : undefined
          }
        >
          <AccountIcon role={role} />
          <span className="max-w-full truncate leading-none">{accountLabel(role)}</span>
        </Link>
      </div>
    </nav>
  );
}
