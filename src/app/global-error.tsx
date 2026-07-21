"use client";

import { ErrorState } from "@/components/common/error-state";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="az">
      <body>
        <main className="min-h-screen px-4 py-12">
          <ErrorState
            title="Sistem xetasi"
            description={error.message}
            actionLabel="Yeniden cehd et"
            onAction={reset}
          />
        </main>
      </body>
    </html>
  );
}
