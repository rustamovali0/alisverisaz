import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["az"],
  defaultLocale: "az",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
