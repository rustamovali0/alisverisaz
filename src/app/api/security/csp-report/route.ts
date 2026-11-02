import { readBoundedJson } from "@/lib/http/read-json";
import { apiRateLimit } from "@/lib/security/api";
import { securityEvent } from "@/lib/security/events";
export async function POST(request: Request) {
  const limited = await apiRateLimit("csp_report", 30);
  if (limited) return limited;
  if (
    !/^application\/(csp-report|json)(;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    return new Response(null, { status: 415 });
  try {
    const data = (await readBoundedJson(request, 4096)) as {
      "csp-report"?: { "effective-directive"?: unknown };
    };
    const directive = data?.["csp-report"]?.["effective-directive"];
    if (typeof directive !== "string" || !/^[-a-z]{1,40}$/.test(directive))
      return new Response(null, { status: 400 });
    // Never log document-uri, blocked-uri, script-sample or arbitrary JSON.
    securityEvent("csp_violation", directive, 204);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return new Response(null, {
      status: error instanceof RangeError ? 413 : 400,
    });
  }
}
