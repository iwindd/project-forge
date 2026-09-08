import { getPath } from "@/admin/routes";
import { redirect } from "next/navigation";

export default async function OrganizationIndexPage({
  params,
}: Readonly<{
  params: Promise<{ organizationSlug: string }>;
}>) {
  const { organizationSlug } = await params;
  redirect(getPath("system.users", { organizationSlug }));
}
