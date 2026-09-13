import type { Organization } from './features/organization/types';

export function getApplicationEntryPath(organizations: readonly Pick<Organization, 'slug'>[]) {
  const firstOrganization = organizations[0];

  return firstOrganization ? `/${encodeURIComponent(firstOrganization.slug)}` : '/account';
}
