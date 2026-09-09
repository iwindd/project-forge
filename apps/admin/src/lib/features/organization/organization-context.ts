import type { Organization } from './types'

export function addOrganizationHeader(
  headers: Headers,
  organizationId?: string | null
) {
  if (organizationId) headers.set('X-Organization-Id', organizationId)
  return headers
}

export function resolveOrganizationFromRoute(
  organizations: Organization[],
  organizationSlug: string,
  organizationId: string
) {
  return organizations.find(
    organization =>
      organization.slug === organizationSlug &&
      organization.id === organizationId
  )
}
