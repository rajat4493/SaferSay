import { AppShell } from "@/components/AppShell";
import { ProductDemo } from "@/components/ProductDemo";

export default function Dashboard() {
  return (
    <AppShell title="Dashboard" subtitle="The daily control room: launch status, response threshold, report safety, and next actions.">
      <ProductDemo />
    </AppShell>
  );
}
