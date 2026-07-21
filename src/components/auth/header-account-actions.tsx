"use client";

import { useEffect, useState } from "react";
import { Store, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthRole } from "@/lib/auth/types";

type HeaderAccountActionsProps = {
  className?: string;
};

function getPanelPath(role: AuthRole) {
  if (role === "seller") {
    return {
      href: "/store/dashboard",
      label: "Panelə keç",
      icon: Store,
    };
  }

  return {
    href: "/dashboard",
    label: "Hesabım",
    icon: UserRound,
  };
}

export function HeaderAccountActions({ className }: HeaderAccountActionsProps) {
  const [role, setRole] = useState<AuthRole | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        setRole(null);
        setIsChecked(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .returns<{ role: AuthRole }[]>()
        .maybeSingle();
      const profileRole = profile?.role;

      setRole(profileRole === "seller" ? "seller" : "customer");
      setIsChecked(true);
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isChecked) {
    return null;
  }

  if (role) {
    const action = getPanelPath(role);
    const Icon = action.icon;

    return (
      <Button asChild variant="outline" className={className}>
        <Link href={action.href}>
          <Icon className="mr-2 size-4" aria-hidden="true" />
          {action.label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" className={className}>
        <Link href="/admin">Daxil ol</Link>
      </Button>
      <Button asChild variant="outline" className={className}>
        <Link href="/register">Qeydiyyatdan keç</Link>
      </Button>
    </>
  );
}
