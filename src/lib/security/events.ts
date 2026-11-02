import "server-only";
// Deliberately no arbitrary metadata/message argument: URLs, tokens, email and
// payloads must never accidentally enter security logs.
export function securityEvent(
  event:
    | "analytics_failed"
    | "login_failed"
    | "rate_limit"
    | "security_storage_unavailable"
    | "captcha_rejected"
    | "access_denied"
    | "upload_rejected"
    | "csp_violation",
  scope: string,
  status: number,
) {
  console.warn(
    JSON.stringify({
      type: "security",
      event,
      scope: scope.replace(/[^a-z0-9_:-]/gi, "").slice(0, 64),
      status,
      at: new Date().toISOString(),
    }),
  );
}
