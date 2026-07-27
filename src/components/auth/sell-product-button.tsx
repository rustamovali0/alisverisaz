"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import type { AuthRole } from "@/lib/auth/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SellProductButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [role, setRole] = useState<AuthRole | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setRole(null);
          setIsChecked(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .returns<Array<{ role: AuthRole }>>()
        .maybeSingle();

      if (isMounted) {
        setRole(profile?.role === "seller" ? "seller" : "customer");
        setIsChecked(true);
      }
    }

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/register?role=seller");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .returns<Array<{ role: AuthRole }>>()
        .maybeSingle();

      if (profile?.role === "seller") {
        router.push("/admin/products#create-product");
        return;
      }

      void appAlert.info(
        "Satıcı qeydiyyatı lazımdır",
        "Məhsul satmaq üçün zəhmət olmasa satıcı kimi qeydiyyatdan keçin.",
      );
    } finally {
      setIsPending(false);
    }
  }

  if (!isChecked || role === "customer") {
    return null;
  }

  return (
    <Button type="button" onClick={handleClick} disabled={isPending}>
      <Plus className="mr-2 size-4" aria-hidden="true" />
      Məhsul sat
    </Button>
  );
}
