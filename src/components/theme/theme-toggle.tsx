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
        "glass-panel size-11 rounded-lg border bg-card hover:bg-primary hover:text-primary-foreground md:size-[56px]",
        className,
      )}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <Sun className={cn("size-5 md:size-7", iconClassName)} aria-hidden="true" />
      ) : (
        <Moon className={cn("size-5 md:size-7", iconClassName)} aria-hidden="true" />
      )}
    </Button>
  );
}
