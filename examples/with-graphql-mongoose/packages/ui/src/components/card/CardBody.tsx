import React from 'react';
import { cn } from '../../utils/cn';

interface CardBody {
  children: React.ReactNode;
  className?: string;
}

export default function CardBody({ children, className = '' }: CardBody) {
  return (
    <div
      className={cn(
        `px-5 md:px-10 py-8 flex flex-col flex-auto gap-5`,
        className
      )}
    >
      {children}
    </div>
  );
}
