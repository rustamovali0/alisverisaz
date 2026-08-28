import { clientEnv } from "@/lib/config/env.client";

export const siteConfig = {
  name: "Alışveriş",
  defaultTitle: "Alisveris.az — Azərbaycanın Onlayn Marketplace-i",
  description:
    "Azərbaycanda mağazalar, məhsullar və sərfəli alış-veriş.",
  url: (process.env.NEXT_PUBLIC_CANONICAL_URL ?? clientEnv.appUrl).replace(/\/+$/, ""),
} as const;
