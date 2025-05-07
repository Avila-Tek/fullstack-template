import React from 'react';

interface BreadcrumbItemProps {
  children: React.ReactNode;
}

export default function BreadcrumbItem({ children }: BreadcrumbItemProps) {
  return <li className="flex items-center">{children}</li>;
}
