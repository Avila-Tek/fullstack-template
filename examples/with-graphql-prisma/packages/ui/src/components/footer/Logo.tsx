import React from 'react';

interface LogoProps {
  children: React.ReactNode;
}

export function Logo({ children }: LogoProps) {
  return <div>{children}</div>;
}
