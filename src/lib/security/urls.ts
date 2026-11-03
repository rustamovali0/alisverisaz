/** Browser-facing destinations only. This is not an SSRF allowlist for server fetches. */
export function safeLinkHref(
  value: unknown,
  options: { allowContact?: boolean } = {},
): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029\\]/u.test(value)
  )
    return "";
  const text = value.trim();
  if (!text) return "";
  if (text.startsWith("#")) return text;
  try {
    if (text.startsWith("/") && !text.startsWith("//")) {
      const url = new URL(text, "https://link.invalid");
      return url.origin === "https://link.invalid"
        ? `${url.pathname}${url.search}${url.hash}`
        : "";
    }
    const url = new URL(text);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return url.href;
    if (
      options.allowContact &&
      /^mailto:[a-z0-9._+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(text)
    )
      return text;
    if (options.allowContact && /^tel:\+?[\d ()-]{5,30}$/i.test(text))
      return text;
  } catch {
    /* Reject malformed or unsupported destinations. */
  }
  return "";
}

export function socialProfileHref(
  kind: "instagram" | "tiktok" | "whatsapp",
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    /[\u0000-\u001f\u007f-\u009f\\]/u.test(value)
  )
    return "";
  const text = value.trim();
  if (!text || text.length > 2048) return "";
  if (/^https?:\/\//i.test(text)) return safeLinkHref(text);
  if (/^(?:www\.)?(?:instagram\.com|tiktok\.com|wa\.me)\//i.test(text))
    return safeLinkHref(`https://${text}`);
  if (kind === "whatsapp") {
    if (!/^\+?[\d ()-]{7,25}$/.test(text)) return "";
    return `https://wa.me/${text.replace(/\D/g, "")}`;
  }
  const handle = text.replace(/^@/, "");
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(handle)) return "";
  return kind === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://tiktok.com/@${handle}`;
}
