import { AppShell } from "@/components/AppShell";
import { PilotGuide } from "@/components/PilotGuide";
import { ProductDemo } from "@/components/ProductDemo";

export default function Dashboard() {
  return (
    <AppShell title="Dashboard" subtitle="The daily control room: launch status, response threshold, report safety, and next actions.">
      <div className="mb-5">
        <PilotGuide compact />
      </div>
      <ProductDemo />
    </AppShell>
  );
}
