"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateUserRoleAction } from "@/lib/auth/actions";
type AssignableRole = "customer" | "seller" | "admin";

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  requested_role?: string | null;
  seller_application_status?: string | null;
};

const roleLabels: Record<AssignableRole, string> = {
  customer: "Müştəri",
  seller: "Satıcı",
  admin: "Admin",
};

export function UserRoleManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftRoles, setDraftRoles] = useState<Record<string, AssignableRole>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const initialRoles = useMemo(
    () =>
      Object.fromEntries(
        users.map((user) => [
          user.id,
          user.requested_role === "seller" &&
          user.seller_application_status === "pending"
            ? "seller"
            : user.role === "admin"
              ? "admin"
              : user.role === "seller"
                ? "seller"
                : "customer",
        ]),
      ) as Record<string, AssignableRole>,
    [users],
  );

  useEffect(() => {
    setDraftRoles(initialRoles);
  }, [initialRoles]);

  function handleSubmit(formData: FormData) {
    const userId = String(formData.get("userId") ?? "");

    startTransition(async () => {
      setPendingUserId(userId);
      const result = await updateUserRoleAction(formData);
      setPendingUserId(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Rol dəyişmədi");
        return;
      }

      void appAlert.success("Rol yeniləndi", result.message);
      router.refresh();
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
            {user.requested_role === "seller" &&
            user.seller_application_status === "pending" ? (
              <p className="mt-2 inline-flex rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700">
                Satıcı müraciəti gözləyir
              </p>
            ) : null}
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Rol
            <select
              name="role"
              value={draftRoles[user.id] ?? initialRoles[user.id] ?? "customer"}
              onChange={(event) =>
                setDraftRoles((current) => ({
                  ...current,
                  [user.id]: event.target.value as AssignableRole,
                }))
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(["customer", "seller", "admin"] as AssignableRole[]).map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {user.requested_role === "seller" &&
            user.seller_application_status === "pending" ? (
              <>
                <Button
                  type="submit"
                  name="applicationAction"
                  value="approve"
                  disabled={isPending && pendingUserId === user.id}
                >
                  Təsdiqlə
                </Button>
                <Button
                  type="submit"
                  name="applicationAction"
                  value="reject"
                  variant="outline"
                  disabled={isPending && pendingUserId === user.id}
                >
                  İmtina et
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={isPending && pendingUserId === user.id}>
                Saxla
              </Button>
            )}
          </div>
        </form>
      ))}
    </div>
  );
}
