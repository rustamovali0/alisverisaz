"use client";

import { useState } from "react";

import { formatAzerbaijanPhoneLocal } from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  name: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
};

export function PhoneInput({
  name,
  required,
  defaultValue = "",
  className,
}: PhoneInputProps) {
  const [value, setValue] = useState(formatAzerbaijanPhoneLocal(defaultValue));

  return (
    <div
      className={cn(
        "flex h-10 overflow-hidden rounded-md border border-input bg-background text-sm outline-none focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <span className="flex items-center border-r bg-muted px-3 font-medium text-muted-foreground">
        +994
      </span>
      <input
        name={name}
        value={value}
        onChange={(event) => setValue(formatAzerbaijanPhoneLocal(event.target.value))}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="77 666 44 33"
        className="min-w-0 flex-1 bg-transparent px-3 outline-none"
        required={required}
      />
    </div>
  );
}
