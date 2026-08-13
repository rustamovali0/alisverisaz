"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, CheckCircle2, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  loadMyNotificationsAction,
  markAllNotificationsReadAction,
  type UserNotification,
} from "@/lib/notifications/actions";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type NotificationCenterProps = {
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
};

const SHOWN_STORAGE_KEY = "alisveris-shown-notifications";

function getShownIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const value = window.localStorage.getItem(SHOWN_STORAGE_KEY);
    return new Set<string>(value ? JSON.parse(value) : []);
  } catch {
    return new Set<string>();
  }
}

function saveShownIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-80)));
  } catch {
    // localStorage can be unavailable in private browsing.
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationCenter({
  className,
  buttonClassName,
  iconClassName,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [isPending, startTransition] = useTransition();
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    shownRef.current = getShownIds();
    startTransition(async () => {
      const result = await loadMyNotificationsAction();
      setItems(result.notifications);

      const newestUnread = result.notifications.find((item) => !item.readAt && !shownRef.current.has(item.id));
      if (newestUnread) {
        showToast({
          title: newestUnread.title,
          description: newestUnread.body ?? undefined,
          variant: newestUnread.type === "warning" ? "warning" : "info",
        });
        shownRef.current.add(newestUnread.id);
        saveShownIds(shownRef.current);
      }
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  function openModal() {
    setOpen(true);
    if (unreadCount === 0) {
      return;
    }

    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result.ok) {
        const readAt = new Date().toISOString();
        setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      }
    });
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openModal}
        className={cn(
          "relative size-12 rounded-xl border bg-background text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md",
          buttonClassName,
        )}
        aria-label="Bildirişlər"
      >
        <Bell className={cn("size-7 stroke-[2.3]", iconClassName)} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[999] bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            className="mx-auto flex max-h-[min(620px,calc(100dvh-48px))] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-lg font-black tracking-normal">Bildirişlər</h2>
                <p className="text-sm text-muted-foreground">
                  {items.length > 0 ? `${items.length} bildiriş` : "Yeni bildiriş yoxdur"}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-10 rounded-full" onClick={() => setOpen(false)} aria-label="Bağla">
                <X className="size-6" aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {isPending && items.length === 0 ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        "grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-xl border p-3",
                        item.readAt ? "bg-card" : "border-primary/30 bg-primary/5",
                      )}
                    >
                      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        {item.readAt ? <CheckCircle2 className="size-6" /> : <Info className="size-6" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-start justify-between gap-3">
                          <strong className="min-w-0 text-sm leading-5">{item.title}</strong>
                          <time className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt)}</time>
                        </span>
                        {item.body ? (
                          <span className="mt-1 block break-words text-sm leading-5 text-muted-foreground">{item.body}</span>
                        ) : null}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                  Hazırda bildiriş yoxdur.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
