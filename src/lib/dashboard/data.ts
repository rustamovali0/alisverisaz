import { createSupabaseServerClient } from "@/lib/supabase/server";

type Filter =
  | {
      column: string;
      value: string | number | boolean | null;
      op?: "eq";
    }
  | {
      column: string;
      value: string[];
      op: "in";
    };

type StoreSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

type ResourceItem = {
  id: string;
  title: string;
  description?: string;
  value?: string;
  href?: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value?: number | string | null, currency = "AZN") {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function applyFilters(query: any, filters: Filter[]) {
  return filters.reduce((current, filter) => {
    if (filter.op === "in") {
      if (filter.value.length === 0) {
        return current.in(filter.column, ["00000000-0000-0000-0000-000000000000"]);
      }

      return current.in(filter.column, filter.value);
    }

    return current.eq(filter.column, filter.value);
  }, query);
}

async function countRows(table: string, filters: Filter[] = []) {
  const supabase = await createSupabaseServerClient();
  const query = applyFilters(
    (supabase as any).from(table).select("id", {
      count: "exact",
      head: true,
    }),
    filters,
  );
  const { count } = await query;

  return count ?? 0;
}

async function getRows<T>(
  table: string,
  columns: string,
  filters: Filter[] = [],
  limit = 6,
) {
  const supabase = await createSupabaseServerClient();
  const query = applyFilters(
    (supabase as any).from(table).select(columns).order("created_at", {
      ascending: false,
    }),
    filters,
  ).limit(limit);
  const { data } = await query;

  return (data ?? []) as T[];
}

export async function getOwnedStores(userId: string) {
  return getRows<StoreSummary>(
    "stores",
    "id,name,slug,status,created_at",
    [
      {
        column: "owner_id",
        value: userId,
      },
    ],
    20,
  );
}

async function getCustomerIds(userId: string) {
  const customers = await getRows<{ id: string }>(
    "customers",
    "id",
    [
      {
        column: "user_id",
        value: userId,
      },
    ],
    100,
  );

  return customers.map((customer) => customer.id);
}

export async function getCustomerOverview(userId: string) {
  const stores = await getOwnedStores(userId);
  const storeIds = stores.map((store) => store.id);
  const customerIds = await getCustomerIds(userId);

  const [listingCount, orderCount, favoriteCount, paymentCount, recentOrders] =
    await Promise.all([
      countRows("products", [{ column: "store_id", value: storeIds, op: "in" }]),
      countRows("orders", [{ column: "user_id", value: userId }]),
      countRows("favorites", [{ column: "user_id", value: userId }]),
      countRows("payments", [
        { column: "customer_id", value: customerIds, op: "in" },
      ]),
      getRows<{
        id: string;
        order_number: string;
        status: string;
        total_amount: string | number;
        currency: string;
        created_at: string;
      }>(
        "orders",
        "id,order_number,status,total_amount,currency,created_at",
        [{ column: "user_id", value: userId }],
      ),
    ]);

  return {
    stats: [
      {
        label: "Elanlarım",
        value: listingCount,
        description: "Sizə bağlı mağazalardakı məhsullar",
      },
      {
        label: "Sifarişlər",
        value: orderCount,
        description: "Hesabınıza bağlı sifarişlər",
      },
      {
        label: "Favorilər",
        value: favoriteCount,
        description: "Seçilmiş məhsullar",
      },
      {
        label: "Ödənişlər",
        value: paymentCount,
        description: "Müştəri hesabınıza bağlı ödənişlər",
      },
    ],
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      title: order.order_number,
      description: order.status,
      value: formatMoney(order.total_amount, order.currency),
    })),
  };
}

export async function getCustomerResource(
  userId: string,
  resource: "listings" | "orders" | "favorites" | "payments",
) {
  if (resource === "listings") {
    const storeIds = (await getOwnedStores(userId)).map((store) => store.id);
    const [total, rows] = await Promise.all([
      countRows("products", [{ column: "store_id", value: storeIds, op: "in" }]),
      getRows<{
        id: string;
        name: string;
        status: string;
        price_amount: string | number;
        currency: string;
        created_at: string;
      }>(
        "products",
        "id,name,status,price_amount,currency,created_at",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.status,
        value: formatMoney(row.price_amount, row.currency),
      })),
    };
  }

  if (resource === "orders") {
    const [total, rows] = await Promise.all([
      countRows("orders", [{ column: "user_id", value: userId }]),
      getRows<{
        id: string;
        order_number: string;
        status: string;
        total_amount: string | number;
        currency: string;
      }>(
        "orders",
        "id,order_number,status,total_amount,currency",
        [{ column: "user_id", value: userId }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.order_number,
        description: row.status,
        value: formatMoney(row.total_amount, row.currency),
      })),
    };
  }

  if (resource === "favorites") {
    const [total, rows] = await Promise.all([
      countRows("favorites", [{ column: "user_id", value: userId }]),
      getRows<{ id: string; product_id: string; created_at: string }>(
        "favorites",
        "id,product_id,created_at",
        [{ column: "user_id", value: userId }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.product_id,
        description: "Favori məhsul",
        value: formatDate(row.created_at),
      })),
    };
  }

  const customerIds = await getCustomerIds(userId);
  const [total, rows] = await Promise.all([
    countRows("payments", [{ column: "customer_id", value: customerIds, op: "in" }]),
    getRows<{
      id: string;
      provider: string;
      status: string;
      amount: string | number;
      currency: string;
    }>(
      "payments",
      "id,provider,status,amount,currency",
      [{ column: "customer_id", value: customerIds, op: "in" }],
    ),
  ]);

  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      title: row.provider,
      description: row.status,
      value: formatMoney(row.amount, row.currency),
    })),
  };
}

