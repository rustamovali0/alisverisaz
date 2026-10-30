export const helpQuickLinks = [
  { id: "password", href: "/forgot-password" },
  { id: "orders", href: "/dashboard/orders" },
  { id: "seller", href: "/store/dashboard" },
] as const;

export const helpTopicLinks = [
  {
    id: "account",
    href: "/help/articles#giris-qeydiyyat",
    links: ["/register", "/forgot-password", "/help/articles#hesabim"],
  },
  {
    id: "buying",
    href: "/guide/buyer",
    links: [
      "/help/articles/alis-prosesi-sifaris-yaratmaq",
      "/dashboard/orders",
      "/help/articles/alis-prosesi-saticiya-yazmaq",
    ],
  },
  {
    id: "selling",
    href: "/guide/seller",
    links: [
      "/register?role=seller",
      "/help/articles#satici-magazasi",
      "/help/articles#satis-prosesi",
    ],
  },
  {
    id: "products",
    href: "/guide/new-listing",
    links: [
      "/guide/new-listing",
      "/help/articles#mehsullar",
      "/help/articles#kateqoriyalar",
    ],
  },
  {
    id: "security",
    href: "/help/articles#hesab-tehlukesizliyi",
    links: ["/help/articles#hesab-tehlukesizliyi", "/privacy", "/contact"],
  },
  {
    id: "messages",
    href: "/help/articles#chat-sistemi",
    links: [
      "/help/articles#chat-sistemi",
      "/help/articles#bildirisler",
      "/contact",
    ],
  },
] as const;
