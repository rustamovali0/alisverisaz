"use client";

import { ArrowRight, BarChart3, PackageSearch, ShieldCheck, Sparkles } from "lucide-react";
import { m } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type HomeExperienceProps = {
  title: string;
  description: string;
  productsLabel: string;
};

const capabilities = [
  {
    icon: PackageSearch,
    title: "Marketplace",
    description: "Məhsul, elan, sifariş və mağaza idarəsi bir paneldə.",
  },
  {
    icon: Sparkles,
    title: "Premium panel",
    description: "Mağaza, məhsul və sifarişləri rahat idarə edən SaaS görünüşü.",
  },
  {
    icon: ShieldCheck,
    title: "Supabase",
    description: "Auth, RLS, Storage və PostgreSQL strukturu hazırdır.",
  },
];

export function HomeExperience({
  title,
  description,
  productsLabel,
}: HomeExperienceProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-background soft-grid-bg">
      <section className="container grid min-h-screen items-center gap-10 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-12">
        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="glass-panel inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            2026 SaaS marketplace
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/products">
                {productsLabel}
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Dashboard</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {capabilities.map((item, index) => {
              const Icon = item.icon;

              return (
                <m.article
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.3 }}
                  className="premium-card p-4"
                >
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-semibold tracking-normal">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </m.article>
              );
            })}
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="glass-panel relative rounded-md p-3"
        >
          <div className="rounded-md border bg-card/[0.92] p-4 shadow-2xl shadow-slate-900/10 dark:bg-card/[0.84]">
            <div className="flex items-center justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  alisveris.az
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">
                  Seller command center
                </h2>
              </div>
              <div className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Live
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Məhsullar", "Sifarişlər", "SEO"].map((label) => (
                <div key={label} className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 w-2/3 rounded-full bg-primary" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              {[72, 54, 88].map((width, index) => (
                <div key={width} className="rounded-md border bg-background/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BarChart3 className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 rounded-full bg-muted">
                        <m.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                          className="h-2 rounded-full bg-primary"
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Dashboard modulu
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </m.div>
      </section>
    </main>
  );
}
