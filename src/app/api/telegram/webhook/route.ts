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

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: unknown;

  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isTelegramUpdate(update)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await handleTelegramAdminUpdate(update);

  return NextResponse.json({ ok: true });
}
