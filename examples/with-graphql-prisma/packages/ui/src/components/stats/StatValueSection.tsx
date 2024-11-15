import React from 'react';
import { cn } from '../../utils/cn';

interface StatValueSectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function StatValueSection({
  children,
  className = '',
}: StatValueSectionProps) {
  return (
    <div className={cn(`flex items-center cursor-default`, className)}>
      {children}
    </div>
  );
}
