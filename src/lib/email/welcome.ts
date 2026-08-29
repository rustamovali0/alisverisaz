import "server-only";

import nodemailer from "nodemailer";

import { serverEnv } from "@/lib/config/env.server";
import type { AuthRole } from "@/lib/auth/types";

const SMTP_SEND_TIMEOUT_MS = 15_000;

type WelcomeRegistrationEmailInput = {
  to: string;
  fullName: string;
  role: AuthRole;
  loginUrl: string;
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

function getWelcomeEmailHtml({
  fullName,
  role,
  loginUrl,
}: Omit<WelcomeRegistrationEmailInput, "to">) {
  const safeName = escapeHtml(fullName);
  const safeLoginUrl = escapeHtml(loginUrl);
  const isSeller = role === "seller";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">Xoş gəldiniz, ${safeName}</h2>
      <p>Alışveriş hesabınız uğurla yaradıldı.</p>
      <p>${
        isSeller
          ? "Satıcı müraciətiniz qəbul edildi. Admin təsdiqindən sonra mağaza paneliniz aktiv olacaq və sizinlə əlaqə saxlanılacaq."
          : "İndi hesabınıza daxil olub məhsulları izləyə, sevimlilərə əlavə edə və sifarişlərinizi idarə edə bilərsiniz."
      }</p>
      <p>
        <a href="${safeLoginUrl}" style="display:inline-block;border-radius:10px;background:#0f879b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
          Hesaba daxil ol
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">Bu email Alışveriş qeydiyyatınızdan sonra avtomatik göndərilib.</p>
    </div>
  `;
}

export async function sendWelcomeRegistrationEmail({
  to,
  fullName,
  role,
  loginUrl,
}: WelcomeRegistrationEmailInput) {
  if (!serverEnv.hasSmtpConfig) {
    throw new Error("SMTP ayarları tamamlanmayıb.");
  }

  const isSeller = role === "seller";
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
        subject: isSeller
          ? "Alışveriş satıcı qeydiyyatınız qəbul edildi"
          : "Alışveriş hesabınıza xoş gəldiniz",
        text: [
          `Xoş gəldiniz, ${fullName}`,
          "",
          "Alışveriş hesabınız uğurla yaradıldı.",
          isSeller
            ? "Satıcı müraciətiniz qəbul edildi. Admin təsdiqindən sonra mağaza paneliniz aktiv olacaq və sizinlə əlaqə saxlanılacaq."
            : "İndi hesabınıza daxil olub məhsulları izləyə, sevimlilərə əlavə edə və sifarişlərinizi idarə edə bilərsiniz.",
          "",
          loginUrl,
        ].join("\n"),
        html: getWelcomeEmailHtml({ fullName, role, loginUrl }),
      }),
      SMTP_SEND_TIMEOUT_MS,
    );
  } finally {
    transporter.close();
  }
}
