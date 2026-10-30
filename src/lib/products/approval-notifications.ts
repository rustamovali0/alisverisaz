import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Internal helpers: these must not become client-callable Server Actions.
export async function notifySeller(input: {
  userId: string | null;
  type: string;
  title: string;
  body: string;
  productId: string;
}) {
  if (!input.userId) return;

  const supabase = createSupabaseAdminClient();
  await (supabase as any).from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: { source: "product_approval", product_id: input.productId },
  });
}

export async function notifyProductSubmitted(input: {
  sellerId: string;
  sellerName: string;
  sellerEmail: string | null;
  productId: string;
  productName: string;
}) {
  await notifySeller({
    userId: input.sellerId,
    type: "product_pending_review",
    title: "Məhsul təsdiqə göndərildi",
    body: "Məhsul əlavə edildi, qəbul edildikdən sonra dərc olunacaq.",
    productId: input.productId,
  });

  // The notification insert is captured by the Supabase email outbox trigger.
}
