"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { updateUserRoleAction } from "@/lib/auth/actions";
import type { AuthRole } from "@/lib/auth/types";

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
};

const roleLabels: Record<AuthRole, string> = {
  customer: "Müştəri",
  seller: "Satıcı",
  admin: "Admin",
};

export function UserRoleManager({ users }: { users: AdminUserRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUserRoleAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Rol dəyişmədi");
        return;
      }

      await appAlert.success("Rol yeniləndi", result.message);
    });
  }

  if (users.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        İstifadəçi yoxdur.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {users.map((user) => (
        <form
          key={user.id}
          action={handleSubmit}
          className="grid gap-3 py-4 md:grid-cols-[1fr_170px_auto] md:items-center"
        >
          <input type="hidden" name="userId" value={user.id} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user.full_name || user.email || user.id}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.email ?? user.id}
            </p>
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Rol
            <select
              name="role"
              defaultValue={user.role}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(["customer", "seller", "admin"] as AuthRole[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isPending}>
            Saxla
          </Button>
        </form>
      ))}
    </div>
  );
}
