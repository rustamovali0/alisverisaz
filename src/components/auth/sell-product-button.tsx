"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";

export function SellProductButton() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useClientAuthProfile();
  const [isPending, setIsPending] = useState(false);

  function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const params = new URLSearchParams({ role: "seller", next: pathname });
      router.push(`/register?${params.toString()}`);
    } finally {
      setIsPending(false);
    }
  }

  if (profile.status !== "guest") {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="group bg-transparent text-slate-900 shadow-none hover:!bg-transparent hover:text-slate-900 dark:text-slate-100 dark:hover:text-slate-100"
      onClick={handleClick}
      disabled={isPending}
    >
      <Plus className="mr-2 size-4" aria-hidden="true" />
      <span className="inline-block transition-transform duration-200 md:group-hover:scale-105">
        Satıcı ol
      </span>
    </Button>
  );
}
