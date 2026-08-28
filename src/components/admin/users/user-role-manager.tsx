"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { KeyRound, Trash2, UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  activateUserAction,
  deactivateUserAction,
  deleteUserAction,
  updateUserPasswordByAdminAction,
  updateUserRoleAction,
} from "@/lib/auth/actions";

type AssignableRole = "customer" | "seller" | "admin";

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  requested_role?: string | null;
  seller_application_status?: string | null;
  is_deactivated?: boolean;
  banned_until?: string | null;
};

const roleLabels: Record<AssignableRole, string> = {
  customer: "Müştəri",
  seller: "Satıcı",
  admin: "Admin",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function UserRoleManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftRoles, setDraftRoles] = useState<Record<string, AssignableRole>>({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
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

  function runMutation(
    actionKey: string,
    work: () => Promise<{ ok: true; message: string } | { ok: false; message: string }>,
    successTitle: string,
  ) {
    startTransition(async () => {
      setPendingActionKey(actionKey);
      const result = await work();
      setPendingActionKey(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Əməliyyat alınmadı");
        return;
      }

      void appAlert.success(successTitle, result.message);
      router.refresh();
    });
  }

  function handleRoleSubmit(formData: FormData) {
    const userId = String(formData.get("userId") ?? "");

    runMutation(
      `role:${userId}`,
      () => updateUserRoleAction(formData),
      "Rol yeniləndi",
    );
  }

  function handleStatusSubmit(formData: FormData) {
    const userId = String(formData.get("userId") ?? "");
    const action = String(formData.get("userAction") ?? "");

    if (action === "delete") {
      const confirmed = window.confirm("Bu istifadəçi silinsin?");
      if (!confirmed) return;
    }

    const work =
      action === "activate"
        ? () => activateUserAction(formData)
        : action === "deactivate"
          ? () => deactivateUserAction(formData)
          : () => deleteUserAction(formData);

    const successTitle =
      action === "activate"
        ? "İstifadəçi aktiv edildi"
        : action === "deactivate"
          ? "İstifadəçi deaktiv edildi"
          : "İstifadəçi silindi";

    runMutation(`${action}:${userId}`, work, successTitle);
  }

  function handlePasswordSubmit(formData: FormData) {
    const userId = String(formData.get("userId") ?? "");

    runMutation(
      `password:${userId}`,
      () => updateUserPasswordByAdminAction(formData),
      "Şifrə yeniləndi",
    );

    setPasswordDrafts((current) => ({ ...current, [userId]: "" }));
  }

  if (users.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        İstifadəçi yoxdur.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {users.map((user) => {
        const currentRole = draftRoles[user.id] ?? initialRoles[user.id] ?? "customer";
        const isSellerPending =
          user.requested_role === "seller" &&
          user.seller_application_status === "pending";

        return (
          <article
            key={user.id}
            className="grid gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px] md:items-start"
          >
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.full_name || user.email || user.id}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {user.email ?? user.id}
                  </p>
                  {user.phone ? (
                    <p className="mt-1 text-xs text-muted-foreground">{user.phone}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {roleLabels[currentRole]}
                  </span>
                  {user.is_deactivated ? (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Deaktiv
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Aktiv
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>ID: {user.id}</span>
                <span>Qeydiyyat: {formatDate(user.created_at)}</span>
                {user.banned_until ? <span>Blok: {formatDate(user.banned_until)}</span> : null}
              </div>

              {isSellerPending ? (
                <p className="inline-flex rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700">
                  Satıcı müraciəti gözləyir
                </p>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                <form action={handleRoleSubmit} className="grid gap-2 rounded-lg border border-border/70 p-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Rol
                    <select
                      name="role"
                      value={currentRole}
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
                    {isSellerPending ? (
                      <>
                        <Button
                          type="submit"
                          name="applicationAction"
                          value="approve"
                          disabled={isPending && pendingActionKey === `role:${user.id}`}
                        >
                          Təsdiqlə
                        </Button>
                        <Button
                          type="submit"
                          name="applicationAction"
                          value="reject"
                          variant="outline"
                          disabled={isPending && pendingActionKey === `role:${user.id}`}
                        >
                          İmtina et
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isPending && pendingActionKey === `role:${user.id}`}
                      >
                        Saxla
                      </Button>
                    )}
                  </div>
                </form>

                <form action={handlePasswordSubmit} className="grid gap-2 rounded-lg border border-border/70 p-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Yeni şifrə
                    <input
                      name="password"
                      type="password"
                      value={passwordDrafts[user.id] ?? ""}
                      onChange={(event) =>
                        setPasswordDrafts((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Minimum 8 simvol"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isPending && pendingActionKey === `password:${user.id}`}
                  >
                    <KeyRound className="mr-2 size-4" aria-hidden="true" />
                    Şifrəni dəyiş
                  </Button>
                </form>
              </div>
            </div>

            <form action={handleStatusSubmit} className="grid gap-2">
              <input type="hidden" name="userId" value={user.id} />
              {user.is_deactivated ? (
                <Button
                  type="submit"
                  name="userAction"
                  value="activate"
                  variant="outline"
                  disabled={isPending && pendingActionKey === `activate:${user.id}`}
                >
                  <UserCheck className="mr-2 size-4" aria-hidden="true" />
                  Aktiv et
                </Button>
              ) : (
                <Button
                  type="submit"
                  name="userAction"
                  value="deactivate"
                  variant="outline"
                  disabled={isPending && pendingActionKey === `deactivate:${user.id}`}
                >
                  <UserX className="mr-2 size-4" aria-hidden="true" />
                  Deaktiv et
                </Button>
              )}
              <Button
                type="submit"
                name="userAction"
                value="delete"
                variant="destructive"
                disabled={isPending && pendingActionKey === `delete:${user.id}`}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Sil
              </Button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
