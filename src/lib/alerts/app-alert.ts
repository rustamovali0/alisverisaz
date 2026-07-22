"use client";

import { getErrorMessage } from "@/lib/errors/app-error";

type AlertKind = "success" | "error" | "info" | "confirm";

type ConfirmResult = {
  isConfirmed: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createAlert(input: {
  kind: AlertKind;
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}) {
  return new Promise<ConfirmResult>((resolve) => {
    const root = document.createElement("div");
    root.className =
      "fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm";

    const isConfirm = input.kind === "confirm";
    const safeTitle = escapeHtml(input.title);
    const safeText = input.text ? escapeHtml(input.text) : "";
    const safeConfirmText = escapeHtml(input.confirmText ?? "Oldu");
    const safeCancelText = escapeHtml(input.cancelText ?? "Ləğv et");
    const tone =
      input.kind === "success"
        ? {
            badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            symbol: "✓",
          }
        : input.kind === "error"
          ? {
              badge: "bg-red-500/10 text-red-600 border-red-500/20",
              symbol: "!",
            }
          : input.kind === "confirm"
            ? {
                badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                symbol: "?",
              }
            : {
                badge: "bg-primary/10 text-primary border-primary/20",
                symbol: "i",
              };

    root.innerHTML = `
      <section class="w-full max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-2xl shadow-slate-950/20">
        <div class="flex items-start gap-4">
          <div class="grid size-12 shrink-0 place-items-center rounded-lg border text-xl font-black ${tone.badge}">
            ${tone.symbol}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-xl font-black tracking-normal">${safeTitle}</h2>
            ${
              safeText
                ? `<p class="mt-2 text-sm leading-6 text-muted-foreground">${safeText}</p>`
                : ""
            }
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          ${
            isConfirm
              ? `<button type="button" data-alert-cancel class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">${safeCancelText}</button>`
              : ""
          }
          <button type="button" data-alert-confirm class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">${safeConfirmText}</button>
        </div>
      </section>
    `;

    function cleanup(result: ConfirmResult) {
      document.removeEventListener("keydown", handleKeyDown);
      root.remove();
      resolve(result);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cleanup({
          isConfirmed: false,
        });
      }
    }

    root.querySelector("[data-alert-confirm]")?.addEventListener("click", () => {
      cleanup({
        isConfirmed: true,
      });
    });

    root.querySelector("[data-alert-cancel]")?.addEventListener("click", () => {
      cleanup({
        isConfirmed: false,
      });
    });

    root.addEventListener("click", (event) => {
      if (event.target === root) {
        cleanup({
          isConfirmed: false,
        });
      }
    });

    document.addEventListener("keydown", handleKeyDown);
    document.body.appendChild(root);
  });
}

export const appAlert = {
  success(title: string, text?: string) {
    return createAlert({
      kind: "success",
      title,
      text,
      confirmText: "Oldu",
    });
  },
  error(error: unknown, title = "Xəta") {
    return createAlert({
      kind: "error",
      title,
      text: getErrorMessage(error),
      confirmText: "Bağla",
    });
  },
  confirm(title: string, text?: string) {
    return createAlert({
      kind: "confirm",
      title,
      text,
      confirmText: "Təsdiqlə",
      cancelText: "Ləğv et",
    });
  },
};
