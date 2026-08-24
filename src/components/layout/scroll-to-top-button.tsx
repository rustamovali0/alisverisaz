"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 260);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      type="button"
      className={cn(
        "fixed right-4 z-40 grid size-11 place-items-center rounded-full bg-transparent text-foreground transition duration-200 hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:right-6",
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6",
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Yuxarı qayıt"
      title="Yuxarı qayıt"
    >
      <ChevronUp className="size-8 stroke-[2.4]" aria-hidden="true" />
    </button>
  );
}
