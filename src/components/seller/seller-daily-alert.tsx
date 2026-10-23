"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SellerDailyAlertConfig } from "@/lib/seller-alerts/data";

type SellerDailyAlertProps = {
  config: SellerDailyAlertConfig;
  userId: string;
  missingAssets: string[];
};

function getBakuClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isInsideWindow(now: number, startTime: string, endTime: string) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return start <= end ? now >= start && now <= end : now >= start || now <= end;
}

export function SellerDailyAlert({ config, userId, missingAssets }: SellerDailyAlertProps) {
  const [open, setOpen] = useState(false);
  const [storageKey, setStorageKey] = useState("");

  useEffect(() => {
    if (!config.enabled || (config.audience === "missing_assets" && missingAssets.length === 0)) {
      return;
    }
    const clock = getBakuClock();
    if (!isInsideWindow(clock.minutes, config.startTime, config.endTime)) {
      return;
    }
    const key = `alisveris:seller-alert:${userId}:${config.version}:${clock.date}`;
    setStorageKey(key);
    setOpen(window.localStorage.getItem(key) !== "dismissed");
  }, [config, missingAssets.length, userId]);

  function dismiss() {
    if (storageKey) {
      window.localStorage.setItem(storageKey, "dismissed");
    }
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="seller-daily-alert-title">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <button type="button" onClick={dismiss} aria-label="Alerti bağla" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
          <X className="size-5" />
        </button>
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h2 id="seller-daily-alert-title" className="pr-8 text-xl font-bold text-slate-950 dark:text-white">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{config.body}</p>
        {missingAssets.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
            <span className="font-semibold">Çatışmayanlar:</span> {missingAssets.join(", ")}
          </div>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button asChild onClick={dismiss}>
            <Link href="/store/dashboard/settings">{config.ctaLabel}</Link>
          </Button>
          <Button type="button" variant="outline" onClick={dismiss}>Bu gün bağla</Button>
        </div>
      </div>
    </div>
  );
}
