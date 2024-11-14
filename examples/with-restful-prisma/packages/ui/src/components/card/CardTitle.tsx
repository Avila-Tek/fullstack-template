import React from 'react';
import { cn } from '../../utils/cn';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h5
      className={cn('text-xl font-semibold text-gray-800', className)}
      {...props}
    >
      {children}
    </h5>
  );
}

export default CardTitle;
