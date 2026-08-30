import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActivityEventType } from "@/lib/activity/events";

type ActivityRow = {
  id: string;
  event_type: ActivityEventType | string;
  actor_id: string | null;
  store_id: string | null;
  product_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ActivityGroup = {
  id: string;
  title: string;
  description?: string;
  count: number;
};

export type ActivityTimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export type AdminUserActivityFilters = {
  userId?: string;
  role?: string;
  device?: string;
  query?: string;
  from?: string;
  to?: string;
  page?: string | number;
};

export type AdminUserActivityUser = {
  id: string;
  label: string;
  email: string | null;
  role: string;
  phone: string | null;
  activityCount: number;
};

export type AdminUserActivityLogItem = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  userLabel: string;
  userRole: string;
  device: string;
  deviceType: string;
  ipAddress: string;
  createdAt: string;
};

const USER_ACTIVITY_PAGE_SIZE = 50;

function readMetaText(
  metadata: Record<string, unknown> | null,
  key: string,
  fallback = "",
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function groupRows(
  rows: ActivityRow[],
  type: ActivityEventType,
  idKey: "product_id" | "store_id",
  titleMetaKey: string,
  fallback: string,
) {
  const grouped = new Map<string, ActivityGroup>();

  rows
    .filter((row) => row.event_type === type)
    .forEach((row) => {
      const id = row[idKey] ?? readMetaText(row.metadata, titleMetaKey, fallback);
      const current = grouped.get(id);

      if (current) {
        current.count += 1;
        return;
      }

      grouped.set(id, {
        id,
        title: readMetaText(row.metadata, titleMetaKey, fallback),
        description: row.created_at
          ? `Son klik: ${new Intl.DateTimeFormat("az-AZ", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.created_at))}`
          : undefined,
        count: 1,
      });
    });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

async function countRows(table: string) {
  const supabase = createSupabaseAdminClient();
  const { count } = await (supabase as any)
    .from(table)
    .select("id", {
      count: "exact",
      head: true,
    });

  return count ?? 0;
}

export async function getAdminActivityOverview() {
  const supabase = createSupabaseAdminClient();
  const [{ data }, profileCount, orderCount, messageCount, reviewCount] =
    await Promise.all([
      (supabase as any)
        .from("activity_events")
        .select("id,event_type,actor_id,store_id,product_id,metadata,created_at")
        .order("created_at", {
          ascending: false,
        })
        .limit(1000),
      countRows("profiles"),
      countRows("orders"),
      countRows("product_messages"),
      countRows("reviews"),
    ]);

  const rows = ((data ?? []) as ActivityRow[]).map((row) => ({
    ...row,
    metadata: row.metadata ?? {},
  }));
  const countByType = (type: ActivityEventType) =>
    rows.filter((row) => row.event_type === type).length;

  const productClicks = groupRows(
    rows,
    "product_view",
    "product_id",
    "product_name",
    "Məhsul",
  );
  const storeClicks = groupRows(
    rows,
    "store_view",
    "store_id",
    "store_name",
    "Mağaza",
  );

  const timeline: ActivityTimelineItem[] = rows.slice(0, 30).map((row) => ({
    id: row.id,
    title: readMetaText(row.metadata, "title", row.event_type),
    description:
      readMetaText(row.metadata, "description") ||
      [
        readMetaText(row.metadata, "store_name"),
        readMetaText(row.metadata, "product_name"),
        readMetaText(row.metadata, "email"),
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Fəaliyyət qeydə alındı",
    createdAt: row.created_at,
  }));

  return {
    stats: [
      {
        label: "Məhsul klikləri",
        value: countByType("product_view"),
        description: "Məhsul detal səhifələrinə giriş",
        href: "/radmin/products",
      },
      {
        label: "Mağaza klikləri",
        value: countByType("store_view"),
        description: "Mağaza səhifələrinə giriş",
        href: "/radmin/stores",
      },
      {
        label: "İstifadəçilər",
        value: profileCount,
        description: "profiles cədvəlində real say",
        href: "/radmin/users",
      },
      {
        label: "Sifarişlər",
        value: orderCount,
        description: "orders cədvəlində real say",
        href: "/radmin/orders",
      },
      {
        label: "Mesajlar",
        value: messageCount,
        description: "Məhsul chat mesajları",
        href: "/radmin/messages",
      },
      {
        label: "Rəylər",
        value: reviewCount,
        description: "5 ulduz məhsul rəyləri",
        href: "/radmin/reviews",
      },
      {
        label: "Login",
        value: countByType("user_login"),
        description: "Qeydə alınmış girişlər",
        href: "/radmin/activity",
      },
      {
        label: "Logout",
        value: countByType("user_logout"),
        description: "Qeydə alınmış çıxışlar",
        href: "/radmin/activity",
      },
    ],
    productClicks,
    storeClicks,
    authEvents: {
      registrations: countByType("user_register"),
      logins: countByType("user_login"),
      logouts: countByType("user_logout"),
    },
    commerceEvents: {
      ordersCreated: countByType("order_created"),
      ordersTotal: orderCount,
      messagesCreated: countByType("message_created"),
    },
    timeline,
  };
}

function normalizeRole(value?: string) {
  return value === "seller" || value === "customer" || value === "admin" ? value : "";
}

function normalizeDevice(value?: string) {
  return value === "desktop" || value === "mobile" || value === "tablet" || value === "unknown" ? value : "";
}

function normalizePage(value?: string | number) {
  const page = typeof value === "number" ? value : Number(value ?? 1);

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function readMeta(metadata: Record<string, unknown> | null, key: string, fallback = "") {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getAdminUserActivityLog(filters: AdminUserActivityFilters) {
  const supabase = createSupabaseAdminClient();
  const role = normalizeRole(filters.role);
  const device = normalizeDevice(filters.device);
  const query = filters.query?.trim() ?? "";
  const page = normalizePage(filters.page);
  const pageSize = USER_ACTIVITY_PAGE_SIZE;
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  let profileQuery = (supabase as any)
    .from("profiles")
    .select("id,email,full_name,phone,role,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (role) {
    profileQuery = profileQuery.eq("role", role);
  } else {
    profileQuery = profileQuery.in("role", ["customer", "seller", "admin"]);
  }

  if (query) {
    const safeQuery = query.replace(/[^a-zA-Z0-9@\s.+_-]/g, "").trim();
    profileQuery = profileQuery.or(
      `email.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`,
    );
  }

  const { data: profileRows } = await profileQuery;
  const profiles = ((profileRows ?? []) as any[]).map((profile) => ({
    id: profile.id as string,
    label: (profile.full_name || profile.email || profile.id) as string,
    email: (profile.email ?? null) as string | null,
    phone: (profile.phone ?? null) as string | null,
    role: (profile.role ?? "customer") as string,
  }));
  const profileIds = profiles.map((profile) => profile.id);
  const selectedUserId =
    filters.userId && profileIds.includes(filters.userId) ? filters.userId : undefined;
  const actorIds = selectedUserId ? [selectedUserId] : profileIds;

  if (actorIds.length === 0) {
    return {
      users: [],
      logs: [],
      selectedUser: null,
      filters: {
        role,
        device,
        query,
        from: filters.from ?? "",
        to: filters.to ?? "",
        page,
      },
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        hasPrevious: false,
        hasNext: false,
      },
    };
  }

  let activityQuery = (supabase as any)
    .from("activity_events")
    .select("id,event_type,actor_id,store_id,product_id,metadata,created_at", { count: "exact" })
    .in("actor_id", actorIds)
    .order("created_at", { ascending: false });

  if (filters.from) {
    activityQuery = activityQuery.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    activityQuery = activityQuery.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  if (device) {
    activityQuery = activityQuery.eq("metadata->>device_type", device);
  }

  const { data: activityRows, count: totalCount } = await activityQuery.range(rangeStart, rangeEnd);
  const rows = ((activityRows ?? []) as ActivityRow[]).map((row) => ({
    ...row,
    metadata: row.metadata ?? {},
  }));
  const rowsByActor = rows.reduce((map, row) => {
    if (row.actor_id) {
      map.set(row.actor_id, (map.get(row.actor_id) ?? 0) + 1);
    }

    return map;
  }, new Map<string, number>());
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const users = profiles
    .map((profile) => ({
      ...profile,
      activityCount: rowsByActor.get(profile.id) ?? 0,
    }))
    .sort((left, right) => right.activityCount - left.activityCount);
  const logs = rows.map((row) => {
    const profile = row.actor_id ? profileById.get(row.actor_id) : null;
    const title = readMeta(row.metadata, "title", row.event_type);
    const description =
      readMeta(row.metadata, "description") ||
      [
        readMeta(row.metadata, "store_name"),
        readMeta(row.metadata, "product_name"),
        readMeta(row.metadata, "email"),
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Fəaliyyət qeydə alındı";

    return {
      id: row.id,
      eventType: row.event_type,
      title,
      description,
      userLabel: profile?.label ?? "Naməlum istifadəçi",
      userRole: profile?.role ?? "-",
      device: readMeta(row.metadata, "device", "Naməlum"),
      deviceType: readMeta(row.metadata, "device_type", "unknown"),
      ipAddress: readMeta(row.metadata, "ip_address", "-"),
      createdAt: row.created_at,
    };
  });
  const total = totalCount ?? logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    users,
    logs,
    selectedUser: selectedUserId
      ? users.find((user) => user.id === selectedUserId) ?? null
      : null,
    filters: {
      role,
      device,
      query,
      from: filters.from ?? "",
      to: filters.to ?? "",
      page,
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  };
}
