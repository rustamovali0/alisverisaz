"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
            "h-10 w-full rounded-xl border border-input bg-background px-3.5 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
            inputClassName,
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-1/2 z-10 size-8 -translate-y-1/2 rounded-lg bg-background/80 text-foreground shadow-sm hover:bg-primary/10 hover:text-primary",
            toggleClassName,
          )}
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Şifrəni gizlət" : "Şifrəni göstər"}
        >
          {isVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </Button>
      </div>
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}
