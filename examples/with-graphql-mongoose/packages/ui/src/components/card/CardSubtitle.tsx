import React from 'react';
import { cn } from '../../utils/cn';

interface CardSubtitleProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}

function CardSubtitle({ children, className, ...props }: CardSubtitleProps) {
  return (
    <span className={cn('text-lg  text-gray-500', className)} {...props}>
      {children}
    </span>
  );
}

export default CardSubtitle;
