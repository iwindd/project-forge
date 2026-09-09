import { apiServerFetch } from '@/lib/api-server'
import { organizationListSchema } from '@/lib/features/organization/organization-schemas'
import type { Organization } from '@/lib/features/organization/types'

export async function getOrganizations(): Promise<Organization[] | null> {
  try {
    return await apiServerFetch('organizations', organizationListSchema)
  } catch {
    return null
  }
}
