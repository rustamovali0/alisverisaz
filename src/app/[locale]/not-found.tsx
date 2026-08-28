import { ErrorState } from "@/components/common/error-state";
import { RootShell } from "@/components/layout/root-shell";

export default function NotFound() {
  return (
    <RootShell>
      <ErrorState
        title="Nə isə səhv getdi"
        description="Axtardığınız səhifə mövcud deyil."
        actionLabel="Ana səhifəyə qayıt"
      />
    </RootShell>
  );
}
