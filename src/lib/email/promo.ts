import "server-only";

import nodemailer from "nodemailer";

import { serverEnv } from "@/lib/config/env.server";

const SMTP_SEND_TIMEOUT_MS = 15_000;

type PromoEmailInput = {
  to: string;
  storeName: string;
  code: string;
  discountPercent: number;
  endsAt: string | null;
  storeUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("SMTP göndərişi vaxt limitini keçdi.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Müddətsiz";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export async function sendPromoCreatedEmail(input: PromoEmailInput) {
  if (!serverEnv.hasSmtpConfig) {
    throw new Error("SMTP ayarları tamamlanmayıb.");
  }

  const transporter = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port: serverEnv.smtpPort,
    secure: serverEnv.smtpSecure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: SMTP_SEND_TIMEOUT_MS,
    auth: {
      user: serverEnv.smtpUser,
      pass: serverEnv.smtpPassword,
    },
  });
  const subject = `${input.storeName}-də ${input.discountPercent}% endirim`;
  const text = [
    "Salam,",
    "",
    `${input.storeName} mağazasında ${input.code} promo kodu ilə ${input.discountPercent}% endirim əldə edə bilərsiniz.`,
    "",
    `Promo kod: ${input.code}`,
    `Endirim: ${input.discountPercent}%`,
    `Bitmə tarixi: ${formatDate(input.endsAt)}`,
    "",
    input.storeUrl,
  ].join("\n");

  try {
    await withTimeout(
      transporter.sendMail({
        from: serverEnv.smtpFrom || serverEnv.smtpUser,
        to: input.to,
        subject,
        text,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
            <h2 style="margin:0 0 12px">${escapeHtml(input.storeName)} mağazasında endirim</h2>
            <p>${escapeHtml(input.storeName)} mağazasında <strong>${escapeHtml(input.code)}</strong> promo kodu ilə ${input.discountPercent}% endirim əldə edə bilərsiniz.</p>
            <p><strong>Promo kod:</strong> ${escapeHtml(input.code)}</p>
            <p><strong>Endirim:</strong> ${input.discountPercent}%</p>
            <p><strong>Bitmə tarixi:</strong> ${escapeHtml(formatDate(input.endsAt))}</p>
            <p>
              <a href="${escapeHtml(input.storeUrl)}" style="display:inline-block;border-radius:10px;background:#0f879b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
                Mağazaya bax
              </a>
            </p>
          </div>
        `,
      }),
      SMTP_SEND_TIMEOUT_MS,
    );
  } finally {
    transporter.close();
  }
}
