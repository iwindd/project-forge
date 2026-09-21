import { auth } from '@/auth';
import { getApplicationEntryPath } from '@/lib/application-entry';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  redirect(getApplicationEntryPath());
}
