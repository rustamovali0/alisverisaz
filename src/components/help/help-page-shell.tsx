import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type HelpPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  sidebar?: ReactNode;
  children: ReactNode;
};

export function HelpPageShell({
  eyebrow,
  title,
  description,
  stats = [],
  sidebar,
  children,
}: HelpPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-8 md:py-12">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Ana səhifə
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">{eyebrow}</span>
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center rounded-md border bg-muted/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </span>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            </div>

            {stats.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-md border bg-card p-4">
                    <div className="text-2xl font-semibold tracking-normal">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {children}
          </section>

          {sidebar ? <aside className="space-y-4 lg:sticky lg:top-24">{sidebar}</aside> : null}
        </div>
      </div>
    </main>
  );
}

type HelpSectionListProps = {
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    note?: string;
  }>;
};

export function HelpSectionList({ sections }: HelpSectionListProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.heading} className="rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold tracking-normal text-foreground">
            {section.heading}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {section.bullets?.length ? (
            <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted-foreground">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {section.note ? (
            <p className="mt-4 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm leading-6 text-foreground">
              {section.note}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

type HelpSidebarProps = {
  currentPath: string;
  supportEmail?: string;
  supportPhone?: string;
};

const sidebarGroups = [
  {
    title: "Sənədlər",
    items: [
      { href: "/help", label: "Kömək mərkəzi" },
      { href: "/faq", label: "FAQ" },
      { href: "/terms", label: "İstifadəçi razılaşması" },
      { href: "/privacy", label: "Məxfilik siyasəti" },
      { href: "/rules", label: "Marketplace qaydaları" },
    ],
  },
  {
    title: "Təlimatlar",
    items: [
      { href: "/help/articles", label: "Məqalələr" },
      { href: "/guide/new-listing", label: "Yeni elan" },
      { href: "/guide/seller", label: "Satıcı" },
      { href: "/guide/buyer", label: "Alıcı" },
      { href: "/about", label: "Layihə haqqında" },
      { href: "/contact", label: "Əlaqə və dəstək" },
    ],
  },
] as const;

export function HelpSidebar({
  currentPath,
  supportEmail,
  supportPhone,
}: HelpSidebarProps) {
  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Sürətli keçidlər
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Lazımi bölməni tez tapmaq üçün qısa siyahı.
        </p>
      </div>

      <div className="space-y-4">
        {sidebarGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            <div className="grid gap-1.5">
              {group.items.map((item) => {
                const isActive =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border bg-background p-3">
        <h3 className="text-sm font-semibold text-foreground">Dəstək</h3>
        <div className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
          {supportEmail ? <div>Email: {supportEmail}</div> : null}
          {supportPhone ? <div>Telefon: {supportPhone}</div> : null}
          <div>Mesaj və şikayətlər əlaqə səhifəsi ilə yönləndirilir.</div>
        </div>
      </div>
    </div>
  );
}

type HelpRelatedProps = {
  items: Array<{
    href: string;
    title: string;
    summary?: string;
  }>;
};

export function HelpRelated({ items }: HelpRelatedProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-md border bg-card p-5">
      <h2 className="text-lg font-semibold tracking-normal text-foreground">
        Əlaqəli məzmun
      </h2>
      <div className="grid gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="font-medium text-foreground">{item.title}</div>
            {item.summary ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.summary}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

type HelpCardListProps = {
  items: Array<{
    href: string;
    title: string;
    description: string;
    badge?: string;
  }>;
};

export function HelpCardList({ items }: HelpCardListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
        >
          {item.badge ? (
            <span className="inline-flex rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.badge}
            </span>
          ) : null}
          <h3 className={cn("mt-3 text-base font-semibold tracking-normal text-foreground")}>
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}

type HelpFaqListProps = {
  items: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
};

export function HelpFaqList({ items }: HelpFaqListProps) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group rounded-md border bg-card p-4">
          <summary className="cursor-pointer list-none text-base font-medium tracking-normal text-foreground">
            {item.question}
          </summary>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

