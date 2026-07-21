import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogoutRouteContext = {
  params: Promise<{
    locale: string;
  }>;
};

export async function GET(request: Request, context: LogoutRouteContext) {
  const { locale } = await context.params;
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
