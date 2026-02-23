import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}

export function FormSection({ title, icon: Icon, children }: FormSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-gray-light-mode-200 bg-gray-light-mode-50/80 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-light-mode-900">
        <Icon className="h-4 w-4 text-brand-600" />
        {title}
      </h3>
      {children}
    </section>
  );
}
