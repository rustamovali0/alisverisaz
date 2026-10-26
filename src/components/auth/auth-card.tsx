import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  topStart?: ReactNode;
  topEnd?: ReactNode;
  className?: string;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
  topStart,
  topEnd,
  className,
}: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-2xl border-0 bg-transparent p-0 text-card-foreground dark:text-slate-100",
        className,
      )}
    >
      {(topStart || topEnd) ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">{topStart}</div>
          <div className="shrink-0">{topEnd}</div>
        </div>
      ) : null}
      <div className="mb-5 space-y-1.5">
        <h1 className="text-3xl font-black leading-tight tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground sm:text-[15px]">{description}</p>
        ) : null}
      </div>
      {children}
      <div className="mt-4 border-t border-slate-200 pt-4 text-center text-sm text-muted-foreground dark:border-slate-800">
        {footer}
      </div>
    </section>
  );
}
