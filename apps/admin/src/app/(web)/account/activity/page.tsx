import { AuditLogsTable } from '@/lib/features/audit-log/audit-logs-table';
import { SecurityLogsTable } from '@/lib/features/security/security-logs-table';

export default function AccountActivityPage() {
  return (
    <>
      <AuditLogsTable scope='own' />
      <SecurityLogsTable />
    </>
  );
}
