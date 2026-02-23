import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/src/features/auth/ui/pages/ForgotPasswordPage';

export const metadata: Metadata = {
  title: 'Forgot Password | HabitFlow',
  description:
    'Reset your HabitFlow password and get back to building great habits.',
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
