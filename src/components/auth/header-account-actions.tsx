"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  UserPlus,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthRole } from "@/lib/auth/types";
import {
  clearClientAuthProfileCache,
  useClientAuthProfile,
} from "@/lib/auth/use-client-auth-profile";
import { cn } from "@/lib/utils";

type HeaderAccountActionsProps = {
  className?: string;
};

function getPanelPath(role: AuthRole) {
  if (role === "admin") {
    return {
      href: "/radmin",
      labelKey: "adminPanel",
      icon: ShieldCheck,
    };
  }

  if (role === "seller") {
    return {
      href: "/store/dashboard",
      labelKey: "sellerPanel",
      icon: Store,
    };
  }

  return {
    href: "/dashboard",
    labelKey: "account",
    icon: UserRound,
  };
}

function createNextHref(pathname: string, target: "/login" | "/register") {
  const nextPath = pathname === "/login" || pathname === "/register" ? "/" : pathname;
  const params = new URLSearchParams({ next: nextPath });

  return `${target}?${params.toString()}`;
}

export function clearHeaderAccountCache() {
  clearClientAuthProfileCache();
}

export function HeaderAccountActions({ className }: HeaderAccountActionsProps) {
  const auth = useTranslations("auth");
  const nav = useTranslations("nav");
  const roles = useTranslations("roles");
  const profile = useClientAuthProfile();
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleLogout() {
    startTransition(async () => {
      const result = await logoutAction();

      if (!result.ok) {
        void appAlert.error(result.message, auth("logoutFailed"));
        return;
      }

      clearHeaderAccountCache();
      setIsOpen(false);
      void appAlert.success(auth("loggedOut"), result.message);
      router.replace("/");
      router.refresh();
    });
  }

  if (profile.status === "loading") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button asChild variant="ghost">
          <Link href={createNextHref(pathname, "/login")}>
            <LogIn className="mr-2 size-4" aria-hidden="true" />
            {auth("login")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={createNextHref(pathname, "/register")}>
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            {auth("register")}
          </Link>
        </Button>
      </div>
    );
  }

  if (profile.status === "guest" || profile.role === "admin") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button asChild variant="ghost">
          <Link href={createNextHref(pathname, "/login")}>
            <LogIn className="mr-2 size-4" aria-hidden="true" />
            {auth("login")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={createNextHref(pathname, "/register")}>
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            {auth("register")}
          </Link>
        </Button>
      </div>
    );
  }

  const role = profile.role;

  if (!role) {
    return null;
  }

  const panel = getPanelPath(role);
  const PanelIcon = panel.icon;
  const initials =
    profile.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("az-AZ") || "A";

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2 pl-2 pr-3"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-xs font-black text-primary">
          {initials}
        </span>
        <span className="hidden max-w-28 truncate text-left xl:inline">
          {profile.fullName ?? profile.email ?? roles(role)}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </Button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-md border bg-popover p-2 text-popover-foreground shadow-xl"
          role="menu"
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-semibold">
              {profile.fullName ?? profile.email ?? nav("account")}
            </p>
            <p className="text-xs text-muted-foreground">{roles(role)}</p>
          </div>
          <Link
            href={panel.href}
            className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <PanelIcon className="size-4" aria-hidden="true" />
            {nav(panel.labelKey)}
          </Link>
          {role === "customer" ? (
            <>
              <Link
                href="/dashboard/favorites"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Heart className="size-4" aria-hidden="true" />
                {nav("favorites")}
              </Link>
              <Link
                href="/dashboard/orders"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <Package className="size-4" aria-hidden="true" />
                {nav("orders")}
              </Link>
            </>
          ) : null}
          {role === "seller" ? (
            <Link
              href="/store/dashboard/products"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              {nav("products")}
            </Link>
          ) : null}
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-3 rounded-md border-t px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            onClick={handleLogout}
            disabled={isPending}
            role="menuitem"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {isPending ? auth("loggingOut") : auth("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
