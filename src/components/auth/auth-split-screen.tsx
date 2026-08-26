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
      <div className="mx-auto grid w-full max-w-[1120px] gap-5 lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:py-[clamp(0.75rem,2.5vh,1.5rem)]">
        <div className="flex w-full justify-center">
          <div className="w-full max-w-[520px]">{children}</div>
        </div>
        <AuthVisualPanel variant={variant} />
      </div>
    </div>
  );
}
