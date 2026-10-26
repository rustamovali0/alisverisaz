import type { ReactNode } from "react";

export function ProductEditor({ title, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return <section className="min-w-0 space-y-4">
    <h1 className="text-xl font-semibold">{title}</h1>
    {children}
  </section>;
}
