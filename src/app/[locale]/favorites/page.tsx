import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function PublicFavoritesPage() {
  await requireUser("/favorites");

  return (
    <main className="min-h-screen bg-background">
      <div className="container grid min-h-[70vh] place-items-center py-10">
        <section className="w-full max-w-xl rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
            <Heart className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-normal">Seçilmişlər</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Seçilmiş məhsullar üçün public səhifə hazırdır. Məhsul favorit sistemi
            aktivləşdirildikdə seçdiyiniz məhsullar burada görünəcək.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">Mağazalara bax</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
