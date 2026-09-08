import { AuditLogsTable } from "@/admin/features/audit-log/audit-logs-table";
import { SecurityLogsTable } from "@/admin/features/security/security-logs-table";

export default function AccountActivityPage() {
  return (
    <>
      <AuditLogsTable scope="own" />
      <SecurityLogsTable />
    </>
  );
}
