import { NextResponse } from "next/server";
import { loadMyNotificationsAction } from "@/lib/notifications/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  // The reader derives user_id from the verified cookie session and uses RLS.
  // No client-supplied account ID is accepted.
  const result = await loadMyNotificationsAction();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
