import { getPath } from "@/admin/routes";
import { redirect } from "next/navigation";

export default async function UserDetailRedirectPage({
  params,
}: Readonly<{
  params: Promise<{ organizationSlug: string; userId: string }>;
}>) {
  const { organizationSlug, userId } = await params;
  redirect(getPath("system.users.profile", { organizationSlug, userId }));
}
