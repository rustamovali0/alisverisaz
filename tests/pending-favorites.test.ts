import { afterEach, expect, it, vi } from "vitest";
import {
  readPendingFavorites,
  savePendingFavorite,
} from "@/lib/catalog/pending-favorites";
afterEach(() => vi.unstubAllGlobals());
it("preserves guest intent, deduplicates it and removes only successfully merged entries", () => {
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  });
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002";
  savePendingFavorite(a, true);
  savePendingFavorite(b, true);
  savePendingFavorite(a, true);
  savePendingFavorite("invalid", true);
  expect(readPendingFavorites()).toEqual([b, a]);
  savePendingFavorite(b, false);
  expect(readPendingFavorites()).toEqual([a]);
});
it("tolerates blocked or corrupted local storage", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "{",
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(readPendingFavorites()).toEqual([]);
  expect(() =>
    savePendingFavorite("00000000-0000-4000-8000-000000000001", true),
  ).not.toThrow();
});
