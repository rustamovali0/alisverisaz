import type { ReactNode } from "react";

import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
import { cn } from "@/lib/utils";
import { rtestDesignEnabled } from "@/lib/config/rtest-design";

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
  if (rtestDesignEnabled) {
    return (
      <div className={cn("atelier-auth-layout", className)}>
        <div className="atelier-auth-art" aria-hidden="true">
          <img src="/design/atelier-shopping.webp" alt="" width={2000} height={667} />
          <span>Alışveriş.az</span>
        </div>
        <div className="atelier-auth-form">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("h-full min-h-0 w-full", className)}>
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-stretch">
        <div className="flex h-full min-h-0 w-full justify-center overflow-hidden">
          <div className="h-full max-h-full w-full max-w-[540px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {children}
          </div>
        </div>
        <AuthVisualPanel variant={variant} />
      </div>
    </div>
  );
}