export async function getStoreOverview(userId: string) {
  const stores = await getOwnedStores(userId);
  const storeIds = stores.map((store) => store.id);
  const [productCount, orderCount, customerCount, subscriptionCount, recentOrders] =
    await Promise.all([
      countRows("products", [{ column: "store_id", value: storeIds, op: "in" }]),
      countRows("orders", [{ column: "store_id", value: storeIds, op: "in" }]),
      countRows("customers", [{ column: "store_id", value: storeIds, op: "in" }]),
      countRows("subscriptions", [
        { column: "store_id", value: storeIds, op: "in" },
      ]),
      getRows<{
        id: string;
        order_number: string;
        status: string;
        total_amount: string | number;
        currency: string;
      }>(
        "orders",
        "id,order_number,status,total_amount,currency",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

  return {
    stores,
    stats: [
      {
        label: "Məhsullar",
        value: productCount,
        description: "Mağazalarınıza bağlı məhsullar",
      },
      {
        label: "Sifarişlər",
        value: orderCount,
        description: "Mağaza sifarişləri",
      },
      {
        label: "Müştərilər",
        value: customerCount,
        description: "Mağaza müştəriləri",
      },
      {
        label: "Abunəliklər",
        value: subscriptionCount,
        description: "Mağaza abunəlikləri",
      },
    ],
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      title: order.order_number,
      description: order.status,
      value: formatMoney(order.total_amount, order.currency),
    })),
  };
}

export async function getStoreResource(
  userId: string,
  resource:
    | "products"
    | "orders"
    | "customers"
    | "subscriptions"
    | "settings",
) {
  const storeIds = (await getOwnedStores(userId)).map((store) => store.id);

  if (resource === "products") {
    const [total, rows] = await Promise.all([
      countRows("products", [{ column: "store_id", value: storeIds, op: "in" }]),
      getRows<{
        id: string;
        name: string;
        status: string;
        price_amount: string | number;
        currency: string;
      }>(
        "products",
        "id,name,status,price_amount,currency",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.status,
        value: formatMoney(row.price_amount, row.currency),
      })),
    };
  }

  if (resource === "orders") {
    const [total, rows] = await Promise.all([
      countRows("orders", [{ column: "store_id", value: storeIds, op: "in" }]),
      getRows<{
        id: string;
        order_number: string;
        status: string;
        total_amount: string | number;
        currency: string;
      }>(
        "orders",
        "id,order_number,status,total_amount,currency",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.order_number,
        description: row.status,
        value: formatMoney(row.total_amount, row.currency),
      })),
    };
  }

  if (resource === "customers") {
    const [total, rows] = await Promise.all([
      countRows("customers", [{ column: "store_id", value: storeIds, op: "in" }]),
      getRows<{
        id: string;
        email: string | null;
        full_name: string | null;
        phone: string | null;
      }>(
        "customers",
        "id,email,full_name,phone",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.full_name || row.email || row.id,
        description: row.phone || row.email || undefined,
      })),
    };
  }

  if (resource === "subscriptions") {
    const [total, rows] = await Promise.all([
      countRows("subscriptions", [
        { column: "store_id", value: storeIds, op: "in" },
      ]),
      getRows<{
        id: string;
        status: string;
        starts_at: string;
        ends_at: string | null;
      }>(
        "subscriptions",
        "id,status,starts_at,ends_at",
        [{ column: "store_id", value: storeIds, op: "in" }],
      ),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.status,
        description: `Başlanğıc: ${formatDate(row.starts_at)}`,
        value: row.ends_at ? formatDate(row.ends_at) : undefined,
      })),
    };
  }

  const stores = await getOwnedStores(userId);

  return {
    total: stores.length,
    items: stores.map((store) => ({
      id: store.id,
      title: store.name,
      description: store.status,
      value: store.slug,
    })),
  };
}

