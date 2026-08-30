"use server";

import { revalidatePath } from "next/cache";

import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type NotificationActionResult =
  | {
      ok: true;
      notifications: UserNotification[];
    }
  | {
      ok: false;
      message: string;
      notifications: UserNotification[];
    };

function mapNotification(row: any): UserNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    data: row.data ?? {},
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

export async function loadMyNotificationsAction(): Promise<NotificationActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Bildirişləri görmək üçün daxil olun.",
      notifications: [],
    };
  }

  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("id,type,title,body,data,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return {
      ok: false,
      message: "Bildirişləri yükləmək mümkün olmadı.",
      notifications: [],
    };
  }

  return {
    ok: true,
    notifications: (data ?? []).map(mapNotification),
  };
}

export async function markAllNotificationsReadAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Sessiya tapılmadı.",
    };
  }

  const { error } = await (supabase as any)
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return {
      ok: false,
      message: "Bildiriş statusu yenilənmədi.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/store/dashboard");
  revalidatePath("/store/dashboard/messages");
  await trackActivityEvent({
    eventType: "notifications_marked_read",
    actorId: user.id,
    metadata: {
      title: "Bildirişlər oxundu",
      description: "Bütün bildirişlər oxunmuş kimi işarələndi.",
    },
  });

  return {
    ok: true,
    message: "Bildirişlər oxundu kimi işarələndi.",
  };
}

export async function deleteAllNotificationsAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Sessiya tapılmadı.",
    };
  }

  const { error } = await (supabase as any)
    .from("notifications")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Bildirişlər silinmədi.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/store/dashboard");
  revalidatePath("/store/dashboard/messages");
  await trackActivityEvent({
    eventType: "notifications_deleted",
    actorId: user.id,
    metadata: {
      title: "Bildirişlər silindi",
      description: "Bütün bildirişlər silindi.",
    },
  });

  return {
    ok: true,
    message: "Bildirişlər silindi.",
  };
}
