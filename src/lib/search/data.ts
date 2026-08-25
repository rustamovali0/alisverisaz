import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_SEARCH_TERM_LENGTH = 120;

export type PopularSearchTerm = {
  term: string;
  count: number;
  lastSearchedAt: string;
};

export type SearchAdministrationData = {
  automaticTerms: PopularSearchTerm[];
  overrides: string[];
};

export function normalizeMarketplaceSearchTerm(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}

function readOverrides(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map(normalizeMarketplaceSearchTerm)
    .filter((term) => {
      const key = term.toLocaleLowerCase("az-AZ");

      if (term.length < 2 || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

async function getAutomaticTerms(limit = 4): Promise<PopularSearchTerm[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("marketplace_search_terms")
    .select("term,search_count,last_searched_at")
    .order("search_count", { ascending: false })
    .order("last_searched_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 20));

  if (error) {
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    term: normalizeMarketplaceSearchTerm(row.term),
    count: Number(row.search_count ?? 0),
    lastSearchedAt: String(row.last_searched_at ?? ""),
  })).filter((item) => item.term.length >= 2);
}

async function getSiteSearchOverrides() {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  const value = data?.value;
  return readOverrides(
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).popular_search_overrides
      : [],
  );
}

export async function getPopularMarketplaceSearches() {
  const [overrides, automaticTerms] = await Promise.all([
    getSiteSearchOverrides(),
    getAutomaticTerms(4),
  ]);

  const seen = new Set<string>();

  return [...overrides, ...automaticTerms.map((item) => item.term)].filter((term) => {
    const key = term.toLocaleLowerCase("az-AZ");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).slice(0, 4);
}

export async function getSearchAdministrationData(): Promise<SearchAdministrationData> {
  const [overrides, automaticTerms] = await Promise.all([
    getSiteSearchOverrides(),
    getAutomaticTerms(20),
  ]);

  return { overrides, automaticTerms };
}
