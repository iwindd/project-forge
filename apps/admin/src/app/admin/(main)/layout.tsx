import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMainLayout() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  redirect("/account");
}
