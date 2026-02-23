'use client';

import * as React from 'react';

interface HabitsLayoutProps {
  children: React.ReactNode;
}

export function HabitsLayout({ children }: HabitsLayoutProps) {
  return <React.Fragment>{children}</React.Fragment>;
}
