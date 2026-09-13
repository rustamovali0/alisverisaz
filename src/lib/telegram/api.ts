import { serverEnv } from "@/lib/config/env.server";

type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

function getTelegramUrl(method: string) {
  const token = serverEnv.telegramBotToken;

  if (!token) {
    return null;
  }

  return `https://api.telegram.org/bot${token}/${method}`;
}

async function postTelegram(method: string, body: Record<string, unknown>) {
  const url = getTelegramUrl(method);

  if (!url) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestTelegram<T>(method: string, body: Record<string, unknown>) {
  const url = getTelegramUrl(method);

  if (!url) {
    throw new Error("Telegram bot token ayarı tamamlanmayıb.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; result?: T; description?: string }
      | null;

    if (!response.ok || !payload?.ok || !payload.result) {
      throw new Error(payload?.description ?? "Telegram sorğusu alınmadı.");
    }

    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(input: {
  chatId?: string | number | null;
  text: string;
  replyMarkup?: {
    inline_keyboard: InlineKeyboardButton[][];
  };
}) {
  const chatId = input.chatId ?? serverEnv.telegramAdminChatId;

  if (!chatId || !serverEnv.telegramBotToken) {
    return false;
  }

  return postTelegram("sendMessage", {
    chat_id: chatId,
    text: input.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {}),
  });
}

export async function editTelegramMessage(input: {
  chatId: string | number;
  messageId: number;
  text: string;
}) {
  return postTelegram("editMessageText", {
    chat_id: input.chatId,
    message_id: input.messageId,
    text: input.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export async function answerTelegramCallback(input: {
  callbackQueryId: string;
  text?: string;
}) {
  return postTelegram("answerCallbackQuery", {
    callback_query_id: input.callbackQueryId,
    ...(input.text ? { text: input.text } : {}),
  });
}

export async function deleteTelegramMessage(input: {
  chatId: string | number;
  messageId: number;
}) {
  return postTelegram("deleteMessage", {
    chat_id: input.chatId,
    message_id: input.messageId,
  });
}

export async function setTelegramCommandMenu(commands: Array<{
  command: string;
  description: string;
}>) {
  return postTelegram("setMyCommands", {
    commands,
    scope: {
      type: "chat",
      chat_id: serverEnv.telegramAdminChatId,
    },
  });
}

export async function getTelegramFile(fileId: string) {
  return requestTelegram<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  }>("getFile", {
    file_id: fileId,
  });
}

export async function downloadTelegramFile(filePath: string) {
  const token = serverEnv.telegramBotToken;

  if (!token) {
    throw new Error("Telegram bot token ayarı tamamlanmayıb.");
  }

  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${encodedPath}`);

  if (!response.ok) {
    throw new Error("Telegram şəkli endirilə bilmədi.");
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}
