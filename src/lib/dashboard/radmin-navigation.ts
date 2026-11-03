import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import { radminPanelHref } from "@/lib/auth/radmin-paths";

const sections = [
  {
    id: "sales",
    title: "Satış və mağazalar",
    paths: [
      "stores",
      "products",
      "product-transfer",
      "new-products",
      "locations",
      "orders",
      "whatsapp-orders",
      "delivery",
      "payments",
      "promos",
      "promotions",
      "subscriptions",
      "listing-limits",
      "deposits",
    ],
  },
  {
    id: "people",
    title: "İstifadəçilər və əlaqə",
    paths: ["users", "messages", "reviews", "announcements", "email"],
  },
  {
    id: "site",
    title: "Sayt və görünüş",
    paths: [
      "categories",
      "subdomains",
      "site-management",
      "homepage-sections",
      "searches",
      "menus",
      "themes",
      "colors",
      "media",
    ],
  },
  {
    id: "system",
    title: "Sistem və təhlükəsizlik",
    paths: [
      "storage",
      "settings",
      "danger",
      "audit-log",
      "user-activity-log",
      "activity",
      "store-panel-management",
      "user-panel-management",
      "mfa",
    ],
  },
  { id: "other", title: "Digər bölmələr", paths: [] },
];

export function groupRadminNavigation(items: DashboardNavItem[], query = "") {
  const needle = query.trim().toLocaleLowerCase("az-AZ");
  const groups = sections.map((section) => ({
    ...section,
    items: [] as DashboardNavItem[],
  }));
  for (const item of items) {
    const href = radminPanelHref(item.href);
    if (href === "/radmin/panel") continue;
    if (
      needle &&
      !`${item.title} ${href}`.toLocaleLowerCase("az-AZ").includes(needle)
    )
      continue;
    const segment = href.split(/[/?#]/)[2];
    const group =
      groups.find((section) => section.paths.includes(segment)) ??
      groups[groups.length - 1];
    group.items.push({ ...item, href });
  }
  return groups.filter((group) => group.items.length);
}

export function activeRadminItem(items: DashboardNavItem[], pathname: string) {
  const path = radminPanelHref(pathname).split(/[?#]/)[0].replace(/\/$/, "");
  return items
    .filter((item) => {
      const href = radminPanelHref(item.href)
        .split(/[?#]/)[0]
        .replace(/\/$/, "");
      return path === href || path.startsWith(`${href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];
}
