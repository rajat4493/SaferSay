import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/server/authSession";
import { canAccessPeople } from "@/lib/permissions";

export default async function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  // Verify user is authenticated
  if (!session) {
    redirect("/login");
  }

  // Gate People zone to customer_admin and survey_creator
  if (!canAccessPeople(session.role)) {
    redirect("/app");
  }

  return children;
}
