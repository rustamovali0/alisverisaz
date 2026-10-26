import Image from "next/image";
import { ArrowRight, ShieldCheck, ShoppingBag, Store } from "lucide-react";

import { Link } from "@/i18n/navigation";

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
    <aside className="relative h-full min-h-52 overflow-hidden bg-slate-950 lg:min-h-[560px]">
      <Image
        src="/auth/auth-marketplace-panel.webp"
        alt="Alisveris marketplace auth banner"
        fill
        quality={70}
        sizes="(min-width: 1280px) 560px, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(15,23,42,0.20),rgba(15,23,42,0.92))]" />
      <div className="absolute right-6 top-6 hidden rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200 backdrop-blur-md sm:block">
        Alış-veriş daha rahat
      </div>
      <div className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto p-5 text-white sm:p-7 lg:p-9">
        <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
          <span className="h-px w-12 bg-orange-400" />
          Alisveris.az
        </div>
        <h2 className="max-w-lg text-3xl font-black leading-tight tracking-tight lg:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-5 text-white/80 sm:text-[15px]">
          {copy.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/help" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:border-orange-300 hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            <Store className="size-4" aria-hidden="true" />
            Satıcı paneli
          </Link>
          <Link href="/help" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:border-orange-300 hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Məhsul idarəetməsi
          </Link>
          <Link href="/help" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:border-orange-300 hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Təhlükəsiz giriş
          </Link>
        </div>
        <Link href="/help" className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
          Təhlükəsiz davam et
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
