import React from 'react';
import { cn } from '../../utils/cn';

interface CardTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

function CardText({ children, className = '' }: CardTextProps) {
  return <p className={cn('text-gray-600', className)}>{children}</p>;
}

export default CardText;
