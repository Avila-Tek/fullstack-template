'use client';

import { cn } from '@repo/ui/lib/utils';
import { getEnumObjectFromArray } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { getDisplayName } from '@/src/shared/currentUser/domain/currentUser.logic';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';

export const profileCardSize = ['sm', 'md'] as const;
export type TProfileCardSizeEnum = (typeof profileCardSize)[number];
export const profileCardSizeEnumObject =
  getEnumObjectFromArray(profileCardSize);

const profileCardVariants = cva('flex flex-col gap-3', {
  variants: {
    size: {
      [profileCardSizeEnumObject.sm]: '',
      [profileCardSizeEnumObject.md]: '',
    },
  },
  defaultVariants: {
    size: profileCardSizeEnumObject.sm,
  },
});

const avatarSizeClasses = {
  [profileCardSizeEnumObject.sm]: 'h-9 w-9 text-sm',
  [profileCardSizeEnumObject.md]: 'h-12 w-12 text-lg',
} as const;

const nameSizeClasses = {
  [profileCardSizeEnumObject.sm]: 'text-sm',
  [profileCardSizeEnumObject.md]: 'text-base',
} as const;

const metaSizeClasses = {
  [profileCardSizeEnumObject.sm]: 'text-xs',
  [profileCardSizeEnumObject.md]: 'text-sm',
} as const;

interface ProfileCardProps extends VariantProps<typeof profileCardVariants> {
  showEmail?: boolean;
  showPlan?: boolean;
  className?: string;
  /** Remove top border/padding (e.g. when used inside a card) */
  noBorder?: boolean;
}

export function ProfileCard({
  size = profileCardSizeEnumObject.sm,
  showEmail = false,
  showPlan = true,
  className,
  noBorder = false,
}: ProfileCardProps): React.ReactElement {
  const { user, activePlan } = useUser();

  const displayName = user ? getDisplayName(user.firstName, user.email) : null;
  const planName = activePlan?.name ?? null;
  const email = user?.email ?? null;

  return (
    <div
      className={cn(
        profileCardVariants({ size }),
        noBorder ? '' : 'border-t border-gray-light-mode-200 pt-4',
        className
      )}
    >
      {user ? (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700',
              avatarSizeClasses[size ?? profileCardSizeEnumObject.sm]
            )}
            aria-hidden
          >
            {user.firstName?.[0] ?? user.email[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p
              className={cn(
                'truncate font-medium text-gray-light-mode-900',
                nameSizeClasses[size ?? profileCardSizeEnumObject.sm]
              )}
            >
              {displayName}
            </p>
            {showEmail && email ? (
              <p
                className={cn(
                  'truncate txt-quaternary-500',
                  metaSizeClasses[size ?? profileCardSizeEnumObject.sm]
                )}
              >
                {email}
              </p>
            ) : null}
            {showPlan && planName ? (
              <p
                className={cn(
                  'truncate text-gray-light-mode-500',
                  metaSizeClasses[size ?? profileCardSizeEnumObject.sm]
                )}
              >
                {planName}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm txt-quaternary-500">No hay datos de cuenta.</p>
      )}
    </div>
  );
}
