import { WhatsAppIcon } from "@/components/icons/social-icons";
import { toWhatsAppPhone } from "@/lib/whatsapp-orders/template";

export function StoreWhatsAppButton({ phone }: { phone?: string | null }) {
  const number = toWhatsAppPhone(phone);
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="absolute right-2 top-2 z-20 inline-flex size-11 items-center justify-center gap-2 rounded-lg border border-white/30 bg-[#25D366] text-sm font-semibold text-slate-950 shadow-md transition hover:bg-[#20BD5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4 sm:w-auto sm:px-3 sm:py-2"
    >
      <WhatsAppIcon className="size-6 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
