"use client";

import { ArrowUpRight, Instagram, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { SiteFooterProps } from "@/components/layout/site-footer";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";

export function RtestSiteFooter({ siteName = "Alışveriş", socialLinks }: SiteFooterProps) {
  const { profile } = useClientAuthProfileState();
  const account = profile.status === "authenticated" ? profile.role === "seller" ? "/store/dashboard" : "/dashboard" : "/login";
  const groups = [
    { title: "Kəşf et", links: [["Məhsullar", "/products"], ["Mağazalar", "/stores"], ["Kateqoriyalar", "/categories"]] },
    { title: "Hesabın", links: [["Hesabım", account], ["Seçilmişlər", "/favorites"], ["Səbət", "/cart"], ["Satıcı ol", "/register?role=seller"]] },
    { title: "Buradayıq", links: [["Haqqımızda", "/about"], ["Yardım", "/help"], ["Əlaqə", "/contact"], ["Suallar və cavablar", "/faq"]] },
  ];
  const instagram = socialLinks?.instagram?.trim();
  const whatsapp = socialLinks?.whatsapp?.trim();
  return <footer className="atelier-footer"><div className="atelier-container"><div className="atelier-footer-main"><div className="atelier-footer-brand"><Link href="/" className="atelier-brand"><ShoppingBag size={28} strokeWidth={1.5} aria-hidden="true" /><span>{siteName}<span className="atelier-domain">.az</span></span></Link><p>Seçim səndən.<br />Alışveriş bir yerdə.</p><div className="atelier-footer-socials">{instagram ? <a href={/^https?:\/\//.test(instagram) ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" title="Instagram" aria-label="Instagram"><Instagram size={19} aria-hidden="true" /></a> : null}{whatsapp ? <a href={/^https?:\/\//.test(whatsapp) ? whatsapp : `https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp"><WhatsAppIcon className="size-[19px]" /></a> : null}</div></div>{groups.map(group => <nav aria-label={group.title} key={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link key={href} href={href}>{label}<ArrowUpRight size={12} aria-hidden="true" /></Link>)}</nav>)}</div><div className="atelier-footer-bottom"><span>© {new Date().getFullYear()} {siteName}</span><div><Link href="/terms">İstifadə şərtləri</Link><Link href="/privacy">Məxfilik</Link><Link href="/rules">Qaydalar</Link></div><span>Azərbaycan üçün.</span></div></div></footer>;
}
