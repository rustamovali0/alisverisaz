import { describe, expect, it } from "vitest";
import az from "../messages/az.json";
import en from "../messages/en.json";
import ru from "../messages/ru.json";
import { marketplaceTranslationKeys } from "../src/i18n/marketplace-keys";

describe("marketplace UI translation coverage", () => {
  it("provides matching nonempty messages for AZ, EN and RU", () => {
    const expected = Object.values(marketplaceTranslationKeys).sort();
    for (const dictionary of [
      az.marketplaceLive,
      en.marketplaceLive,
      ru.marketplaceLive,
    ]) {
      expect(Object.keys(dictionary).sort()).toEqual(expected);
      for (const value of Object.values(dictionary))
        expect(value.trim()).not.toBe("");
    }
  });
  it.each([
    "Ana səhifə",
    "Bütün kateqoriyalar",
    "Hər ehtiyacına",
    "Mağazanı aç",
    "Kateqoriyalar",
    "İstifadəçi razılaşması",
  ])("translates the visible default %s", (source) => {
    const key = marketplaceTranslationKeys[
      source
    ] as keyof typeof az.marketplaceLive;
    expect(key).toBeDefined();
    expect(en.marketplaceLive[key]).not.toBe(az.marketplaceLive[key]);
    expect(ru.marketplaceLive[key]).not.toBe(az.marketplaceLive[key]);
  });
  it("keeps interpolation placeholders consistent across languages", () => {
    for (const key of Object.keys(
      az.marketplaceLive,
    ) as (keyof typeof az.marketplaceLive)[]) {
      const placeholders = (value: string) =>
        (value.match(/\{\w+\}/g) ?? []).sort();
      expect(placeholders(en.marketplaceLive[key])).toEqual(
        placeholders(az.marketplaceLive[key]),
      );
      expect(placeholders(ru.marketplaceLive[key])).toEqual(
        placeholders(az.marketplaceLive[key]),
      );
    }
  });
  it("does not assign a translation key to custom merchant content", () => {
    expect(
      marketplaceTranslationKeys["Custom merchant product name"],
    ).toBeUndefined();
  });
});
