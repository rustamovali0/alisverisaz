import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const tables = new Set();
const functions = new Set();
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.[cm]?[jt]sx?$/.test(file)) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name.text;
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument)) {
            if (method === "from" && !node.expression.expression.getText(source).includes("storage")) tables.add(argument.text);
            if (method === "rpc") functions.add(argument.text);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
scan("src");
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const columns = [
  ["profiles", "requested_role"], ["profiles", "seller_application_status"],
  ["profiles", "session_revoked_at"], ["store_panel_settings", "updated_by"],
  ["stores", "settings"], ["stores", "slug"], ["stores", "logo_url"], ["stores", "banner_url"],
];
const sql = `-- Read-only. Run in Supabase SQL Editor. Only missing objects are returned.
-- This checks literal table/RPC references and the known problem columns, not every column or RLS policy.
with required_tables(name) as (values
${[...tables].sort().map((name) => `  (${quote(name)})`).join(",\n")}
), required_functions(name) as (values
${[...functions].sort().map((name) => `  (${quote(name)})`).join(",\n")}
), required_columns(table_name, column_name) as (values
${columns.map(([table, column]) => `  (${quote(table)}, ${quote(column)})`).join(",\n")}
)
select 'table' as kind, name as missing_object from required_tables
where to_regclass('public.' || name) is null
union all
select 'function', name from required_functions r
where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = r.name)
union all
select 'column', r.table_name || '.' || r.column_name from required_columns r
where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = r.table_name and c.column_name = r.column_name)
order by kind, missing_object;
`;
fs.mkdirSync("supabase/diagnostics", { recursive: true });
fs.writeFileSync("supabase/diagnostics/20261006_required_schema.sql", sql);
console.log(`Schema diagnostic generated: ${tables.size} tables, ${functions.size} RPCs, ${columns.length} key columns.`);
