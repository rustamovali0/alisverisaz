import { Mail, MessageCircle, Phone } from "lucide-react";

import type { AdminSupportMessage } from "@/lib/support/data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SupportMessageList({
  messages,
}: {
  messages: AdminSupportMessage[];
}) {
  if (!messages.length) {
    return (
      <div className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
        Dəstək mesajı yoxdur.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <article key={message.id} className="rounded-md border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{message.subject}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(message.createdAt)} · {message.status}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Dəstək
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
            {message.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {message.fullName ? (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-3.5" />
                {message.fullName}
              </span>
            ) : null}
            {message.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" />
                {message.email}
              </span>
            ) : null}
            {message.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {message.phone}
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
