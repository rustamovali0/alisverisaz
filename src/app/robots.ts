import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/radmin",
        "/radmin/",
        "/admin",
        "/admin/",
        "/seller",
        "/seller/",
        "/dashboard",
        "/dashboard/",
        "/store/dashboard",
        "/store/dashboard/",
        "/api/private",
        "/api/private/",
        "/api/telegram",
        "/api/webhooks",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
