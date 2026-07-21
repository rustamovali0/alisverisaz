import { ErrorState } from "@/components/common/error-state";
import { RootShell } from "@/components/layout/root-shell";

export default function NotFound() {
  return (
    <RootShell>
      <ErrorState
        title="Sehife tapilmadi"
        description="Axtardiginiz sehife movcud deyil."
        actionLabel="Ana sehifeye qayit"
      />
    </RootShell>
  );
}
