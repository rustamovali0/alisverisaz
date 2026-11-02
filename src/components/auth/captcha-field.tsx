"use client";
import { useState, useEffect, useRef } from "react";
import { TurnstileField } from "./turnstile-field";
export function CaptchaField({ action }: { action: string }) {
  const [token, setToken] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      timer = setTimeout(() => setToken(""), 0);
    };
    form?.addEventListener("formdata", reset);
    return () => {
      clearTimeout(timer);
      form?.removeEventListener("formdata", reset);
    };
  }, []);
  return (
    <div ref={ref} className="col-span-full">
      <TurnstileField action={action} token={token} onTokenChange={setToken} />
    </div>
  );
}
