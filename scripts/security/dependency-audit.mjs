import { spawnSync } from "node:child_process";

// Temporary exact-advisory exception, NOT an audit fix. Major minimatch 11 is
// incompatible with the legacy CJS glob callers; do not force it with overrides.
const frontend = process.argv.includes("--frontend");
const packages = new Set(
  frontend
    ? [
        "@eslint-community/eslint-utils",
        "@eslint/config-array",
        "@eslint/eslintrc",
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
        "@typescript-eslint/type-utils",
        "@typescript-eslint/typescript-estree",
        "@typescript-eslint/utils",
        "eslint",
        "minimatch",
        "typescript-eslint",
      ]
    : [
        "archiver",
        "archiver-utils",
        "exceljs",
        "glob",
        "minimatch",
        "readdir-glob",
        "rimraf",
        "zip-stream",
      ],
);
const advisory = "https://github.com/advisories/GHSA-g3hv-75wg-m249";
const expires = "2026-12-02";
const run = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  cwd: frontend ? "frontend" : ".",
});
let audit;
try {
  audit = JSON.parse(run.stdout);
} catch {
  throw Error("Dependency audit unavailable");
}
if (
  ![0, 1].includes(run.status) ||
  audit.error ||
  !audit.metadata ||
  !audit.vulnerabilities
)
  throw Error("Dependency audit incomplete");
const failures = [];
for (const [name, value] of Object.entries(audit.vulnerabilities)) {
  if (
    value.severity !== "moderate" ||
    !packages.has(name) ||
    value.via.some((item) =>
      typeof item === "object" ? item.url !== advisory : !packages.has(item),
    ) ||
    Date.now() > Date.parse(expires + "T00:00:00Z")
  )
    failures.push({ name, severity: value.severity });
}
console.log(
  JSON.stringify(
    {
      scope: frontend ? "legacy frontend" : "native app",
      metadata: audit.metadata.vulnerabilities,
      temporaryException: advisory,
      expires,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
