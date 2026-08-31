"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { MessageCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateWhatsAppOrderTemplateAction } from "@/lib/whatsapp-orders/actions";
import {
  WHATSAPP_ORDER_PLACEHOLDERS,
  createSampleWhatsAppTemplateValues,
  renderWhatsAppOrderTemplate,
} from "@/lib/whatsapp-orders/template";

type WhatsAppOrderTemplateManagerProps = {
  template: string;
};

export function WhatsAppOrderTemplateManager({
  template,
}: WhatsAppOrderTemplateManagerProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(template);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(
    () =>
      renderWhatsAppOrderTemplate(value, createSampleWhatsAppTemplateValues(), {
        promo: true,
      }),
    [value],
  );

  function insertPlaceholder(placeholder: string) {
    const token = `{{${placeholder}}}`;
    const textarea = textareaRef.current;

    if (!textarea) {
      setValue((current) => `${current}${current ? "\n" : ""}${token}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`;

    setValue(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateWhatsAppOrderTemplateAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Şablon saxlanmadı");
        return;
      }

      void appAlert.success("Şablon saxlandı", result.message);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <form action={submit} className="grid gap-4 rounded-lg border bg-card p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <MessageCircle className="size-5" aria-hidden="true" />
            WhatsApp sifariş şablonu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu şablon checkout nəticəsində WhatsApp seller-lər üçün istifadə olunur.
          </p>
        </div>
        <textarea
          ref={textareaRef}
          name="template"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-[360px] rounded-lg border bg-background px-3 py-2 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        <Button type="submit" className="w-fit" disabled={isPending}>
          <Save className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Saxlanılır" : "Yadda saxla"}
        </Button>
      </form>

      <div className="grid gap-4">
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-black">Placeholder-lar</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {WHATSAPP_ORDER_PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-bold transition hover:border-primary hover:bg-primary/10"
                onClick={() => insertPlaceholder(placeholder)}
              >
                {`{{${placeholder}}}`}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-black">Önizləmə</h3>
          <pre className="mt-3 min-h-[260px] whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm leading-6 text-foreground">
            {preview}
          </pre>
        </section>
      </div>
    </div>
  );
}
