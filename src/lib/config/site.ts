import { clientEnv } from "@/lib/config/env.client";

export const siteConfig = {
  name: "alisveris.az",
  description:
    "Azərbaycanda məhsul satışı, mağaza idarəetməsi, elan yerləşdirmə və sifarişlər üçün marketplace platforması.",
  url: clientEnv.appUrl,
} as const;
