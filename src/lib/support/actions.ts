"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupportActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createSupportMessageAction(
  formData: FormData,
): Promise<SupportActionResult> {
  const subject = readString(formData, "subject");
  const message = readString(formData, "message");

  if (subject.length < 3) {
    return { ok: false, message: "Mövzunu qısa da olsa yazın." };
  }

  if (message.length < 10) {
    return { ok: false, message: "Mesaj ən azı 10 simvol olmalıdır." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = readString(formData, "email") || user?.email || "";

  if (!user && !email) {
    return {
      ok: false,
      message: "Cavab üçün email ünvanınızı yazın.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any).from("support_messages").insert({
    user_id: user?.id ?? null,
    full_name: readString(formData, "fullName"),
    email,
    phone: readString(formData, "phone"),
    subject,
    message,
    status: "open",
  });

  if (error) {
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      String(error.message).includes("schema cache");

    return {
      ok: false,
      message: missingTable
        ? "Dəstək cədvəli hələ yaradılmayıb. SQL migration-u Supabase-də işə salın."
        : "Mesaj göndərilmədi. Yenidən cəhd edin.",
    };
  }

  revalidatePath("/radmin/messages");

  return { ok: true, message: "Dəstək mesajınız göndərildi." };
}
