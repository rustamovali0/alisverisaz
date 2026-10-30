import {
  ArrowLeft,
  ArrowUpRight,
  Headphones,
  Mail,
  Phone,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SupportMessageForm } from "@/components/support/support-message-form";
import { getHelpCenterCopy } from "./help-center-copy";
import shared from "./help-center.module.css";
import styles from "./contact-page.module.css";

type Props = {
  locale: string;
  phone?: string;
  email?: string;
  isAuthenticated: boolean;
  name?: string;
  userEmail?: string;
  userPhone?: string;
};
export function ContactSupportPage({
  locale,
  phone,
  email,
  isAuthenticated,
  name,
  userEmail,
  userPhone,
}: Props) {
  const copy = getHelpCenterCopy(locale);
  const number = phone?.replace(/[^+\d]/g, "");
  return (
    <div className={shared.root}>
      <main className={shared.main}>
        <nav className={shared.nav} aria-label={copy.contact}>
          <Link href="/help" className={styles.back}>
            <ArrowLeft size={17} />
            {copy.center}
          </Link>
          <div className={shared.navLinks}>
            <Link href="/about">
              {copy.about}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
        <header className={styles.hero}>
          <span>
            <Headphones size={28} />
          </span>
          <div>
            <p>{copy.contact}</p>
            <h1>Danışaq, həllini tapaq.</h1>
            <div>
              Sualınız, təklifiniz və ya qarşılaşdığınız problem var? Sizə kömək
              etmək üçün buradayıq.
            </div>
          </div>
        </header>
        <div className={styles.layout}>
          <section className={styles.form} aria-label="Müraciət forması">
            <SupportMessageForm
              isAuthenticated={isAuthenticated}
              defaultFullName={name}
              defaultEmail={userEmail}
              defaultPhone={userPhone}
            />
            <p className={styles.note}>
              Müraciətinizdə varsa sifariş nömrəsini və problemin qısa təsvirini
              qeyd edin.
            </p>
          </section>
          <aside className={styles.aside}>
            <section className={styles.card}>
              <h2>Birbaşa əlaqə</h2>
              <p>Sizə uyğun əlaqə vasitəsini seçin.</p>
              {number && /^\+?\d{7,15}$/.test(number) ? (
                <a href={`tel:${number}`}>
                  <span>
                    <Phone size={20} />
                  </span>
                  <div>
                    <small>Telefon</small>
                    <strong>{phone}</strong>
                  </div>
                  <ArrowUpRight size={17} />
                </a>
              ) : null}
              {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                <a href={`mailto:${email}`}>
                  <span>
                    <Mail size={20} />
                  </span>
                  <div>
                    <small>E-poçt</small>
                    <strong>{email}</strong>
                  </div>
                  <ArrowUpRight size={17} />
                </a>
              ) : null}
            </section>
            <section className={styles.help}>
              <BookOpen size={25} />
              <h2>Cavab bir klik uzaqda ola bilər.</h2>
              <p>Hesab, sifariş və mağaza ilə bağlı qısa təlimatlara baxın.</p>
              <Link href="/help">
                {copy.center}
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/faq">
                Tez-tez verilən suallar
                <ArrowUpRight size={17} />
              </Link>
            </section>
            <div className={styles.response}>
              <MessageCircle size={20} />
              <p>
                Müraciətlər mövzusuna görə nəzərdən keçirilir. Hesabla bağlı
                müraciətlərdə qeydiyyat e-poçtunuzu yazın.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <footer className={shared.footer}>
        <div>
          <Link href="/">ALİSVERİS.AZ</Link>
          <span>
            © {new Date().getFullYear()}. {copy.rights}
          </span>
        </div>
        <nav aria-label={copy.rulesTitle}>
          <Link href="/help">{copy.center}</Link>
          <Link href="/terms">{copy.terms}</Link>
          <Link href="/privacy">{copy.privacy}</Link>
        </nav>
      </footer>
    </div>
  );
}
