export function formatAznPrice(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(Math.max(value, 0));
}

export function formatAznDiscountedPrice(value: number, discount = 0) {
  return formatAznPrice(value - discount);
}

