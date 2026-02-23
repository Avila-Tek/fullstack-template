import { Check, X } from 'lucide-react';
import React from 'react';

interface PlanFeatureItemProps {
  text: string;
  isEnabled: boolean;
}

export function PlanFeatureItem({
  text,
  isEnabled,
}: PlanFeatureItemProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {isEnabled ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      )}
      <span className={isEnabled ? 'text-gray-700' : 'text-gray-400'}>
        {text}
      </span>
    </div>
  );
}
