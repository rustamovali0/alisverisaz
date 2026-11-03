import type { Metadata } from "next";
import { VisitReturn } from "@/components/security/visit-return";
export const metadata: Metadata = { title: "Mağazaya qayıdış", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SecurityReturnPage() { return <VisitReturn />; }
