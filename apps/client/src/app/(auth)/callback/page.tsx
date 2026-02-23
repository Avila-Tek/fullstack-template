import type { Metadata } from 'next';
import { AuthCallbackPage } from '@/src/features/auth/ui/pages/AuthCallbackPage';

export const metadata: Metadata = {
  title: 'Authenticating',
  description: 'Completing authentication with your provider.',
};

export default function AuthCallbackRoute() {
  return <AuthCallbackPage />;
}
