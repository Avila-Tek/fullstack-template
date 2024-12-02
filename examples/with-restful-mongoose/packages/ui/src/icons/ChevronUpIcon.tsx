import React from 'react';

export default function ChevronUpIcon({
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M16.59 15.7051L12 11.1251L7.41 15.7051L6 14.2951L12 8.2951L18 14.2951L16.59 15.7051Z"
        fill="currentColor"
      />
    </svg>
  );
}
