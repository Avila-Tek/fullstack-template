import { cn } from '@repo/ui/lib/utils';
import { Check } from 'lucide-react';
import * as React from 'react';

export interface FeatureListItem {
  text: string;
  isEnabled: boolean;
}

interface FeatureListProps {
  features: FeatureListItem[];
}

export function FeatureList({
  features,
}: FeatureListProps): React.ReactElement {
  if (features.length === 0) return <></>;

  return (
    <div className="space-y-3">
      {features.map((feature, index) => (
        <div key={index} className="flex items-start gap-3">
          <div
            className={cn(
              'shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
              feature.isEnabled
                ? 'bg-utility-brand-100 text-brand-600'
                : 'bg-disabled txt-quaternary-400'
            )}
          >
            <Check className="h-3 w-3" />
          </div>
          <span
            className={cn(
              'text-sm',
              feature.isEnabled ? 'txt-secondary-700' : 'txt-quaternary-400'
            )}
          >
            {feature.text}
          </span>
        </div>
      ))}
    </div>
  );
}
