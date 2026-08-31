import "server-only";

import nodemailer from "nodemailer";

import { siteConfig } from "@/lib/config/site";
import { serverEnv } from "@/lib/config/env.server";

const SMTP_SEND_TIMEOUT_MS = 15_000;

type ProductApprovalEmailInput = {
  to: string;
  sellerName: string;
  productName: string;
  message?: string | null;
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

async function sendProductEmail({
  to,
  subject,
  title,
  body,
}: {
  to: string;
  subject: string;
  title: string;
  body: string;
}) {
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

  try {
    await withTimeout(
      transporter.sendMail({
        from: serverEnv.smtpFrom || serverEnv.smtpUser,
        to,
        subject,
        text: [title, "", body, "", siteConfig.url].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
            <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
            <p>${escapeHtml(body)}</p>
            <p>
              <a href="${escapeHtml(siteConfig.url)}" style="display:inline-block;border-radius:10px;background:#0f879b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
                Alışverişə keç
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

export async function sendProductSubmittedEmail(input: ProductApprovalEmailInput) {
  await sendProductEmail({
    to: input.to,
    subject: "Məhsulunuz təsdiqə göndərildi",
    title: `Məhsul əlavə edildi: ${input.productName}`,
    body: `${input.sellerName}, məhsulunuz qəbul edildikdən sonra dərc olunacaq.`,
  });
}

export async function sendProductRejectedEmail(input: ProductApprovalEmailInput) {
  await sendProductEmail({
    to: input.to,
    subject: "Məhsulunuz təsdiqlənmədi",
    title: `Məhsul rədd edildi: ${input.productName}`,
    body:
      input.message?.trim() ||
      "Məhsulunuz təsdiqlənmədi. Zəhmət olmasa məlumatları yoxlayıb yenidən göndərin.",
  });
}
