import Link from "next/link";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

type DepositPaymentPageProps = {
  params: Promise<{
    depositId: string;
  }>;
};

export default async function DepositPaymentPage({
  params,
}: DepositPaymentPageProps) {
  const { depositId } = await params;

  return (
    <main className="min-h-screen bg-background soft-grid-bg">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <section className="w-full max-w-xl rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl shadow-slate-900/10">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Placeholder ödəniş strukturu
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal">
                Beh ödənişi hazırlanır
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Beh sifarişi yaradılıb və real ödəniş provider-i qoşulanda bu
                mərhələ ödəniş ekranına çevriləcək.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border bg-background p-4 text-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
              <span>Status hazırda “Gözləyir” kimi saxlanılır.</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <span className="break-all">Beh sifarişi: {depositId}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/products">Məhsullara qayıt</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Ana səhifə</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
