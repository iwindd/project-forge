import { AuditLogsTable } from "@/admin/features/audit-log/audit-logs-table";
import { SecurityLogsTable } from "@/admin/features/security/security-logs-table";

export default function ProfileLoggingPage() {
  return (
    <>
      <AuditLogsTable scope="own" />
      <SecurityLogsTable />
    </>
  );
}
