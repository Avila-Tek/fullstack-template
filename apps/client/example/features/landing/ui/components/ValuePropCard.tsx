import * as React from 'react';

interface ValuePropCardProps {
  text: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export function ValuePropCard({
  text,
  icon: Icon,
}: ValuePropCardProps): React.ReactElement {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-brand-100 bg-brand-tertiary p-5 transition-all hover:border-brand-200 hover:bg-brand-surface">
      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="pt-1.5 text-sm font-medium txt-secondary-700">{text}</p>
    </div>
  );
}
