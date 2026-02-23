import type { Metadata } from 'next';
import { SignUpPage } from '@/src/features/auth/ui/pages/SignUpPage';

export const metadata: Metadata = {
  title: 'Create Account ',
  description:
    'Create your account and start building better habits today.',
};

export default function SignUpRoute() {
  return <SignUpPage />;
}
