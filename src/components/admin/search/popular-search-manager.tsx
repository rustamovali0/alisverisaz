"use client";

import { BarChart3, RotateCcw, Save, Search } from "lucide-react";
import { useState, useTransition } from "react";

import { appAlert } from "@/lib/alerts/app-alert";
import { updatePopularSearchOverridesAction } from "@/lib/search/actions";
import type { PopularSearchTerm } from "@/lib/search/data";
import { Button } from "@/components/ui/button";

type PopularSearchManagerProps = {
  automaticTerms: PopularSearchTerm[];
  overrides: string[];
};

export function PopularSearchManager({
  automaticTerms,
  overrides,
}: PopularSearchManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(() =>
    Array.from({ length: 4 }, (_, index) => overrides[index] ?? ""),
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePopularSearchOverridesAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Axtarışlar saxlanmadı");
        return;
      }

      void appAlert.success("Populyar axtarışlar yeniləndi", result.message);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <form action={submit} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Search className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold">Göstərilən top 4 axtarış</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Boş saxlasanız, istifadəçilərin real axtarışlarından avtomatik top 4 göstəriləcək.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {values.map((value, index) => (
            <label key={`search-${index}`} className="grid gap-1.5 text-sm font-medium">
              {index + 1}. axtarış
              <input
                name={`search${index + 1}`}
                value={value}
                maxLength={120}
                placeholder={`Məsələn, ${automaticTerms[index]?.term ?? "Telefon"}`}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  setValues(next);
                }}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 size-4" aria-hidden="true" />
            Saxla
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setValues(["", "", "", ""])}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden="true" />
            Avtomatik reytinqə qayıt
          </Button>
        </div>
      </form>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold">Avtomatik reytinq</h3>
            <p className="text-sm text-muted-foreground">Bütün axtarışların cəmi</p>
          </div>
        </div>
        <ol className="mt-4 divide-y rounded-lg border">
          {automaticTerms.length ? automaticTerms.map((item, index) => (
            <li key={item.term} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">
                <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                {item.term}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                {item.count}
              </span>
            </li>
          )) : (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              Hələ axtarış statistikası yoxdur.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}
