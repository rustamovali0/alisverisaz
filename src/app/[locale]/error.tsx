"use client";

import { ErrorState } from "@/components/common/error-state";
import { RootShell } from "@/components/layout/root-shell";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <RootShell>
      <ErrorState
        title="Xeta bas verdi"
        description={error.message}
        actionLabel="Yeniden cehd et"
        onAction={reset}
      />
    </RootShell>
  );
}
