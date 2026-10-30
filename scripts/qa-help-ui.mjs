import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
const root = process.cwd(),
  out = path.resolve(root, "../help-ui-preview");
fs.mkdirSync(out, { recursive: true });
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{HelpCenter}from'./src/components/help/help-center';import{helpQuickLinks,helpTopicLinks}from'./src/lib/help-center/landing-data';createRoot(document.getElementById('root')).render(<HelpCenter locale={new URLSearchParams(location.search).get('lang')||'az'} topics={helpTopicLinks} quickLinks={helpQuickLinks} supportPhone="+994773003383" year={2026}/>);`,
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  outfile: out + "/app.js",
  alias: { "@": root + "/src" },
  plugins: [
    {
      name: "local-navigation",
      setup(b) {
        b.onResolve({ filter: /^@\/i18n\/navigation$/ }, () => ({
          path: "navigation",
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: `import React from'react';export function Link(props){return React.createElement('a',props)}`,
          loader: "js",
          resolveDir: root,
        }));
      },
    },
  ],
});
fs.writeFileSync(
  out + "/index.html",
  '<!doctype html><html lang="az"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kömək mərkəzi — lokal dizayn sınağı</title><link rel="stylesheet" href="app.css"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}a{color:inherit;text-decoration:none}button,input{font:inherit}button{cursor:pointer;border:0;background:transparent}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style><body><div id="root"></div><script type="module" src="app.js"></script></body></html>',
);
console.log(out);
