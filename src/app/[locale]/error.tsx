"use client";

import { ErrorState } from "@/components/common/error-state";
import { RootShell } from "@/components/layout/root-shell";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  void reset;

  return (
    <RootShell>
      <ErrorState
        title="Nə isə səhv getdi"
        description="Səhifə hazırda açılmadı. Zəhmət olmasa bir az sonra yenidən cəhd edin."
        actionLabel="Ana səhifəyə qayıt"
      />
    </RootShell>
  );
}
