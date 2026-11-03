import "@/components/products/product-detail.css";

export default function Loading() {
  return (
    <main className="pdp pdp-loading" role="status">
      <span className="sr-only">Məhsul yüklənir</span>
      <div className="pdp-container">
        <div className="pdp-breadcrumb" aria-hidden />
        <div className="pdp-overview" aria-hidden>
          <div className="pdp-photo-stage"><span className="pdp-photo-skeleton" /></div>
          <div className="pdp-information space-y-4">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-12 w-4/5 rounded bg-muted" />
            <div className="h-9 w-1/3 rounded bg-muted" />
            <div className="h-12 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
