'use client';

import { NavbarLayout } from '@/src/shared/navbar/NavbarLayout';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavbarLayout>{children}</NavbarLayout>;
}
