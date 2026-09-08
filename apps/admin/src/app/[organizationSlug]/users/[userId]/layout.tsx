import { getUserDetail } from "@/servers/user/queries/get-user-detail";
import { notFound } from "next/navigation";
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
  const { userId } = await params;
  const user = await getUserDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <UserProvider key={user.id} user={user}>
      <UserDetailShell>{children}</UserDetailShell>
    </UserProvider>
  );
}
