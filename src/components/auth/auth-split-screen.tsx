import type { ReactNode } from "react";

import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
import { cn } from "@/lib/utils";

type AuthSplitScreenProps = {
  variant?: "login" | "register" | "admin";
  children: ReactNode;
  className?: string;
};

export function AuthSplitScreen({
  variant = "login",
  children,
  className,
}: AuthSplitScreenProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="flex w-full justify-center">
          <div className="w-full max-w-[520px]">{children}</div>
        </div>
        <AuthVisualPanel variant={variant} />
      </div>
    </div>
  );
}
