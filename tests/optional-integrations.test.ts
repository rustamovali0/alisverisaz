import { afterEach, expect, it, vi } from "vitest";
import { serverEnv } from "@/lib/config/env.server";
import { sendTelegramMessage } from "@/lib/telegram/api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([undefined, "", "[SENSITIVE]"])("disables missing or unexported integration credentials: %s", async (value) => {
  for (const name of [
    "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD",
    "TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_CHAT_ID", "TELEGRAM_CHAT_ID", "TELEGRAM_ADMIN_USER_ID",
  ]) vi.stubEnv(name, value);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(serverEnv.hasSmtpConfig).toBe(false);
  expect(serverEnv.hasTelegramConfig).toBe(false);
  expect(await sendTelegramMessage({ text: "Test notification" })).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
