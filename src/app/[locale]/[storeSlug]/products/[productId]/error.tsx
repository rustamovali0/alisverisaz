"use client";

export default function ProductError({ reset }: { reset: () => void }) {
  return (
    <main className="pdp">
      <div className="pdp-container">
        <section className="pdp-section" role="alert">
          <h2>Məhsul məlumatları yüklənmədi</h2>
          <p>Bir az sonra yenidən cəhd edin.</p>
          <button type="button" className="pdp-secondary-action" onClick={reset}>Yenidən cəhd et</button>
        </section>
      </div>
    </main>
  );
}
