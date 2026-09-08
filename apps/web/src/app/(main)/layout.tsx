import { AdminShell } from '@/admin/components/admin-shell';

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
