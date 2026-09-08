import { redirect } from "next/navigation";

export default function ProfileLoggingPage() {
  redirect("/account/activity");
}
