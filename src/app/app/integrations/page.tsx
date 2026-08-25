import { AppShell } from "@/components/AppShell";
import { IntegrationPanel } from "@/components/IntegrationPanel";

export default function IntegrationsPage() {
  return <AppShell title="Integrations" subtitle="Operate technical connections without accessing employee sentiment."><IntegrationPanel /></AppShell>;
}
