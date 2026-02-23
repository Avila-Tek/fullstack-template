import React from 'react';
import {
  billingPeriodEsLabelMap,
  billingPeriodToggleOptions,
  TBillingPeriod,
} from '../../domain/viewPlans.constants';

interface BillingPeriodToggleProps {
  value: TBillingPeriod;
  onChange: (value: TBillingPeriod) => void;
}

export function BillingPeriodToggle({
  value,
  onChange,
}: BillingPeriodToggleProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="inline-flex bg-secondary rounded-full p-1">
        {billingPeriodToggleOptions.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              value === period
                ? 'bg-surface txt-primary-900 shadow-sm'
                : 'txt-quaternary-500 hover:txt-primary-900'
            }`}
          >
            {billingPeriodEsLabelMap[period]}
          </button>
        ))}
      </div>
    </div>
  );
}
