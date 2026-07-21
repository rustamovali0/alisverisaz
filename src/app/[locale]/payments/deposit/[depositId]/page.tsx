import Link from "next/link";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";

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
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <DashboardPanel
          title="Beh ödənişi"
          description="Real ödəniş provider-i qoşulanda yönləndirmə bu strukturdan davam edəcək."
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Beh sifarişi: {depositId}</p>
            <p>Status hazırda “Gözləyir” kimi saxlanılır.</p>
            <Link className="font-medium text-primary hover:underline" href="/products">
              Məhsullara qayıt
            </Link>
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}
