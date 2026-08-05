import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { TenantDetailPanel } from "@/components/console/TenantDetailPanel";

export default async function ConsoleTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <OwnerConsoleShell>
      <TenantDetailPanel tenantId={id} />
    </OwnerConsoleShell>
  );
}
