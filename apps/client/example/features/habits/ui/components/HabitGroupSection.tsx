import * as React from 'react';

interface HabitGroupSectionProps {
  title: string;
  children: React.ReactNode;
}

export function HabitGroupSection({ title, children }: HabitGroupSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-light-mode-600">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
