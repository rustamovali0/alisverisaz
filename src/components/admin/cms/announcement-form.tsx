"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createAnnouncementAction } from "@/lib/cms/actions";
import { appAlert } from "@/lib/alerts/swal";

export function AnnouncementForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAnnouncementAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Announcement saxlanmadı");
        return;
      }

      await appAlert.success("Announcement saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-md border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <input
          name="title"
          placeholder="Başlıq"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        <select
          name="type"
          defaultValue="info"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="info">Məlumat</option>
          <option value="warning">Xəbərdarlıq</option>
          <option value="campaign">Kampaniya</option>
          <option value="maintenance">Texniki xidmət</option>
        </select>
        <select
          name="target"
          defaultValue="seller"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Hamı</option>
          <option value="seller">Satıcılar</option>
          <option value="customer">İstifadəçilər</option>
          <option value="admin">Adminlər</option>
          <option value="store">Konkret mağazalar</option>
        </select>
        <input
          name="startsAt"
          type="datetime-local"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          name="endsAt"
          type="datetime-local"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <textarea
        name="body"
        placeholder="Mətn"
        className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input name="isActive" type="checkbox" defaultChecked className="size-4 rounded border-input" />
          Aktiv
        </label>
        <label className="flex items-center gap-2">
          <input name="isDismissible" type="checkbox" defaultChecked className="size-4 rounded border-input" />
          Bağlana bilən
        </label>
      </div>
      <Button type="submit" className="w-fit" disabled={isPending}>
        Announcement yarat
      </Button>
    </form>
  );
}
