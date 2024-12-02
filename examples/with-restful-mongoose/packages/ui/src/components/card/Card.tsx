import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  children: React.ReactNode;
}

export default function Card({
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        `relative flex flex-col w-full bg-white bg-clip-border shadow-[0_4px_10px_rgba(0,0,0,0.10)] rounded-lg`,
        className
      )}
      style={{
        wordWrap: 'break-word',
        ...(props.style ?? {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
}
