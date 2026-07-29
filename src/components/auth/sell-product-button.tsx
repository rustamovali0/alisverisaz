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
        router.push("/store/dashboard/products#create-product");
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

  if (profile.status === "loading" || profile.role === "admin") {
    return null;
  }

  return (
    <Button type="button" onClick={handleClick} disabled={isPending}>
      <Plus className="mr-2 size-4" aria-hidden="true" />
      {profile.role === "seller" ? "Məhsul sat" : "Satıcı ol"}
    </Button>
  );
}
