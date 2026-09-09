import { AdminShell } from "@/components/admin-shell";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const organization =
    session.organizations.find(
      (candidate) => candidate.id === session.user.activeOrganizationId,
    ) ?? session.organizations[0];

  if (!organization) {
    redirect("/admin/login?error=organization_unavailable");
  }

  return (
    <AdminShell
      user={session.user}
      organizationSlug={organization.slug}
      navigationMode="admin-root"
    >
      {children}
    </AdminShell>
  );
}
