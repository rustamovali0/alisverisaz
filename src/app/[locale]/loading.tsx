import { LoadingState } from "@/components/common/loading-state";
import { RootShell } from "@/components/layout/root-shell";

export default function Loading() {
  return (
    <RootShell>
      <LoadingState label="Yuklenir" />
    </RootShell>
  );
}
