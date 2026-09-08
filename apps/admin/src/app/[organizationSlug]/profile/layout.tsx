import { notFound } from "next/navigation";
import { getProfile } from "@/servers/profile/queries/get-profile";
import { ProfileProvider } from "@/app/admin/(main)/profile/components/profile-context";
import { ProfileShell } from "@/app/admin/(main)/profile/components/profile-shell";

export const dynamic = "force-dynamic";

export default async function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();

  if (!profile) {
    notFound();
  }

  return (
    <ProfileProvider profile={profile}>
      <ProfileShell>{children}</ProfileShell>
    </ProfileProvider>
  );
}
