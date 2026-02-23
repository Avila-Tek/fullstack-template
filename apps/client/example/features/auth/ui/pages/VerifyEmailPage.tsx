'use client';

import { Suspense } from 'react';
import { VerifyEmailForm } from '../widgets/VerifyEmailForm';

export function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
