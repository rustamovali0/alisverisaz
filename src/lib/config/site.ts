import { clientEnv } from "@/lib/config/env.client";

export const siteConfig = {
  name: "Alışveriş",
  defaultTitle: "Alisveris.az | Alışveriş.az - Azərbaycanın Onlayn Marketplace-i",
  description:
    "Alisveris.az və Alışveriş.az Azərbaycanda mağazalar, məhsullar və sərfəli online alış-veriş üçün marketplace platformasıdır.",
  url: (process.env.NEXT_PUBLIC_CANONICAL_URL ?? clientEnv.appUrl).replace(/\/+$/, ""),
} as const;
