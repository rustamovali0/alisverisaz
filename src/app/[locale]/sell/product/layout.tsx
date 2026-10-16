import type { ReactNode } from "react";

export default function ProductEditorLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24">{children}</main>;
}
