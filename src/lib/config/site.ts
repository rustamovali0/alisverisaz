import { clientEnv } from "@/lib/config/env.client";

export const siteConfig = {
  name: "alisveris.az",
  description: "Marketplace SaaS platformasi",
  url: clientEnv.appUrl,
} as const;
