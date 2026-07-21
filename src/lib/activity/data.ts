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
      },
      {
        label: "Mağaza klikləri",
        value: countByType("store_view"),
        description: "Mağaza səhifələrinə giriş",
      },
      {
        label: "İstifadəçilər",
        value: profileCount,
        description: "profiles cədvəlində real say",
      },
      {
        label: "Sifarişlər",
        value: orderCount,
        description: "orders cədvəlində real say",
      },
      {
        label: "Mesajlar",
        value: messageCount,
        description: "Məhsul chat mesajları",
      },
      {
        label: "Rəylər",
        value: reviewCount,
        description: "5 ulduz məhsul rəyləri",
      },
      {
        label: "Login",
        value: countByType("user_login"),
        description: "Qeydə alınmış girişlər",
      },
      {
        label: "Logout",
        value: countByType("user_logout"),
        description: "Qeydə alınmış çıxışlar",
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
