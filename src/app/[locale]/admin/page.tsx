import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getAdminActivityOverview } from "@/lib/activity/data";
import { requireRole } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";
const metricPaths = ["users", "stores", "products", "orders", "subscriptions"];
const shortcuts = [
  ["Məhsulları idarə et", "products"],
  ["Sifarişlərə bax", "orders"],
  ["Mağazaları idarə et", "stores"],
  ["İstifadəçilərə bax", "users"],
  ["E-poçt mərkəzini aç", "email"],
  ["Təhlükəsizlik ayarları", "danger"],
];

export default async function AdminPage() {
  await requireRole(["admin"], "/radmin/panel");
  const [overview, activity] = await Promise.all([
    getAdminOverview(),
    getAdminActivityOverview(),
  ]);
  return (
    <>
      <div className="ra-welcome">
        <h2>Platformanı bir yerdən idarə edin</h2>
        <p>
          Əsas göstəricilər, son fəaliyyətlər və tez istifadə olunan bölmələr.
        </p>
      </div>
      <div className="ra-metrics">
        {overview.stats.map((item, index) => (
          <Link
            key={item.label}
            href={`/radmin/${metricPaths[index]}`}
            className="ra-metric"
          >
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>Bölməyə keç ↗</span>
          </Link>
        ))}
      </div>
      <div className="ra-overview-columns">
        <section
          className="ra-overview-panel"
          aria-labelledby="ra-activity-title"
        >
          <h2 id="ra-activity-title">Platformada fəaliyyət</h2>
          {activity.stats.slice(0, 8).map((item) => (
            <div key={item.label} className="ra-activity-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <Link href="/radmin/activity" className="ra-text-link">
            Bütün fəaliyyətlərə bax →
          </Link>
        </section>
        <section
          className="ra-overview-panel"
          aria-labelledby="ra-shortcuts-title"
        >
          <h2 id="ra-shortcuts-title">Sürətli keçidlər</h2>
          {shortcuts.map(([title, path]) => (
            <Link key={path} href={`/radmin/${path}`} className="ra-quick-link">
              <span>{title}</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
