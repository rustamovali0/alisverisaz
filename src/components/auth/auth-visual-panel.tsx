import Image from "next/image";
import { ArrowRight, ShieldCheck, ShoppingBag, Store } from "lucide-react";

type AuthVisualPanelProps = {
  variant?: "login" | "register" | "admin";
};

const visualCopy = {
  login: {
    title: "Alış-veriş dünyasına qoşul",
    description:
      "Minlərlə məhsulu kəşf et, öz mağazanı yarat və alıcılarla birbaşa əlaqə saxla.",
  },
  register: {
    title: "Mağazanı bu gün yarat",
    description:
      "Məhsullarını əlavə et, mağazanı idarə et və yeni müştərilərə çat.",
  },
  admin: {
    title: "Marketplace-i idarə et",
    description:
      "Satıcıları, məhsulları və əməliyyatları vahid RAdmin panelindən izləyin.",
  },
} satisfies Record<NonNullable<AuthVisualPanelProps["variant"]>, { title: string; description: string }>;

export function AuthVisualPanel({ variant = "login" }: AuthVisualPanelProps) {
  const copy = visualCopy[variant];

  return (
    <aside className="sticky top-6 hidden h-[min(680px,calc(100vh-3rem))] min-h-[520px] overflow-hidden rounded-xl border border-border/70 bg-slate-950 lg:block">
      <Image
        src="/auth/auth-banner.png"
        alt="Alisveris marketplace auth banner"
        fill
        quality={70}
        sizes="(min-width: 1280px) 560px, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-white xl:p-8">
        <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          <span className="h-px w-12 bg-primary/80" />
          Alisveris.az
        </div>
        <h2 className="max-w-lg text-[2rem] font-black leading-tight tracking-tight sm:text-[2.4rem]">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/80">
          {copy.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
            <Store className="size-4" aria-hidden="true" />
            Satıcı paneli
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Məhsul idarəetməsi
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Təhlükəsiz giriş
          </div>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
          Davam et
          <ArrowRight className="size-4" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
