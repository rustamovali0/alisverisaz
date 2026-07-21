import { NextResponse } from "next/server";

import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogoutRouteContext = {
  params: Promise<{
    locale: string;
  }>;
};

export async function GET(request: Request, context: LogoutRouteContext) {
  await context.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  await trackActivityEvent({
    eventType: "user_logout",
    actorId: data.user?.id ?? null,
    metadata: {
      title: "Logout",
      description: data.user?.email ?? "Hesabdan çıxış edildi",
      email: data.user?.email,
    },
  });

  return NextResponse.redirect(new URL("/admin", request.url));
}
