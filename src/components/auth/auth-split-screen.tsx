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
    <div className={cn("min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_34%),#f8fafc] p-2 sm:p-3 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_34%),#020617]", className)}>
      <div className={cn(
        "mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:min-h-[560px] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] dark:border-slate-800 dark:bg-slate-950",
        variant === "register" && "max-w-[1360px] lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]",
      )}>
        <div className={cn(
          "order-2 flex min-h-0 w-full items-center justify-center p-4 sm:p-6 lg:order-1 lg:p-8",
          variant === "register" && "lg:p-9",
        )}>
          <div className={cn("w-full max-w-[480px]", variant === "register" && "max-w-[680px]")}>
            {children}
          </div>
        </div>
        <div className="order-1 min-h-44 lg:order-2 lg:min-h-full"><AuthVisualPanel variant={variant} /></div>
      </div>
    </div>
  );
}
