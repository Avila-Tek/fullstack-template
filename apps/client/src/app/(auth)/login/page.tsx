import type { Metadata } from 'next';
import { LoginPage } from '@/src/features/auth/ui/pages/LoginPage';

export const metadata: Metadata = {
  title: 'Sign In ',
  description:
    'Sign in to your account and continue building great habits.',
};

export default function LoginRoute() {
  return <LoginPage />;
}
