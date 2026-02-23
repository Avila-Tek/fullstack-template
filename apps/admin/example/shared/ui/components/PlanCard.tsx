import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import type { ReactNode } from 'react';
import { FeatureList } from './FeatureList';

export interface PlanCardFeature {
  text: string;
  isEnabled: boolean;
}

export interface PlanCardProps {
  /** Plan display name */
  name: string;
  /** Main price string (e.g. "$9.99/mes" or "Gratis") */
  priceDisplay: string;
  /** Optional strikethrough price (e.g. for yearly comparison) */
  secondaryPriceDisplay?: string;
  /** Optional list of features with enabled state */
  features?: PlanCardFeature[];
  /** Optional savings badge (e.g. "Ahorra $X al año") */
  savingsBadge?: ReactNode;
  /** Optional CTA (e.g. Button "Elegir Plan") */
  footer?: ReactNode;
  /** Optional card title (e.g. "Selected Plan") */
  title?: string;
  isFeatured?: boolean;
  isSelected?: boolean;
  /** For viewPlans: callback when CTA is used; footer takes precedence if both set */
  onSelect?: () => void;
  /** CTA label when using onSelect (ignored if footer is provided) */
  selectLabel?: string;
  /** Whether plan is free (affects CTA label when using onSelect) */
  isFree?: boolean;
}

export function PlanCard({
  name,
  priceDisplay,
  secondaryPriceDisplay,
  features = [],
  savingsBadge,
  footer,
  title,
  isFeatured = false,
  isSelected = false,
  onSelect,
  selectLabel,
  isFree = false,
}: PlanCardProps): React.ReactElement {
  const defaultCtaLabel = isFree ? 'Continuar Gratis' : 'Elegir Plan';
  const ctaLabel = selectLabel ?? defaultCtaLabel;
  const showCta = footer !== undefined || onSelect !== undefined;

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-surface transition-all',
        isFeatured
          ? 'border-2 border-brand-500 shadow-lg scale-105 z-10'
          : 'border border-gray-200 shadow-sm hover:shadow-md',
        isSelected ? 'hover:shadow-sm' : ''
      )}
    >
      <div className="p-6 space-y-6">
        {title ? (
          <h2 className="text-lg font-semibold txt-primary-900">{title}</h2>
        ) : null}

        {/* Plan Name */}
        <div>
          <h3 className="text-xl font-semibold txt-primary-900">{name}</h3>
        </div>

        {/* Price Section */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold txt-primary-900">
              {priceDisplay}
            </span>
            {secondaryPriceDisplay ? (
              <span className="text-md txt-quaternary-400 line-through">
                {secondaryPriceDisplay}
              </span>
            ) : null}
          </div>
          {savingsBadge ?? null}
        </div>

        {/* CTA Button */}
        {showCta
          ? (footer ?? (
              <Button
                className="w-full"
                variant={isFeatured ? 'cta' : 'cta_outline'}
                onClick={onSelect}
              >
                {ctaLabel}
              </Button>
            ))
          : null}

        {/* Divider (only if we have features) */}
        {features.length > 0 ? (
          <div className="border-t border-gray-200" />
        ) : null}

        {features.length > 0 ? <FeatureList features={features} /> : null}
      </div>
    </div>
  );
}
