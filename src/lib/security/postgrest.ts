/**
 * A literal contains-pattern for PostgREST's raw or grammar. Supabase encodes
 * the URL; escaping here is for the PostgREST quoted value and SQL LIKE layers.
 * https://docs.postgrest.org/en/stable/references/api/url_grammar.html
 */
export function literalContains(value: string) {
  const pattern = "%" + value.replace(/[\\%_]/g, "\\$&") + "%";
  return '"' + pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

export function validatedCursorDate(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return null;
  // Preserve PostgreSQL microseconds so pagination does not skip tied rows.
  return value;
}
