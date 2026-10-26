import { normalize, type Product } from "./data";
export type Filters = {
  q: string;
  category: string;
  min: string;
  max: string;
  sort: string;
  discount: boolean;
  vip: boolean;
  rental: boolean;
  stock: boolean;
  store: string;
  rating: string;
};
export const defaultFilters: Filters = {
  q: "",
  category: "",
  min: "",
  max: "",
  sort: "recommended",
  discount: false,
  vip: false,
  rental: false,
  stock: false,
  store: "",
  rating: "",
};
export function filterProducts(products: Product[], f: Filters) {
  return products
    .filter(
      (p) =>
        (!f.q ||
          normalize(
            p.name + " " + p.store + " " + p.brand + " " + p.category,
          ).includes(normalize(f.q))) &&
        (!f.category || p.category === f.category) &&
        (!f.min || p.price >= Number(f.min)) &&
        (!f.max || p.price <= Number(f.max)) &&
        (!f.discount || !!p.oldPrice) &&
        (!f.vip || p.vip) &&
        (!f.rental || p.rental) &&
        (!f.stock || p.stock > 0) &&
        (!f.store || p.store === f.store) &&
        (!f.rating || p.rating >= Number(f.rating)),
    )
    .sort((a, b) =>
      f.sort === "price-asc"
        ? a.price - b.price
        : f.sort === "price-desc"
          ? b.price - a.price
          : f.sort === "rating"
            ? b.rating - a.rating
            : f.sort === "newest"
              ? b.id - a.id
              : Number(!!b.vip) - Number(!!a.vip),
    );
}
export const validRange = (min: string, max: string) =>
  (!min || Number(min) >= 0) &&
  (!max || Number(max) >= 0) &&
  (!min || !max || Number(min) <= Number(max));
export function readState<T>(key: string, fallback: T): T {
  try {
    const x = localStorage.getItem("az-" + key);
    return x ? JSON.parse(x) : fallback;
  } catch {
    return fallback;
  }
}
export function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem("az-" + key, JSON.stringify(value));
  } catch {
    /* Browsing remains available without local storage. */
  }
}
