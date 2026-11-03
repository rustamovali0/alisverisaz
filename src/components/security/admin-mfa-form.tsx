"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enrollAdminMfa, verifyAdminMfa } from "@/lib/security/mfa-actions";
export function AdminMfaForm({
  factors,
}: {
  factors: { id: string; label: string }[];
}) {
  const [factor, setFactor] = useState(factors[0]?.id || ""),
    [qr, setQr] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState("");
  const [pending, start] = useTransition(),
    router = useRouter();
  return (
    <div className="grid gap-4">
      {factors.length > 0 ? (
        <label>
          Authenticator
          <select
            className="block min-h-11 w-full rounded border px-3"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          >
            {factors.map((f) => (
              <option value={f.id} key={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                const result = await enrollAdminMfa();
                setFactor(result.id);
                setQr(result.qr);
              } catch {
                setMessage("Authenticator qurula bilmədi.");
              }
            })
          }
        >
          Authenticator əlavə et
        </Button>
      )}
      {qr && (
        <>
          <p>
            QR kodunu Authenticator tətbiqinizdə oxudun. Bu səhifəni
            paylaşmayın.
          </p>
          <img
            src={qr}
            alt="Authenticator quraşdırma QR kodu"
            width={220}
            height={220}
          />
        </>
      )}
      {factor && (
        <form
          className="grid gap-3"
          action={() =>
            start(async () => {
              try {
                const result = await verifyAdminMfa(factor, code);
                setMessage(result.message);
                setCode("");
                if (result.ok) {
                  router.replace("/radmin/panel");
                  router.refresh();
                }
              } catch {
                setMessage("Təsdiqləmə alınmadı. Yenidən yoxlayın.");
              }
            })
          }
        >
          <label>
            Təsdiq kodu
            <input
              className="block min-h-11 w-full rounded border px-3"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <Button disabled={pending}>Təsdiqlə</Button>
        </form>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
