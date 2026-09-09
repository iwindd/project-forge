import { auth } from '@/auth'
import { getOrganizations } from "@/servers/organization/queries/get-organizations";
import { getUserDetail } from "@/servers/user/queries/get-user-detail";
import { notFound, redirect } from "next/navigation";
import { UserProvider } from "@/app/admin/(main)/users/[userId]/components/user-context";
import { UserDetailShell } from "@/app/admin/(main)/users/[userId]/components/user-detail-shell";

export const dynamic = "force-dynamic";

export default async function UserLayout({
  params,
  children,
}: Readonly<{
  params: Promise<{ organizationSlug: string; userId: string }>;
  children: React.ReactNode;
}>) {
  const { organizationSlug, userId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  const organizations = await getOrganizations();
  const organization = organizations?.find(
    candidate => candidate.slug === organizationSlug
  );

  if (!organization) {
    notFound();
  }

  const user = await getUserDetail(userId, organization.id);

  if (!user) {
    notFound();
  }

  return (
    <UserProvider key={user.id} user={user}>
      <UserDetailShell>{children}</UserDetailShell>
    </UserProvider>
  );
}
