import { auth } from "@/auth";
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/admin/login');
  }

  const organization =
    session.organizations.find(
      (candidate) => candidate.id === session.user.activeOrganizationId,
    ) ?? session.organizations[0];

  if (!organization) {
    redirect('/admin/login?error=organization_unavailable');
  }

  redirect(`/${encodeURIComponent(organization.slug)}`);
}
