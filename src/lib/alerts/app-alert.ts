"use client";

import { getErrorMessage } from "@/lib/errors/app-error";

type AlertKind = "success" | "error" | "info" | "confirm";

type ConfirmResult = {
  isConfirmed: boolean;
};

type ToastOptions = {
  dedupeKey?: string;
  persistAcrossNavigation?: boolean;
};

const PENDING_TOASTS_KEY = "alisveris-pending-toasts";

function dispatchToast(input: {
  title: string;
  description?: string;
  variant: "success" | "info";
  options?: ToastOptions;
}) {
  const detail = {
    title: input.title,
    description: input.description,
    variant: input.variant,
    dedupeKey:
      input.options?.dedupeKey ??
      `${input.variant}:${input.title}:${input.description ?? ""}`,
  };

  if (input.options?.persistAcrossNavigation) {
    try {
      window.sessionStorage.setItem(PENDING_TOASTS_KEY, JSON.stringify([detail]));
    } catch {
      // Toast persistence is best-effort; the immediate toast still works.
    }
  }

  window.dispatchEvent(new CustomEvent("alisveris-toast", { detail }));

  return Promise.resolve({
    isConfirmed: true,
  });
}

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
  autoCloseMs?: number;
}) {
  return new Promise<ConfirmResult>((resolve) => {
    const root = document.createElement("div");
    root.className =
      "fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md";

    const isConfirm = input.kind === "confirm";
    const safeTitle = escapeHtml(input.title);
    const safeText = input.text ? escapeHtml(input.text) : "";
    const safeConfirmText = escapeHtml(input.confirmText ?? "Oldu");
    const safeCancelText = escapeHtml(input.cancelText ?? "Ləğv et");
    const tone =
      input.kind === "success"
        ? {
            accent: "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300",
            button: "bg-emerald-600 text-white hover:bg-emerald-700",
            symbol: "✓",
          }
        : input.kind === "error"
          ? {
              accent: "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/35 dark:text-red-300",
              button: "bg-red-600 text-white hover:bg-red-700",
              symbol: "!",
            }
          : input.kind === "confirm"
            ? {
                accent: "border-amber-500/35 bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300",
                button: "bg-primary text-primary-foreground hover:bg-primary/90",
                symbol: "?",
              }
            : {
                accent: "border-primary/25 bg-primary/10 text-primary",
                button: "bg-primary text-primary-foreground hover:bg-primary/90",
                symbol: "i",
              };

    root.innerHTML = `
      <section role="dialog" aria-modal="true" class="w-full max-w-[440px] overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xl shadow-slate-950/25">
        <div class="h-1 bg-primary"></div>
        <div class="p-5 sm:p-6">
        <div class="flex items-start gap-4">
          <div class="grid size-11 shrink-0 place-items-center rounded-xl border text-lg font-black ${tone.accent}">
            ${tone.symbol}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="break-words text-lg font-black tracking-normal sm:text-xl">${safeTitle}</h2>
            ${
              safeText
                ? `<p class="mt-2 break-words text-sm leading-6 text-muted-foreground">${safeText}</p>`
                : ""
            }
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          ${
            isConfirm
              ? `<button type="button" data-alert-cancel class="inline-flex min-h-11 items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">${safeCancelText}</button>`
              : ""
          }
          <button type="button" data-alert-confirm class="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone.button}">${safeConfirmText}</button>
        </div>
        </div>
      </section>
    `;

    let timeoutId: number | undefined;
    let didClose = false;

    function cleanup(result: ConfirmResult) {
      if (didClose) {
        return;
      }

      didClose = true;

      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }

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

    if (!isConfirm && input.autoCloseMs) {
      timeoutId = window.setTimeout(() => {
        cleanup({
          isConfirmed: true,
        });
      }, input.autoCloseMs);
    }
  });
}

export const appAlert = {
  success(title: string, text?: string, options?: ToastOptions) {
    return dispatchToast({
      title,
      description: text,
      variant: "success",
      options,
    });
  },
  error(error: unknown, title = "Xəta") {
    return createAlert({
      kind: "error",
      title,
      text: getErrorMessage(error),
      confirmText: "Bağla",
      autoCloseMs: 6000,
    });
  },
  info(title: string, text?: string, options?: ToastOptions) {
    return dispatchToast({
      title,
      description: text,
      variant: "info",
      options,
    });
  },
  confirm(
    input:
      | string
      | {
          title: string;
          message?: string;
          confirmText?: string;
          cancelText?: string;
          variant?: "default" | "danger";
        },
    text?: string,
  ) {
    if (typeof input === "object") {
      return createAlert({
        kind: "confirm",
        title: input.title,
        text: input.message,
        confirmText: input.confirmText ?? "Təsdiqlə",
        cancelText: input.cancelText ?? "Ləğv et",
      });
    }

    return createAlert({
      kind: "confirm",
      title: input,
      text,
      confirmText: "Təsdiqlə",
      cancelText: "Ləğv et",
    });
  },
};
