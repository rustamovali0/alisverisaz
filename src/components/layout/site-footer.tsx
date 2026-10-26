"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Headphones,
  Leaf,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { MarketplaceBrand } from "@/components/layout/marketplace-brand";
import {
  InstagramBrandIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons/social-icons";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import { Link } from "@/i18n/navigation";
type SiteFooterProps = {
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  description?: string;
  socialLinks?: { instagram?: string; tiktok?: string; whatsapp?: string };
};
function socialHref(kind: string, value?: string) {
  if (!value?.trim()) return "";
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return text;
  return kind === "whatsapp"
    ? `https://wa.me/${text.replace(/\D/g, "")}`
    : kind === "instagram"
      ? `https://instagram.com/${text.replace(/^@/, "")}`
      : `https://tiktok.com/@${text.replace(/^@/, "")}`;
}
export function SiteFooter({
  siteName = "alışveriş",
  logoUrl,
  socialLinks,
}: SiteFooterProps) {
  const { profile } = useClientAuthProfileState();
  const role = profile.status === "authenticated" ? profile.role : null;
  const accountHref =
    role === "seller"
      ? "/store/dashboard"
      : role === "admin"
        ? "/radmin"
        : "/dashboard";
  const socials = [
    {
      label: "Instagram",
      href: socialHref("instagram", socialLinks?.instagram),
      Icon: InstagramBrandIcon,
    },
    {
      label: "TikTok",
      href: socialHref("tiktok", socialLinks?.tiktok),
      Icon: TikTokIcon,
    },
    {
      label: "WhatsApp",
      href: socialHref("whatsapp", socialLinks?.whatsapp),
      Icon: WhatsAppIcon,
    },
  ].filter((s) => s.href);
  const groups = [
    {
      title: "Kəşf edin",
      links: [
        ["Bütün məhsullar", "/products"],
        ["Mağazalar", "/stores"],
        ["Endirimlər", "/products?discount=true"],
        ["İcarə məhsulları", "/products?commerceType=rental"],
      ],
    },
    {
      title: "Alıcılar üçün",
      links: [
        ["Sifarişlərim", "/dashboard/orders"],
        ["Şəxsi kabinet", accountHref],
        ["Sevimlilər", "/favorites"],
        ["Yardım mərkəzi", "/help"],
      ],
    },
    {
      title: "Satıcılar üçün",
      links: [
        ["Satıcı olun", "/register?role=seller"],
        ["Satıcı paneli", "/store/dashboard"],
        ["VIP xidmətləri", "/store/dashboard/promotions"],
        ["Əməkdaşlıq", "/contact"],
      ],
    },
  ];
  return (
    <>
      <section className="live-discovery-band">
        <div className="live-wrap">
          <span className="live-discovery-icon">
            <Leaf size={29} />
          </span>
          <div>
            <h2>Yeni tapıntınız bir klik uzaqda.</h2>
            <p>Mağazaların məhsullarını və yeni təkliflərini kəşf edin.</p>
          </div>
          <Link href="/products" className="live-btn">
            Kəşf etməyə davam et
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <footer className="live-footer">
        <div className="live-wrap">
          <div className="live-footer-grid">
            <div className="live-footer-brand">
              <MarketplaceBrand siteName={siteName} logoUrl={logoUrl} />
              <p>
                Sevdiyiniz məhsullar, etibarlı mağazalar.
                <br />
                Azərbaycanın alış-veriş məkanı.
              </p>
              <div className="live-socials">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>
            {groups.map((g) => (
              <div className="live-footer-links" key={g.title}>
                <h2>{g.title}</h2>
                {g.links.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="live-footer-contact">
              <h2>Bizimlə əlaqə</h2>
              <Link href="/contact">
                <Headphones size={18} />
                Dəstək mərkəzi
                <ArrowUpRight size={14} />
              </Link>
              <p>
                <ShieldCheck size={15} />
                Hər alış-verişdə yanınızdayıq
              </p>
              <span>🇦🇿 Azərbaycanda, sizin üçün.</span>
            </div>
          </div>
          <div className="live-footer-bottom">
            <span>
              © {new Date().getFullYear()} ALISVERIS.AZ. Bütün hüquqlar qorunur.
            </span>
            <div>
              <Link href="/terms">İstifadəçi razılaşması</Link>
              <Link href="/privacy">Məxfilik siyasəti</Link>
              <span>AZN ₼</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
