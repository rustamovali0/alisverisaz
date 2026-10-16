/** Update a search without discarding store/category filters or duplicating q. */
export function buildMarketplaceSearchHref(baseHref: string, query: string, resultsAnchorId?: string) {
  const hashIndex = baseHref.indexOf("#");
  const withoutHash = hashIndex < 0 ? baseHref : baseHref.slice(0, hashIndex);
  const hash = resultsAnchorId || (hashIndex < 0 ? "" : baseHref.slice(hashIndex + 1));
  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex < 0 ? withoutHash : withoutHash.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex < 0 ? "" : withoutHash.slice(queryIndex + 1));
  if (query.trim()) params.set("q", query.trim());
  else params.delete("q");
  const search = params.toString();
  return `${path}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}
