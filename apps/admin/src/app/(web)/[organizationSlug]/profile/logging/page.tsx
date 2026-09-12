import { redirect } from 'next/navigation'

export default async function LegacyOrganizationProfileActivityPage({
  params
}: {
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  redirect(`/${encodeURIComponent(organizationSlug)}/audit-logs`)
}
