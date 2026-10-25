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
    <div className={cn("min-h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_34%),#f8fafc] p-3 sm:p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_34%),#020617]", className)}>
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] dark:border-slate-800 dark:bg-slate-950">
        <div className="order-2 flex min-h-0 w-full items-center justify-center p-5 sm:p-9 lg:order-1 lg:p-12">
          <div className="w-full max-w-[480px]">
            {children}
          </div>
        </div>
        <div className="order-1 min-h-48 lg:order-2 lg:min-h-full"><AuthVisualPanel variant={variant} /></div>
      </div>
    </div>
  );
}
