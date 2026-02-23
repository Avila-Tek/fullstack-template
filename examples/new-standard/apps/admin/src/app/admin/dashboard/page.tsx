'use client';

import { AdminDashboardPage } from '@/src/features/admin/ui/pages/AdminDashboardPage';
import { useUser } from '@/src/shared/hooks/useUser';

export default function AdminDashboardRoute() {
  const { user } = useUser();

  return <AdminDashboardPage user={user} />;
}
