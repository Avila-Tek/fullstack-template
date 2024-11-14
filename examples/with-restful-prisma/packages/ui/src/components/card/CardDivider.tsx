import React from 'react';
import { cn } from '../../utils/cn';

interface CardDividerProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string;
}

function CardDivider({ className, ...props }: CardDividerProps) {
  return <hr className={cn(`border-gray-200 my-3 `, className)} {...props} />;
}

export default CardDivider;
