"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";
type ThemeToggleProps = {
  className?: string;
  iconClassName?: string;
};

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("alisveris-theme");

  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("alisveris-theme", theme);
}

export function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);

      return next;
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-11 rounded-xl border border-slate-200 bg-white text-slate-950 shadow-none transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-blue-300",
        className,
      )}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className={cn("size-7 md:size-8", iconClassName)} aria-hidden="true" />
      ) : (
        <Moon className={cn("size-7 md:size-8", iconClassName)} aria-hidden="true" />
      )}
    </Button>
  );
}
