"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateNavigationItemAction } from "@/lib/cms/actions";
import type { ManagedNavigationMenu } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";

type NavigationManagerProps = {
  menus: ManagedNavigationMenu[];
};

export function NavigationManager({ menus }: NavigationManagerProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateNavigationItemAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Menyu saxlanmadı");
        return;
      }

      await appAlert.success("Menyu saxlandı", result.message);
    });
  }

  return (
    <div className="grid gap-5">
      {menus.map((menu) => (
        <section key={menu.id} className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold tracking-normal">{menu.title}</h3>
            <p className="text-sm text-muted-foreground">
              {menu.location} · {menu.items.length} element
            </p>
          </div>
          <div className="grid gap-3">
            {menu.items.map((item) => (
              <form
                key={item.id}
                action={handleSubmit}
                className="grid gap-3 rounded-md border bg-background p-3"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_120px]">
                  <input
                    name="title"
                    defaultValue={item.title}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    name="iconName"
                    defaultValue={item.icon}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={item.sortOrder}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    name="badgeText"
                    defaultValue={item.badgeText ?? ""}
                    placeholder="Badge"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.href}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {[
                    ["isActive", "Aktiv", item.isActive],
                    ["isExternal", "Xarici link", item.isExternal],
                    ["openInNewTab", "Yeni tab", item.openInNewTab],
                    ["showMobile", "Mobil", item.showMobile],
                    ["showDesktop", "Desktop", item.showDesktop],
                  ].map(([name, label, checked]) => (
                    <label key={String(name)} className="flex items-center gap-2">
                      <input
                        name={String(name)}
                        type="checkbox"
                        defaultChecked={Boolean(checked)}
                        className="size-4 rounded border-input"
                      />
                      {label}
                    </label>
                  ))}
                  {item.isSystem ? (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      Kritik route
                    </span>
                  ) : null}
                </div>
                <Button type="submit" className="w-fit" disabled={isPending}>
                  Saxla
                </Button>
              </form>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
