"use client";

import { useState } from "react";

import { formatAzerbaijanPhoneLocal } from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  name: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function PhoneInput({
  name,
  required,
  defaultValue = "",
  value: controlledValue,
  onValueChange,
  className,
}: PhoneInputProps) {
  const [internalValue, setInternalValue] = useState(formatAzerbaijanPhoneLocal(defaultValue));
  const displayValue = controlledValue ?? internalValue;

  return (
    <div
      className={cn(
        "flex h-11 overflow-hidden rounded-xl border border-input bg-background text-sm outline-none focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <span className="flex items-center border-r bg-muted px-3 font-medium text-muted-foreground">
        +994
      </span>
      <input
        name={name}
        value={displayValue}
        onChange={(event) => {
          const next = formatAzerbaijanPhoneLocal(event.target.value);
          setInternalValue(next);
          onValueChange?.(next);
        }}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="77 666 44 33"
        className="min-w-0 flex-1 bg-transparent px-3 outline-none"
        required={required}
      />
    </div>
  );
}
