export function formatAznPrice(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const [whole = "0", fraction = "00"] = safeValue.toFixed(2).split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${groupedWhole},${fraction}\u00a0₼`;
}

export function formatAznDiscountedPrice(value: number, discount = 0) {
  return formatAznPrice(value - discount);
}
