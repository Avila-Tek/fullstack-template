import { Check } from 'lucide-react';
import React from 'react';
import { getAllFeatures } from '../../domain/viewPlans.logic';
import { Plan } from '../../domain/viewPlans.model';

interface FeaturesListProps {
  plan: Plan;
}

function FeaturesList({ plan }: FeaturesListProps) {
  const allFeatures = getAllFeatures(plan);

  return (
    <div className="space-y-3">
      {allFeatures.map(
        (feature: { text: string; isEnabled: boolean }, index: number) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                feature.isEnabled
                  ? 'bg-utility-brand-100 text-brand-600'
                  : 'bg-disabled txt-quaternary-400'
              }`}
            >
              <Check className="h-3 w-3" />
            </div>
            <span
              className={`text-sm ${
                feature.isEnabled ? 'txt-secondary-700' : 'txt-quaternary-400'
              }`}
            >
              {feature.text}
            </span>
          </div>
        )
      )}
    </div>
  );
}

export default FeaturesList;
