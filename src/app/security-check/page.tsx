import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VisitCheck } from "@/components/security/visit-check";
import { getDangerState } from "@/lib/security/danger-state";
import { safeDangerNext } from "@/lib/security/danger-policy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Təhlükəsizlik yoxlaması", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function SecurityCheckPage({ searchParams }: { searchParams: Promise<{ next?: string; transfer?: string }> }) {
  const params = await searchParams;
  const next = safeDangerNext(params.next);
  const state = await getDangerState();
  if (!state.enabled) redirect(next);
  return <VisitCheck next={next} transfer={typeof params.transfer === "string" && params.transfer.length <= 6000 ? params.transfer : ""} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />;
}
