import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Headphones,
  Info,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  Package,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getHelpCenterCopy } from "@/components/help/help-center-copy";
import styles from "./help-center.module.css";

type HelpTopic = { id: string; href: string; links: readonly string[] };
type HelpCenterProps = {
  locale: string;
  topics: readonly HelpTopic[];
  quickLinks: readonly { id: string; href: string }[];
  supportPhone?: string;
  year: number;
};
const topicIcons = [
  UserRound,
  ShoppingBag,
  Store,
  Package,
  ShieldCheck,
  MessageCircle,
];
const quickIcons = [KeyRound, ShoppingBag, Store];

export function HelpCenter({
  locale,
  topics,
  quickLinks,
  supportPhone,
  year,
}: HelpCenterProps) {
  const copy = getHelpCenterCopy(locale);
  const phone = supportPhone?.replace(/[^+\d]/g, "");

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <nav className={styles.nav} aria-label={copy.center}>
          <Link href="/" className={styles.homeLink}>
            {copy.home}
            <span aria-hidden="true">/</span>
            <span>{copy.center}</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/about">
              {copy.about}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/contact">
              {copy.contact}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </nav>
        <header className={styles.hero}>
          <span className={styles.heroIcon}>
            <Headphones size={28} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className={styles.eyebrow}>{copy.center}</p>
          <h1>{copy.title}</h1>
          <p className={styles.intro}>{copy.intro}</p>
        </header>

        <div className={styles.quickLinks}>
          {quickLinks.map((item, index) => {
            const Icon = quickIcons[index];
            return (
              <Link key={item.id} href={item.href}>
                <span className={styles.quickIcon}>
                  <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span>{copy.quick[index]}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <section
          className={styles.topics}
          aria-labelledby="help-topics-heading"
        >
          <div className={styles.sectionTop}>
            <div>
              <p className={styles.eyebrow}>{copy.topicEyebrow}</p>
              <h2 id="help-topics-heading">{copy.topicTitle}</h2>
              <p>{copy.topicIntro}</p>
            </div>
            <Link className={styles.textButton} href="/help/articles">
              {copy.allArticles}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.topicGrid}>
            {topics.map((topic, index) => {
              const Icon = topicIcons[index];
              const text = copy.topics[index];
              return (
                <article key={topic.id} className={styles.topicCard}>
                  <div className={styles.cardHeading}>
                    <span
                      className={`${styles.topicIcon} ${styles[`tone${index}`]}`}
                    >
                      <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <Link
                      href={topic.href}
                      aria-label={`${text.title} — ${copy.readGuide}`}
                    >
                      <ArrowUpRight size={20} aria-hidden="true" />
                    </Link>
                  </div>
                  <h3>
                    <Link href={topic.href}>{text.title}</Link>
                  </h3>
                  <p>{text.description}</p>
                  <ul>
                    {topic.links.map((href, linkIndex) => (
                      <li key={href}>
                        <Link href={href}>
                          {text.links[linkIndex]}
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
        <section className={styles.faq} aria-labelledby="help-faq-heading">
          <div className={styles.faqIntro}>
            <p className={styles.eyebrow}>{copy.faqEyebrow}</p>
            <h2 id="help-faq-heading">{copy.faqTitle}</h2>
            <p>{copy.faqIntro}</p>
            <Link className={styles.textButton} href="/faq">
              {copy.allFaq}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.faqList}>
            {copy.faqs.map((faq) => (
              <details key={faq.id} id={`faq-${faq.id}`} name="help-faq">
                <summary>
                  {faq.question}
                  <ChevronDown size={19} aria-hidden="true" />
                </summary>
                <div>
                  <p>{faq.answer}</p>
                  <Link href={faq.href}>
                    {faq.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.resources} aria-label={copy.platformTitle}>
          <article className={styles.aboutCard}>
            <span className={styles.resourceIcon}>
              <Info size={23} aria-hidden="true" />
            </span>
            <div>
              <h2>{copy.platformTitle}</h2>
              <p>{copy.platformDescription}</p>
              <Link className={styles.textButton} href="/about">
                {copy.aboutAction}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className={styles.policyCard}>
            <span className={styles.resourceIcon}>
              <ShieldCheck size={23} aria-hidden="true" />
            </span>
            <div>
              <h2>{copy.rulesTitle}</h2>
              <nav aria-label={copy.rulesTitle}>
                <Link href="/terms">
                  {copy.terms}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/privacy">
                  {copy.privacy}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/rules">
                  {copy.rules}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </nav>
            </div>
          </article>
        </section>
        <section className={styles.support}>
          <span className={styles.supportIcon}>
            <Headphones size={32} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div>
            <h2>{copy.supportTitle}</h2>
            <p>{copy.supportIntro}</p>
          </div>
          <div className={styles.supportActions}>
            <Link href="/contact">
              {copy.supportAction}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            {phone && /^\+?\d{7,15}$/.test(phone) ? (
              <a
                href={`tel:${phone}`}
                aria-label={`${copy.call}: ${supportPhone}`}
              >
                {supportPhone}
              </a>
            ) : null}
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div>
          <Link href="/">ALİSVERİS.AZ</Link>
          <span>
            © {year}. {copy.rights}
          </span>
        </div>
        <nav aria-label={copy.rulesTitle}>
          <Link href="/about">{copy.about}</Link>
          <Link href="/contact">{copy.contact}</Link>
          <Link href="/privacy">{copy.privacy}</Link>
        </nav>
      </footer>
    </div>
  );
}
