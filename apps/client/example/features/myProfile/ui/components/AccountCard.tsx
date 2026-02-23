'use client';

import {
  ProfileCard,
  profileCardSizeEnumObject,
} from '@/src/shared/currentUser/ui/components/ProfileCard';

export function AccountCard(): React.ReactElement {
  return (
    <section className="rounded-xl border border-gray-light-mode-200 bg-surface p-6">
      <h2 className="mb-4 text-lg font-medium txt-primary-900">
        Información de la cuenta
      </h2>
      <ProfileCard
        size={profileCardSizeEnumObject.md}
        showEmail
        showPlan={false}
        noBorder
      />
    </section>
  );
}
