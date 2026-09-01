"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  toggleClassName?: string;
};

export function PasswordInput({
  id,
  name,
  label,
  value,
  onValueChange,
  hint,
  error,
  required,
  autoComplete,
  minLength,
  placeholder,
  className,
  inputClassName,
  toggleClassName,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className={cn("grid gap-1.5 text-sm font-medium", className)} htmlFor={id}>
      <span>{label}</span>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          required={required}
          className={cn(
            "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3.5 pr-11 text-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500",
            inputClassName,
          )}
        />
        <button
          type="button"
          className={cn(
            "absolute right-2 top-1/2 z-10 inline-grid size-9 shrink-0 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-slate-500 shadow-none transition-colors hover:bg-transparent hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-300 dark:hover:text-blue-300",
            toggleClassName,
          )}
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Şifrəni gizlət" : "Şifrəni göstər"}
        >
          {isVisible ? (
            <EyeOff className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
          ) : (
            <Eye className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}
