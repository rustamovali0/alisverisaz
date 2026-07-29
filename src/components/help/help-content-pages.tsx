import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  HelpCardList,
  HelpFaqList,
  HelpPageShell,
  HelpRelated,
  HelpSectionList,
  HelpSidebar,
} from "@/components/help/help-page-shell";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/cms/data";
import {
  getHelpArticle,
  getHelpPage,
  getHelpPageList,
  helpArticleGroups,
  helpArticles,
  helpFaqGroups,
  helpFaqs,
  type HelpArticleContent,
  type HelpPageContent,
} from "@/lib/help-center/content";
import type { ReactNode } from "react";

function footerFromSettings(settings: Awaited<ReturnType<typeof getSiteSettings>>) {
  return {
    siteName: settings.shortName || settings.siteName,
    description: settings.defaultMetaDescription,
    socialLinks: {
      instagram: settings.socialLinks.instagram,
      tiktok: settings.socialLinks.tiktok,
      whatsapp: settings.socialLinks.whatsapp || settings.whatsapp,
    },
  };
}

function relatedPageItems(slugs: string[]) {
  return slugs
    .map((slug) => {
      if (slug === "articles") {
        return {
          href: "/help/articles",
          title: "Kömək məqalələri",
          summary: "100 addım-addım yardım məqaləsi.",
        };
      }

      const page = getHelpPage(slug);

      if (!page) {
        return null;
      }

      return {
        href: page.href,
        title: page.title,
        summary: page.summary,
      };
    })
    .filter(Boolean) as Array<{
    href: string;
    title: string;
    summary?: string;
  }>;
}

function relatedArticleItems(slugs: string[]) {
  return slugs
    .map((slug) => getHelpArticle(slug))
    .filter((article): article is HelpArticleContent => Boolean(article))
    .map((article) => ({
      href: article.href,
      title: article.title,
      summary: article.summary,
    }));
}

type PublicHelpFrameProps = {
  children: ReactNode;
  currentPath: string;
};

async function PublicHelpFrame({ children, currentPath }: PublicHelpFrameProps) {
  const settings = await getSiteSettings();
  const footer = footerFromSettings(settings);

  return (
    <>
      <MarketplaceHeader siteName={footer.siteName} />
      <div className="pb-24 md:pb-0">{children}</div>
      <SiteFooter {...footer} />
    </>
  );
}

export async function HelpDocumentPage({
  page,
}: {
  page: HelpPageContent;
}) {
  const settings = await getSiteSettings();
  const footer = footerFromSettings(settings);

  return (
    <>
      <MarketplaceHeader siteName={footer.siteName} />
      <div className="pb-24 md:pb-0">
        <HelpPageShell
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
          stats={[
            { label: "Bölmə", value: String(page.sections.length) },
            { label: "Yenilənmə", value: page.lastUpdated },
            { label: "Əlaqəli", value: String(page.relatedSlugs.length) },
          ]}
          sidebar={
            <HelpSidebar
              currentPath={page.href}
              supportEmail={settings.contactEmail}
              supportPhone={settings.phone || settings.whatsapp}
            />
          }
        >
          {page.slug === "help" ? <HelpHubContent /> : null}
          <HelpSectionList sections={page.sections} />
          <HelpRelated items={relatedPageItems(page.relatedSlugs)} />
        </HelpPageShell>
      </div>
      <SiteFooter {...footer} />
    </>
  );
}

