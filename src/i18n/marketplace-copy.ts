import { useTranslations } from "next-intl";
import { marketplaceTranslationKeys } from "./marketplace-keys";

/** Translate built-in UI/CMS defaults; leave custom merchant content intact. */
export function useMarketplaceText() {
  const t = useTranslations("marketplaceLive");
  return (source: string, values?: Record<string, string | number>) => {
    const key = marketplaceTranslationKeys[source.trim()];
    return key ? t(key, values) : source;
  };
}
