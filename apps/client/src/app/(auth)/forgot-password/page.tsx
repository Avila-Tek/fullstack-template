import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/src/features/auth/ui/pages/ForgotPasswordPage';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description:
    'Reset your password and get back to building great habits.',
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
