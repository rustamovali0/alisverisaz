export const storePolicyFields = [
  { key: "deliveryPolicy", label: "Çatdırılma" },
  { key: "returnPolicy", label: "Qaytarma" },
  { key: "warrantyPolicy", label: "Zəmanət" },
] as const;

export const storePolicyMaxLength = 1200;
export type StorePolicyKey = (typeof storePolicyFields)[number]["key"];
export type StorePolicies = Partial<Record<StorePolicyKey, string>>;

export function readStorePolicies(
  settings?: Record<string, unknown> | null,
): StorePolicies {
  const policies: StorePolicies = {};
  for (const { key } of storePolicyFields) {
    const value = settings?.[key];
    if (typeof value === "string" && value.trim()) {
      policies[key] = value.trim().slice(0, storePolicyMaxLength);
    }
  }
  return policies;
}
