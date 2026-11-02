import { readBoundedJson } from "@/lib/http/read-json";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env.server";
import {
  handleTelegramAdminUpdate,
  isTelegramUpdate,
} from "@/lib/telegram/admin-bot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = serverEnv.telegramWebhookSecret;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || !receivedSecret || Buffer.byteLength(receivedSecret) !== Buffer.byteLength(expectedSecret) || !timingSafeEqual(Buffer.from(receivedSecret), Buffer.from(expectedSecret))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: unknown;

  try {
    update = await readBoundedJson(request, 64 * 1024);
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof RangeError ? 413 : 400 });
  }

  if (!isTelegramUpdate(update)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await handleTelegramAdminUpdate(update);

  return NextResponse.json({ ok: true });
}
