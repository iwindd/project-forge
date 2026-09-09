import { AdminShell } from "@/components/admin-shell";
import { auth } from "@/auth";
import { scopeUserToOrganization } from "@/session";
import { getOrganizations } from "@/servers/organization/queries/get-organizations";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const organizations = await getOrganizations();

  if (!organizations) {
    redirect("/admin/login?error=organization_unavailable");
  }

  const organization = organizations[0];

  if (!organization) {
    redirect("/admin/login?error=organization_unavailable");
  }

  return (
    <AdminShell
      user={scopeUserToOrganization(session.user, organization)}
      organizationSlug={organization.slug}
      organizationId={organization.id}
      navigationMode="admin"
    >
      {children}
    </AdminShell>
  );
}
