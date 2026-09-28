export function normalizeNextPath(value: string | null | undefined, fallback = "") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // Browsers normalize backslashes and control characters before resolving URLs.
  // Check decoded forms too, so an intermediate redirect cannot expose an authority.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  let decoded = value.split(/[?#]/, 1)[0];
  for (let depth = 0; depth < 5; depth += 1) {
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
      return fallback;
    }
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return value;
      decoded = next;
    } catch {
      return fallback;
    }
  }

  return fallback;
}
