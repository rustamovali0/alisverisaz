"use client";

import { useEffect } from "react";

import { trackProductViewAction, trackStoreViewAction } from "@/lib/analytics/actions";

const visitorStorageKey = "alisveris_visitor_id";

function getVisitorId() {
  const current = window.localStorage.getItem(visitorStorageKey);

  if (current) {
    return current;
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(visitorStorageKey, next);

  return next;
}

function getSource() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("source") === "share" || params.get("utm_source")) {
    return "share";
  }

  return document.referrer ? "normal" : "direct";
}

export function ViewTracker({
  productId,
  storeId,
}: {
  productId?: string;
  storeId?: string;
}) {
  useEffect(() => {
    const visitorId = getVisitorId();
    const source = getSource();

    if (productId) {
      void trackProductViewAction({ productId, visitorId, source });
      return;
    }

    if (storeId) {
      void trackStoreViewAction({ storeId, visitorId, source });
    }
  }, [productId, storeId]);

  return null;
}
