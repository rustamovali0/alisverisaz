import "server-only";

import { sendProductSubmittedEmail } from "@/lib/email/product-approval";
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

  if (!input.sellerEmail) return;

  try {
    await sendProductSubmittedEmail({
      to: input.sellerEmail,
      sellerName: input.sellerName,
      productName: input.productName,
    });
  } catch (error) {
    console.error("Product submitted email failed", {
      productId: input.productId,
      error,
    });
  }
}
