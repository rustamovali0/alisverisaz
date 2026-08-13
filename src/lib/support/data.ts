import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminSupportMessage = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  reply: string | null;
  createdAt: string;
};

export async function getAdminSupportMessages(): Promise<AdminSupportMessage[]> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("support_messages")
    .select("id,full_name,email,phone,subject,message,status,reply,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    fullName: row.full_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    subject: row.subject ?? "Dəstək müraciəti",
    message: row.message ?? "",
    status: row.status ?? "open",
    reply: row.reply ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}
