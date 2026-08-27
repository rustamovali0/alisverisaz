"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const current = await getCurrentUserProfile();
  const fullName =
    current?.profile?.full_name?.trim() ||
    current?.user.email?.trim() ||
    readString(formData, "fullName");
  const phone = current?.profile?.phone?.trim() || readString(formData, "phone");
  const email = current?.user.email || readString(formData, "email");

  if (!current && !email) {
    return {
      ok: false,
      message: "Cavab üçün email ünvanınızı yazın.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any).from("support_messages").insert({
    user_id: current?.user.id ?? null,
    full_name: fullName,
    email,
    phone,
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
