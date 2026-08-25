"use client";

import { ErrorState } from "@/components/common/error-state";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="az">
      <body>
        <main className="min-h-screen px-4 py-12">
          <ErrorState
            title="Sistem xətası"
            description="Səhifə hazırda açılmadı. Zəhmət olmasa bir az sonra yenidən cəhd edin."
            actionLabel="Yenidən cəhd et"
            onAction={reset}
          />
        </main>
      </body>
    </html>
  );
}
