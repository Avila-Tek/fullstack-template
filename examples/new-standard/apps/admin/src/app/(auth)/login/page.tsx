import type { Metadata } from 'next';
import { AdminLoginPage } from '@/src/features/admin/ui/pages/AdminLoginPage';

export const metadata: Metadata = {
  title: 'Admin Login | HabitFlow',
  description: 'Panel de administración de HabitFlow',
};

export default function LoginRoute() {
  return <AdminLoginPage />;
}
