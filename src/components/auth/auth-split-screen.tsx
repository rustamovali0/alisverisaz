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
    <div className={cn("min-h-full w-full", className)}>
      <div className="mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-[1240px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] dark:border-slate-800 dark:bg-slate-950">
        <div className="order-2 flex min-h-0 w-full items-center justify-center p-4 sm:p-8 lg:order-1 lg:p-10">
          <div className="w-full max-w-[480px]">
            {children}
          </div>
        </div>
        <div className="order-1 min-h-48 lg:order-2 lg:min-h-full"><AuthVisualPanel variant={variant} /></div>
      </div>
    </div>
  );
}
