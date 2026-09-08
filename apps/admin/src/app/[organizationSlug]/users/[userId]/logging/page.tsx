import { AuditLogsTable } from "@/admin/features/audit-log/audit-logs-table";
import { SecurityLogsTable } from "@/admin/features/security/security-logs-table";

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
