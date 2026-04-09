'use client';

import type { User } from '@repo/auth';
import { useTranslations } from 'next-intl';

interface AdminDashboardPageProps {
  user: User | null | undefined;
}

export function AdminDashboardPage({
  user,
}: Readonly<AdminDashboardPageProps>) {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.welcome')} {user?.firstName || user?.email}
        </p>
      </div>
    </div>
  );
}
