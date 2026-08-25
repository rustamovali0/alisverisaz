"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";

type CustomerDashboardNavItem = {
  href: string;
  label: string;
};

type CustomerDashboardNavigationProps = {
  items: CustomerDashboardNavItem[];
};

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function CustomerDashboardNavigation({ items }: CustomerDashboardNavigationProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="container flex gap-2 overflow-x-auto pb-4" aria-label="Hesab bölmələri">
      {items.map((item) => {
        const active = (pendingHref ?? (isActive(pathname, item.href) ? item.href : null)) === item.href;

        return (
          <Button key={item.href} asChild variant={active ? "default" : "outline"} size="sm" className="shrink-0">
            <Link href={item.href} prefetch aria-current={active ? "page" : undefined} onClick={() => setPendingHref(item.href)}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
