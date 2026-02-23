'use client';

import * as React from 'react';
import { Navbar } from './Navbar';

interface NavbarLayoutProps {
  children: React.ReactNode;
}

export function NavbarLayout({ children }: NavbarLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
