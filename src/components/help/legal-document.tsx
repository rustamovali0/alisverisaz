import { Link } from "@/i18n/navigation";
import type { HelpPageContent } from "@/lib/help-center/content";
import styles from "./legal-document.module.css";
export function LegalDocument({ page }: { page: HelpPageContent }) {
  const updated = Number.isFinite(Date.parse(page.lastUpdated))
    ? new Intl.DateTimeFormat("az-AZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(page.lastUpdated))
    : page.lastUpdated;
  const contents = (
    <nav aria-label="Sənədin bölmələri">
      <ol className={styles.links}>
        {page.sections.map((section, index) => (
          <li key={section.heading}>
            <a href={`#document-section-${index + 1}`}>{section.heading}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
  return (
    <main className={styles.root}>
      <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Səhifə yolu">
          <Link href="/">Ana səhifə</Link>
          <span aria-hidden="true">/</span>
          <Link href="/help">Kömək mərkəzi</Link>
          <span aria-hidden="true">/</span>
          <span>{page.title}</span>
        </nav>
        <header className={styles.hero}>
          <div className={styles.eyebrow}>{page.eyebrow}</div>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <div className={styles.meta}>
            <span>
              Son yenilənmə: <time dateTime={page.lastUpdated}>{updated}</time>
            </span>
            <span>{page.sections.length} bölmə</span>
          </div>
        </header>
        <div className={styles.layout}>
          <aside className={styles.toc}>
            <h2>Mündəricat</h2>
            {contents}
          </aside>
          <details className={styles.mobileToc}>
            <summary>Mündəricatı aç</summary>
            {contents}
          </details>
          <article className={styles.article}>
            {page.sections.map((section, index) => (
              <section
                key={section.heading}
                id={`document-section-${index + 1}`}
                className={styles.section}
              >
                <h2>
                  {index + 1}. {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.note && <p className={styles.note}>{section.note}</p>}
              </section>
            ))}
          </article>
        </div>
        <nav className={styles.related} aria-label="Əlaqəli sənədlər">
          <Link href="/terms">İstifadəçi razılaşması</Link>
          <Link href="/privacy">Məxfilik siyasəti</Link>
          <Link href="/rules">Marketplace qaydaları</Link>
          <Link href="/contact">Əlaqə və dəstək</Link>
        </nav>
      </div>
    </main>
  );
}
