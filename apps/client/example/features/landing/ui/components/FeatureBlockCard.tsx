import * as React from 'react';

interface FeatureBlockCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function FeatureBlockCard({
  title,
  description,
  icon: Icon,
}: FeatureBlockCardProps): React.ReactElement {
  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-utility-brand-100 text-brand-600 transition-colors group-hover:bg-brand-200">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-xl font-semibold txt-primary-900">{title}</h3>
      <p className="mt-2 txt-secondary-700">{description}</p>
    </div>
  );
}
