import type { Metadata } from 'next';
import { VerifyEmailPage } from '@/src/features/auth/ui/pages/VerifyEmailPage';

export const metadata: Metadata = {
  title: 'Verify Email | HabitFlow',
  description: 'Verify your email address to activate your HabitFlow account.',
};

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}
