export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("az-AZ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/\b(?:noutbuk|notbuk|laptop)\b/g, "noutbuk")
    .replace(/\s+/g, " ")
    .trim();
}

export function productSearchRelevance(name: string, normalizedQuery: string) {
  const title = normalizeSearchText(name);
  if (title === normalizedQuery) return 3;
  if (title.startsWith(normalizedQuery)) return 2;
  return title.includes(normalizedQuery) ? 1 : 0;
}