function HelpHubContent() {
  const pages = getHelpPageList().filter((page) => page.slug !== "help");

  return (
    <div className="space-y-6">
      <HelpCardList
        items={pages.map((page) => ({
          href: page.href,
          title: page.title,
          description: page.summary,
          badge: page.eyebrow,
        }))}
      />

      <section className="rounded-md border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-normal text-foreground">
            Məqalə kateqoriyaları
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Hər kateqoriyada 10 praktik məqalə var.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {helpArticleGroups.map((group) => (
            <Link
              key={group.slug}
              href={`/help/articles#${group.slug}`}
              className="rounded-md border bg-background p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="font-medium text-foreground">{group.category}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {group.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export async function HelpArticlesIndexPage() {
  const settings = await getSiteSettings();

  return (
    <PublicHelpFrame currentPath="/help/articles">
      <HelpPageShell
        eyebrow="Kömək məqalələri"
        title="100+ yardım məqaləsi"
        description="Hesab, elan, alış, satış, mesajlaşma və təhlükəsizlik üçün addım-addım izahlar."
        stats={[
          { label: "Məqalə", value: String(helpArticles.length) },
          { label: "Kateqoriya", value: String(helpArticleGroups.length) },
          { label: "Format", value: "Addım-addım" },
        ]}
        sidebar={
          <HelpSidebar
            currentPath="/help/articles"
            supportEmail={settings.contactEmail}
            supportPhone={settings.phone || settings.whatsapp}
          />
        }
      >
        <div className="space-y-6">
          {helpArticleGroups.map((group) => (
            <section key={group.slug} id={group.slug} className="scroll-mt-24">
              <div className="mb-3">
                <h2 className="text-xl font-semibold tracking-normal">{group.category}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {group.summary}
                </p>
              </div>
              <HelpCardList
                items={group.items.map((article) => ({
                  href: article.href,
                  title: article.title,
                  description: article.summary,
                  badge: article.category,
                }))}
              />
            </section>
          ))}
        </div>
      </HelpPageShell>
    </PublicHelpFrame>
  );
}

export async function HelpArticlePage({
  article,
}: {
  article: HelpArticleContent;
}) {
  const settings = await getSiteSettings();

  return (
    <PublicHelpFrame currentPath={article.href}>
      <HelpPageShell
        eyebrow={article.category}
        title={article.title}
        description={article.summary}
        stats={[
          { label: "Addım", value: String(article.steps.length) },
          { label: "Qeyd", value: String(article.notes.length) },
          { label: "Kateqoriya", value: article.category },
        ]}
        sidebar={
          <HelpSidebar
            currentPath="/help/articles"
            supportEmail={settings.contactEmail}
            supportPhone={settings.phone || settings.whatsapp}
          />
        }
      >
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold tracking-normal">Addım-addım izah</h2>
          <ol className="mt-4 grid gap-3">
            {article.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold tracking-normal">Vacib qeydlər</h2>
          <ul className="mt-4 grid gap-2">
            {article.notes.map((note) => (
              <li key={note} className="flex gap-2 text-sm leading-7 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>

        <HelpRelated items={relatedArticleItems(article.relatedSlugs)} />
      </HelpPageShell>
    </PublicHelpFrame>
  );
}

export async function HelpFaqPage() {
  const settings = await getSiteSettings();

  return (
    <PublicHelpFrame currentPath="/faq">
      <HelpPageShell
        eyebrow="FAQ"
        title="100+ tez-tez verilən sual"
        description="Alışveriş.az istifadəçilərinin ən çox qarşılaşdığı mövzular üzrə qısa cavablar."
        stats={[
          { label: "Sual", value: String(helpFaqs.length) },
          { label: "Kateqoriya", value: String(helpFaqGroups.length) },
          { label: "Cavab tipi", value: "Qısa" },
        ]}
        sidebar={
          <HelpSidebar
            currentPath="/faq"
            supportEmail={settings.contactEmail}
            supportPhone={settings.phone || settings.whatsapp}
          />
        }
      >
        <div className="space-y-6">
          {helpFaqGroups.map((group) => (
            <section key={group.slug} id={group.slug} className="scroll-mt-24">
              <div className="mb-3">
                <h2 className="text-xl font-semibold tracking-normal">{group.category}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {group.summary}
                </p>
              </div>
              <HelpFaqList
                items={group.items.map((faq) => ({
                  id: faq.slug,
                  question: faq.question,
                  answer: faq.answer,
                }))}
              />
            </section>
          ))}
        </div>
      </HelpPageShell>
    </PublicHelpFrame>
  );
}
