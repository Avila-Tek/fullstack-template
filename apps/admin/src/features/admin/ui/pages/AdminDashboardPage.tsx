'use client';

import type { User } from '@repo/auth';

interface AdminDashboardPageProps {
  user: User | null | undefined;
}

export function AdminDashboardPage({ user }: AdminDashboardPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bienvenido al panel de administración,{' '}
          {user?.firstName || user?.email}
        </p>
      </div>
    </div>
  );
}
