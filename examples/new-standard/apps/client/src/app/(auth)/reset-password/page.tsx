import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/src/features/auth/ui/pages/ResetPasswordPage';

export const metadata: Metadata = {
  title: 'Reset Password | HabitFlow',
  description: 'Create a new password for your HabitFlow account.',
};

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
}
