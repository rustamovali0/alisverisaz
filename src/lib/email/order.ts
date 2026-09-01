import "server-only";

import nodemailer from "nodemailer";

import { siteConfig } from "@/lib/config/site";
import { serverEnv } from "@/lib/config/env.server";

const SMTP_SEND_TIMEOUT_MS = 15_000;

export type OrderEmailItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
};

export type OrderEmailInput = {
  to: string;
  orderNumber: string;
  storeName: string;
  customerName: string;
  totalAmount: number;
  currency?: string | null;
  items: OrderEmailItem[];
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

function formatMoney(amount: number, currency = "AZN") {
  return `${currency} ${amount.toFixed(2)}`;
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

function renderItems(items: OrderEmailItem[], currency: string) {
  if (items.length === 0) {
    return "";
  }

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;color:#0f172a">
      <thead>
        <tr>
          <th align="left" style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:13px;color:#64748b">Məhsul</th>
          <th align="center" style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:13px;color:#64748b">Say</th>
          <th align="right" style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:13px;color:#64748b">Cəm</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td style="border-bottom:1px solid #f1f5f9;padding:10px 0">
                  <strong>${escapeHtml(item.name)}</strong>
                  <div style="font-size:12px;color:#64748b">${escapeHtml(formatMoney(item.unitPrice, currency))}</div>
                </td>
                <td align="center" style="border-bottom:1px solid #f1f5f9;padding:10px 0">${item.quantity}</td>
                <td align="right" style="border-bottom:1px solid #f1f5f9;padding:10px 0;font-weight:700">${escapeHtml(formatMoney(item.totalAmount, currency))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function sendOrderEmail({
  to,
  subject,
  title,
  body,
  input,
}: {
  to: string;
  subject: string;
  title: string;
  body: string;
  input: OrderEmailInput;
}) {
  if (!serverEnv.hasSmtpConfig) {
    throw new Error("SMTP ayarları tamamlanmayıb.");
  }

  const currency = input.currency || "AZN";
  const itemText = input.items
    .map(
      (item) =>
        `- ${item.name} x${item.quantity}: ${formatMoney(item.totalAmount, currency)}`,
    )
    .join("\n");
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
        text: [
          title,
          "",
          body,
          "",
          `Sifariş: ${input.orderNumber}`,
          `Mağaza: ${input.storeName}`,
          itemText,
          `Yekun: ${formatMoney(input.totalAmount, currency)}`,
          "",
          siteConfig.url,
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px">
            <div style="max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:24px">
              <p style="margin:0 0 8px;color:#64748b;font-size:13px">${escapeHtml(input.orderNumber)}</p>
              <h2 style="margin:0 0 12px;font-size:24px;line-height:1.2">${escapeHtml(title)}</h2>
              <p style="margin:0 0 14px;color:#334155">${escapeHtml(body)}</p>
              <p style="margin:0;color:#64748b">Mağaza: <strong style="color:#0f172a">${escapeHtml(input.storeName)}</strong></p>
              ${renderItems(input.items, currency)}
              <p style="margin:18px 0 0;font-size:18px;font-weight:700;text-align:right">
                Yekun: ${escapeHtml(formatMoney(input.totalAmount, currency))}
              </p>
            </div>
          </div>
        `,
      }),
      SMTP_SEND_TIMEOUT_MS,
    );
  } finally {
    transporter.close();
  }
}

export async function sendCustomerOrderCreatedEmail(input: OrderEmailInput) {
  await sendOrderEmail({
    to: input.to,
    subject: `Sifarişiniz qəbul edildi: ${input.orderNumber}`,
    title: "Sifarişiniz qəbul edildi",
    body: `${input.customerName}, sifarişiniz uğurla yaradıldı. Mağaza sifarişi panelində görəcək.`,
    input,
  });
}

export async function sendSellerOrderCreatedEmail(input: OrderEmailInput) {
  await sendOrderEmail({
    to: input.to,
    subject: `Yeni sifariş: ${input.orderNumber}`,
    title: "Yeni sifariş var",
    body: `${input.storeName} üçün yeni sifariş yaradıldı. Zəhmət olmasa seller panelindən yoxlayın.`,
    input,
  });
}
