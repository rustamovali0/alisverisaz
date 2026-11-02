import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
export function secretKinds(text) {
  const result = [];
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]{40,}?-----END/.test(
      text,
    )
  )
    result.push("private-key");
  if (/\bsb_secret_[A-Za-z0-9_-]{24,}\b/.test(text))
    result.push("supabase-secret");
  if (
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/.test(text)
  )
    result.push("github-token");
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(text)) result.push("aws-access-key");
  for (const match of text.matchAll(
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{15,}/g,
  )) {
    try {
      if (
        JSON.parse(Buffer.from(match[0].split(".")[1], "base64url")).role ===
        "service_role"
      )
        result.push("supabase-service-jwt");
    } catch {}
  }
  return [...new Set(result)];
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const findings = [];
  for (const file of execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const buffer = fs.readFileSync(file);
    if (buffer.includes(0)) continue; // Binary assets, never decoded as text.
    for (const kind of secretKinds(buffer.toString("utf8")))
      findings.push({ file, kind });
  }
  console.log(
    JSON.stringify(
      { scanned: "tracked text files (not Git history)", findings },
      null,
      2,
    ),
  );
  if (findings.length) process.exitCode = 1;
}
