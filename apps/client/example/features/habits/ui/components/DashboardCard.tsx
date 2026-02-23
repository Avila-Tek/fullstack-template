'use client';

import * as React from 'react';

interface DashboardCardProps {
  title: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardCard({
  title,
  rightElement,
  children,
}: DashboardCardProps) {
  return (
    <section className="rounded-2xl border border-gray-light-mode-200 bg-base-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-light-mode-900">
          {title}
        </h2>
        {rightElement ? rightElement : null}
      </div>
      {children}
    </section>
  );
}
