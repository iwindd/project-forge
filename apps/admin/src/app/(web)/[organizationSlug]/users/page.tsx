import { redirect } from 'next/navigation'

export default async function LegacyOrganizationUsersPage({
  params
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  redirect(`/${encodeURIComponent(organizationSlug)}/settings/members`)
}
