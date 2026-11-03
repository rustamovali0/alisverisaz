export function adminSearchText(value: string) {
  return value
    .toLocaleLowerCase("az-AZ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .trim();
}
export function matchesAdminSearch(
  query: string,
  values: Array<string | null | undefined>,
) {
  const words = adminSearchText(query).split(/\s+/).filter(Boolean);
  const text = adminSearchText(values.filter(Boolean).join(" "));
  return words.every((word) => text.includes(word));
}
