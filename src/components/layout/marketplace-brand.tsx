import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
export function MarketplaceBrand({
  href = "/",
  logoUrl,
  siteName = "alışveriş",
  showDomain = true,
}: {
  href?: string;
  logoUrl?: string;
  siteName?: string;
  showDomain?: boolean;
}) {
  const isMarketplace = /al[ıi]ş?ver[iı]ş?/i.test(siteName);
  const name = isMarketplace ? "ALİSVERİS" : siteName;
  return (
    <Link
      href={href}
      className="live-brand"
      aria-label={`${siteName} — ana səhifə`}
    >
      <span className="live-brand-symbol">
        {logoUrl ? <img src={logoUrl} alt="" /> : <ShoppingBag size={25} />}
      </span>
      <span>
        {name.replace(/\.az$/i, "")}
        {showDomain && (
          <span className="live-brand-domain">
            {isMarketplace ? ".AZ" : ".az"}
          </span>
        )}
      </span>
    </Link>
  );
}
