import { EmptyState } from "@/components/common/empty-state";
import { RootShell } from "@/components/layout/root-shell";

export default function HomePage() {
  return (
    <RootShell>
      <EmptyState
        title="alisveris.az"
        description="Marketplace SaaS platformasi ucun baza layihə strukturu hazirdir."
      />
    </RootShell>
  );
}
