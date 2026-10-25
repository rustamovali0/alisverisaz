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
    <aside className="relative h-full min-h-48 overflow-hidden bg-slate-950 lg:min-h-[620px]">
      <Image
        src="/auth/auth-marketplace-panel.webp"
        alt="Alisveris marketplace auth banner"
        fill
        quality={70}
        sizes="(min-width: 1280px) 560px, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />
      <div className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto p-6 text-white sm:p-8 lg:p-12">
        <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
          <span className="h-px w-12 bg-primary/80" />
          Alisveris.az
        </div>
        <h2 className="max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          {copy.title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
          {copy.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium">
            <Store className="size-4" aria-hidden="true" />
            Satıcı paneli
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Məhsul idarəetməsi
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Təhlükəsiz giriş
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
          Davam et
          <ArrowRight className="size-4" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
