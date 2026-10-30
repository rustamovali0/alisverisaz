import { build } from "esbuild";
await build({entryPoints:["scripts/email-worker.mjs"],bundle:true,platform:"node",target:"node22",format:"esm",packages:"external",outfile:"../email-service/worker.mjs"});
