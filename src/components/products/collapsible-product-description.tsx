"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type CollapsibleProductDescriptionProps = {
  text: string;
};

function FormattedDescription({ text }: { text: string }) {
  return (
    <div className="grid gap-1.5 break-words text-[13px] leading-5 text-slate-600 dark:text-slate-300 sm:gap-2.5 sm:text-[15px] sm:leading-7">
      {text.split(/\r?\n/).map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <span key={index} className="h-0.5 sm:h-1" aria-hidden="true" />;
        if (line.startsWith("## ")) {
          return <h2 key={index} className="mt-0.5 text-sm font-bold leading-5 text-slate-950 dark:text-slate-100 sm:mt-1 sm:text-lg sm:leading-6">{line.slice(3)}</h2>;
        }
        if (line.startsWith("• ") || line.startsWith("- ")) {
          return <p key={index} className="flex gap-2"><span className="font-bold text-orange-500">•</span><span>{line.slice(2)}</span></p>;
        }
        const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
        if (numbered) {
          return <p key={index} className="flex gap-2"><span className="font-semibold text-orange-500">{numbered[1]}.</span><span>{numbered[2]}</span></p>;
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export function CollapsibleProductDescription({ text }: CollapsibleProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = text.length > 240 || text.split(/\r?\n/).filter(Boolean).length > 5;

  return (
    <div>
      <div className={shouldCollapse && !expanded ? "relative max-h-32 overflow-hidden sm:max-h-36" : undefined}>
        <FormattedDescription text={text} />
        {shouldCollapse && !expanded ? (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90"
            aria-hidden="true"
          />
        ) : null}
      </div>
      {shouldCollapse ? (
        <button
          type="button"
          className="mt-1.5 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Daha az" : "Daha çox"}
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
