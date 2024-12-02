import React from 'react';

interface TextProps extends React.HTMLProps<HTMLSpanElement> {
  children: React.ReactNode;
}

export function Text({ children, ...props }: TextProps) {
  return <span {...props}>{children}</span>;
}
