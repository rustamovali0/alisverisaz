const KEY = "alisveris-pending-favorites-v1";
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function readPendingFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string => typeof id === "string" && UUID.test(id),
            ),
          ),
        ].slice(-50)
      : [];
  } catch {
    return [];
  }
}
export function savePendingFavorite(id: string, active: boolean) {
  if (!UUID.test(id)) return;
  try {
    const ids = readPendingFavorites().filter((value) => value !== id);
    if (active) ids.push(id);
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    /* Private browsing can disable storage. */
  }
}
