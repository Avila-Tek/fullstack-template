import { AuthLayout } from '@/src/features/auth/ui/layouts/AuthLayout';

export default function AuthRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
