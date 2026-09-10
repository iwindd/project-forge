import { auth } from "@/auth";
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/admin/login');
  }

  redirect('/account');
}
