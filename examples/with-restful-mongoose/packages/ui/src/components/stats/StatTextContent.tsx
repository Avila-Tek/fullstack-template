import React from 'react';
import { cn } from '../../utils/cn';

interface StatTextContentProps {
  children: React.ReactNode;
  className?: string;
}

export default function StatTextContent({
  children,
  className = '',
}: StatTextContentProps) {
  return (
    <div className={cn(`flex flex-col cursor-default`, className)}>
      {children}
    </div>
  );
}
