"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";

export function SellProductButton() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useClientAuthProfile();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      if (profile.status === "guest") {
        const params = new URLSearchParams({ role: "seller", next: pathname });
        router.push(`/register?${params.toString()}`);
        return;
      }

      if (profile.status === "authenticated" && profile.role === "seller") {
        router.push("/sell");
        return;
      }

      if (profile.status === "authenticated" && profile.role === "admin") {
        router.push("/radmin");
        return;
      }

      void appAlert.info(
        "Satıcı qeydiyyatı lazımdır",
        "Məhsul satmaq üçün hesabınız satıcı kimi təsdiqlənməlidir.",
      );
    } finally {
      setIsPending(false);
    }
  }

  if (profile.status === "authenticated" && profile.role === "admin") {
    return null;
  }

  const label =
    profile.status === "authenticated" && profile.role === "seller"
      ? "Məhsul sat"
      : "Satıcı ol";

  return (
    <Button
      type="button"
      variant="ghost"
      className="group bg-transparent text-slate-900 shadow-none hover:!bg-transparent hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
      onClick={handleClick}
      disabled={isPending || profile.status === "loading"}
    >
      <Plus className="mr-2 size-4" aria-hidden="true" />
      <span className="inline-block transition-transform duration-200 group-hover:scale-105">
        {label}
      </span>
    </Button>
  );
}
