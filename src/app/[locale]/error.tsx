"use client";

import { ErrorState } from "@/components/common/error-state";
import { RootShell } from "@/components/layout/root-shell";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <RootShell>
      <ErrorState
        title="Xəta baş verdi"
        description="Səhifə hazırda açılmadı. Zəhmət olmasa bir az sonra yenidən cəhd edin."
        actionLabel="Yenidən cəhd et"
        onAction={reset}
      />
    </RootShell>
  );
}