export async function getStoreAnalytics(userId: string) {
  const storeIds = (await getOwnedStores(userId)).map((store) => store.id);
  const orders = await getRows<{
    id: string;
    status: string;
    total_amount: string | number;
    currency: string;
  }>(
    "orders",
    "id,status,total_amount,currency",
    [{ column: "store_id", value: storeIds, op: "in" }],
    100,
  );
  const revenue = orders.reduce(
    (total, order) => total + Number(order.total_amount ?? 0),
    0,
  );

  return {
    total: orders.length,
    stats: [
      {
        label: "Sifariş sayı",
        value: orders.length,
        description: "Analitika üçün oxunan real sifarişlər",
      },
      {
        label: "Ümumi dövriyyə",
        value: formatMoney(revenue, orders[0]?.currency ?? "AZN"),
        description: "Sifarişlərin toplam məbləği",
      },
    ],
    items: orders.map((order) => ({
      id: order.id,
      title: order.status,
      description: "Sifariş",
      value: formatMoney(order.total_amount, order.currency),
    })),
  };
}

export async function getAdminOverview() {
  const [users, stores, products, orders, subscriptions] = await Promise.all([
    countRows("profiles"),
    countRows("stores"),
    countRows("products"),
    countRows("orders"),
    countRows("subscriptions"),
  ]);

  return {
    stats: [
      {
        label: "İstifadəçilər",
        value: users,
        description: "Platforma profilləri",
      },
      {
        label: "Mağazalar",
        value: stores,
        description: "Bütün mağazalar",
      },
      {
        label: "Məhsullar",
        value: products,
        description: "Bütün məhsullar",
      },
      {
        label: "Sifarişlər",
        value: orders,
        description: "Bütün sifarişlər",
      },
      {
        label: "Abunəliklər",
        value: subscriptions,
        description: "Bütün abunəliklər",
      },
    ],
  };
}

export async function getAdminResource(
  resource:
    | "users"
    | "stores"
    | "products"
    | "orders"
    | "deposits"
    | "payments"
    | "categories"
    | "subscriptions"
    | "settings",
) {
  if (resource === "users") {
    const [total, rows] = await Promise.all([
      countRows("profiles"),
      getRows<{
        id: string;
        email: string | null;
        full_name: string | null;
        role: string;
      }>("profiles", "id,email,full_name,role"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.full_name || row.email || row.id,
        description: row.role,
      })),
    };
  }

  if (resource === "stores" || resource === "settings") {
    const [total, rows] = await Promise.all([
      countRows("stores"),
      getRows<StoreSummary>("stores", "id,name,slug,status,created_at"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.status,
        value: row.slug,
        href: `/radmin/stores/${row.id}`,
      })),
    };
  }

  if (resource === "products") {
    const [total, rows] = await Promise.all([
      countRows("products"),
      getRows<{
        id: string;
        name: string;
        status: string;
        price_amount: string | number;
        currency: string;
      }>("products", "id,name,status,price_amount,currency"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.status,
        value: formatMoney(row.price_amount, row.currency),
      })),
    };
  }

  if (resource === "categories") {
    const [total, rows] = await Promise.all([
      countRows("categories"),
      getRows<{
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
      }>("categories", "id,name,slug,is_active"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.is_active ? "Aktiv" : "Deaktiv",
        value: row.slug,
      })),
    };
  }

  if (resource === "orders") {
    const [total, rows] = await Promise.all([
      countRows("orders"),
      getRows<{
        id: string;
        order_number: string;
        status: string;
        total_amount: string | number;
        currency: string;
      }>("orders", "id,order_number,status,total_amount,currency"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.order_number,
        description: row.status,
        value: formatMoney(row.total_amount, row.currency),
      })),
    };
  }

  if (resource === "deposits") {
    const [total, rows] = await Promise.all([
      countRows("deposits"),
      getRows<{
        id: string;
        status: string;
        amount: string | number;
        currency: string;
        full_name: string | null;
      }>("deposits", "id,status,amount,currency,full_name"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.full_name || row.id,
        description: row.status,
        value: formatMoney(row.amount, row.currency),
      })),
    };
  }

  if (resource === "payments") {
    const [total, rows] = await Promise.all([
      countRows("payments"),
      getRows<{
        id: string;
        status: string;
        amount: string | number;
        currency: string;
        provider: string;
      }>("payments", "id,status,amount,currency,provider"),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        title: row.provider,
        description: row.status,
        value: formatMoney(row.amount, row.currency),
      })),
    };
  }

  const [total, rows] = await Promise.all([
    countRows("subscriptions"),
    getRows<{
      id: string;
      status: string;
      starts_at: string;
      ends_at: string | null;
    }>("subscriptions", "id,status,starts_at,ends_at"),
  ]);

  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      title: row.status,
      description: `Başlanğıc: ${formatDate(row.starts_at)}`,
      value: row.ends_at ? formatDate(row.ends_at) : undefined,
    })),
  };
}

export type { ResourceItem };

export async function getAdminUsers() {
  return getRows<{
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    created_at: string;
  }>("profiles", "id,email,full_name,role,created_at", [], 100);
}
