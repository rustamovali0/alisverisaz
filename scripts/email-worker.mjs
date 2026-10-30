// Self-hosted Supabase adapter. No HTTP listener and no browser credential access.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { createEmailDispatcher } from "../supabase/functions/_shared/delivery.ts";

const file=process.env.EMAIL_WORKER_CONFIG || "/srv/alisveris/email-service/config.json";
const config=JSON.parse(fs.readFileSync(file,"utf8"));
const handler=createEmailDispatcher(key=>String(config[key] || ""),createClient,nodemailer.createTransport);
const response=await handler(new Request("http://127.0.0.1/email-dispatch",{
  method:"POST",headers:{authorization:`Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
    "x-email-dispatch-secret":config.EMAIL_DISPATCH_SECRET || ""},
}));
const result=await response.json();
if(!response.ok || result.processed) console.log(JSON.stringify({at:new Date().toISOString(),status:response.status,...result}));
if(!response.ok) process.exitCode=1;
