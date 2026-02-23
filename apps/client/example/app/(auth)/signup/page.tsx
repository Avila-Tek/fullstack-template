import type { Metadata } from 'next';
import { SignUpPage } from '@/src/features/auth/ui/pages/SignUpPage';

export const metadata: Metadata = {
  title: 'Create Account | HabitFlow',
  description:
    'Create your HabitFlow account and start building better habits today.',
};

export default function SignUpRoute() {
  return <SignUpPage />;
}
