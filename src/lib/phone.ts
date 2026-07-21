export function formatAzerbaijanPhoneLocal(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("994")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 9);

  return [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeAzerbaijanPhone(value: string) {
  const local = formatAzerbaijanPhoneLocal(value);

  return local ? `+994 ${local}` : "";
}
