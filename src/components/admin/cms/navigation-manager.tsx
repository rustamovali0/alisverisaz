"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateNavigationItemAction } from "@/lib/cms/actions";
import type { ManagedNavigationMenu } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";
export function NavigationManager({
  menus,
}: {
  menus: ManagedNavigationMenu[];
}) {
  const [pending, startTransition] = useTransition();
  function save(form: FormData) {
    startTransition(async () => {
      const result = await updateNavigationItemAction(form);
      if (!result.ok) {
        void appAlert.error(result.message, "Saxlanmadı");
        return;
      }
      void appAlert.success("Menyu saxlandı", result.message);
    });
  }
  return (
    <div className="ra-editor-list">
      {!menus.length && (
        <p role="status">Menyular yüklənmədi. Yenidən cəhd edin.</p>
      )}
      {menus.map((menu) => (
        <details key={menu.id} open={menu.location === "header"}>
          <summary>
            {menu.title}{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {menu.items.length} keçid
            </span>
          </summary>
          <div className="ra-editor-body ra-editor-list">
            {menu.items.map((item) => (
              <details key={item.id}>
                <summary>
                  {item.title}
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    {item.isActive ? "Görünür" : "Gizlidir"}
                  </span>
                </summary>
                <form action={save} className="ra-editor-body grid gap-4">
                  <input type="hidden" name="itemId" value={item.id} />
                  <div className="ra-form-grid">
                    <label className="ra-field">
                      Menyu adı
                      <input name="title" defaultValue={item.title} required />
                    </label>
                    <label className="ra-field">
                      Keçid
                      <input
                        name="href"
                        defaultValue={item.href}
                        readOnly={item.isSystem}
                        required
                      />
                    </label>
                    <label className="ra-field">
                      Sıra
                      <input
                        name="sortOrder"
                        type="number"
                        defaultValue={item.sortOrder}
                      />
                    </label>
                    <label className="ra-field">
                      Nişan yazısı (istəyə görə)
                      <input
                        name="badgeText"
                        defaultValue={item.badgeText || ""}
                      />
                    </label>
                  </div>
                  <input type="hidden" name="iconName" value={item.icon} />
                  <input
                    type="hidden"
                    name="requiredFeature"
                    value={item.requiredFeature || ""}
                  />
                  <div className="flex flex-wrap gap-4">
                    {[
                      ["isActive", "Görünsün", item.isActive],
                      ["showMobile", "Mobil", item.showMobile],
                      ["showDesktop", "Kompüter", item.showDesktop],
                      ["openInNewTab", "Yeni pəncərə", item.openInNewTab],
                    ].map(([name, label, checked]) => (
                      <label
                        key={String(name)}
                        className="flex items-center gap-2"
                      >
                        <input
                          name={String(name)}
                          type="checkbox"
                          defaultChecked={Boolean(checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <input
                    type="hidden"
                    name="isExternal"
                    value={item.isExternal ? "on" : ""}
                  />
                  {item.isSystem && (
                    <p className="text-sm text-muted-foreground">
                      Bu bölmənin sistem keçidi qorunur.
                    </p>
                  )}
                  <Button type="submit" disabled={pending} className="w-fit">
                    Yadda saxla
                  </Button>
                </form>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
