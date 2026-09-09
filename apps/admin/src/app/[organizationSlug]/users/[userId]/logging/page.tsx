import { AuditLogsTable } from "@/lib/features/audit-log/audit-logs-table";
import { SecurityLogsTable } from "@/lib/features/security/security-logs-table";

export default async function UserLoggingPage({
  params,
}: Readonly<{
  params: Promise<{ userId: string }>;
}>) {
  const { userId } = await params;

  return (
    <>
      <AuditLogsTable scope="user" userId={userId} />
      <SecurityLogsTable userId={userId} />
    </>
  );
}
