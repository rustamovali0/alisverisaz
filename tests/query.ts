import { vi } from "vitest";

export function query(result: { data?: unknown; error?: unknown; count?: number } = {}) {
  const value: Record<string, any> = {};
  for (const method of ["select", "eq", "in", "is", "ilike", "limit", "order", "returns", "maybeSingle", "single", "update", "insert", "upsert", "delete"]) {
    value[method] = vi.fn(() => value);
  }
  value.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
  return value;
}
