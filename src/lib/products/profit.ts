export function isProfitTrackingEnabled(settings: unknown): boolean {
  return Boolean(settings && typeof settings === "object" &&
    (settings as Record<string, unknown>).profitTrackingEnabled === true);
}

export function validateProfitPrices(formData: FormData, enabled: boolean): string | null {
  if (!enabled) return null;
  for (const [key, label] of [["costAmount", "Maya dəyəri"], ["priceAmount", "Satış qiyməti"]]) {
    const raw = formData.get(key);
    if (typeof raw !== "string" || !raw.trim() ||
        !Number.isFinite(Number(raw)) || Number(raw) < 0) {
      return `${label} sıfır və ya müsbət məbləğ olmalıdır.`;
    }
  }
  return null;
}
