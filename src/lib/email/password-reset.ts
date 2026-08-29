import "server-only";

import nodemailer from "nodemailer";

import { serverEnv } from "@/lib/config/env.server";

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

function getPasswordResetEmailHtml(resetUrl: string) {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">Şifrəni yenilə</h2>
      <p>Alışveriş hesabınız üçün şifrə bərpa linki istənildi.</p>
      <p>
        <a href="${safeResetUrl}" style="display:inline-block;border-radius:10px;background:#0f879b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
          Şifrəni yenilə
        </a>
      </p>
      <p>Əgər bu sorğunu siz etməmisinizsə, bu emaili nəzərə almayın.</p>
      <p style="color:#64748b;font-size:13px">Link təhlükəsizlik məqsədi ilə məhdud müddət aktivdir.</p>
    </div>
  `;
}

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

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailInput) {
  if (!serverEnv.hasSmtpConfig) {
    throw new Error("SMTP ayarları tamamlanmayıb.");
  }

  const transporter = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port: serverEnv.smtpPort,
    secure: serverEnv.smtpSecure,
    auth: {
      user: serverEnv.smtpUser,
      pass: serverEnv.smtpPassword,
    },
  });

  await transporter.sendMail({
    from: serverEnv.smtpFrom || serverEnv.smtpUser,
    to,
    subject: "Alışveriş şifrə bərpası",
    text: [
      "Alışveriş hesabınız üçün şifrə bərpa linki istənildi.",
      "",
      resetUrl,
      "",
      "Əgər bu sorğunu siz etməmisinizsə, bu emaili nəzərə almayın.",
    ].join("\n"),
    html: getPasswordResetEmailHtml(resetUrl),
  });
}
