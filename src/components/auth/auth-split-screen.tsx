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
    <div className={cn("h-full w-full", className)}>
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1120px] gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
        <div className="flex min-h-0 w-full justify-center overflow-hidden">
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {children}
          </div>
        </div>
        <AuthVisualPanel variant={variant} />
      </div>
    </div>
  );
}
