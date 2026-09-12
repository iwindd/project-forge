import { auth } from "@/auth";
import { getApplicationEntryPath } from '@/lib/application-entry'
import { getOrganizations } from '@/servers/organization/queries/get-organizations'
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const organizations = await getOrganizations()
  redirect(getApplicationEntryPath(organizations))
}
