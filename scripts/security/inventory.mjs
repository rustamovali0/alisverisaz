import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
const actions = [];
for (const file of files("src/lib").filter((f) => f.endsWith(".ts"))) {
  const text = fs.readFileSync(file, "utf8");
  if (!/^['"]use server['"]/.test(text)) continue;
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  for (const node of ast.statements) {
    if (
      !ts.isFunctionDeclaration(node) ||
      !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue;
    const body = node.body?.getText(ast) || "";
    actions.push({
      file,
      line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      name: node.name?.text,
      guard: /requireRole|requireRadmin/.test(body)
        ? "explicit-role"
        : /getCurrentUserProfile|requireUser|\.auth\.getUser|client\(\)/.test(
              body,
            )
          ? "session-or-delegated"
          : "delegated-review",
      rate: /RateLimit|rateLimit/.test(body),
    });
  }
}
const routes = files("src/app").filter((f) => f.endsWith("/route.ts"));
console.log(
  JSON.stringify(
    {
      routes,
      actions,
      note: "Static indicators only: delegated-review is not a vulnerability finding.",
    },
    null,
    2,
  ),
);
