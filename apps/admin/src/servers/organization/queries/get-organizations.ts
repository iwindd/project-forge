import { apiServerFetch } from '@/lib/api-server';
import { organizationListSchema } from '@/lib/features/organization/organization-schemas';
import type { Organization } from '@/lib/features/organization/types';

export async function getOrganizations(): Promise<Organization[]> {
  return apiServerFetch('organizations', organizationListSchema);
}
