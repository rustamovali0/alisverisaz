import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@10.2.1";
import { createEmailDispatcher } from "../_shared/delivery.ts";

Deno.serve(createEmailDispatcher(
  (key) => Deno.env.get(key) || "",
  createClient,
  nodemailer.createTransport,
));
