export type AnalyticsRange =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "all";

export const analyticsRangeOptions: Array<{
  value: AnalyticsRange;
  label: string;
}> = [
  { value: "today", label: "Bu gün" },
  { value: "yesterday", label: "Dünən" },
  { value: "7d", label: "Son 7 gün" },
  { value: "30d", label: "Son 30 gün" },
  { value: "90d", label: "Son 90 gün" },
  { value: "this_month", label: "Bu ay" },
  { value: "last_month", label: "Keçən ay" },
  { value: "all", label: "Hamısı" },
];

export function parseAnalyticsRange(value?: string | string[] | null): AnalyticsRange {
  const raw = Array.isArray(value) ? value[0] : value;

  return analyticsRangeOptions.some((option) => option.value === raw)
    ? (raw as AnalyticsRange)
    : "30d";
}

export function getAnalyticsRangeDates(range: AnalyticsRange) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "all") {
    return {};
  }

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (range === "yesterday") {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (range === "this_month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (range === "last_month") {
    start.setMonth(start.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return { from: start.toISOString(), to: end.toISOString() };
}
