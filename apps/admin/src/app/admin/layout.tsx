'use client';

import type { ReactNode } from 'react';
import { AdminLayout } from '@/src/features/admin/ui/layouts/AdminLayout';
import { useUser } from '@/src/shared/hooks/useUser';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();

  return (
    <AdminLayout user={user} isLoading={isLoading}>
      {children}
    </AdminLayout>
  );
}
