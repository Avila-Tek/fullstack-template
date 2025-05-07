import React from 'react';
import { Copyright } from './Copyright';
import { Logo } from './Logo';

interface FooterProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
  copyright?: string;
  socials?: { icon: React.ReactNode; href: string }[];
}

export default function Footer({
  children,
  copyright = '',
  socials = [],
  ...props
}: FooterProps) {
  return (
    <footer
      {...props}
      className={`py-8 px-12 w-full h-fit space-y-4 ${props?.className}`}
    >
      <div className="flex md:flex-row flex-col items-center gap-2 justify-center w-full">
        {children}
      </div>
      <Copyright company={copyright} socials={socials} />
    </footer>
  );
}

Footer.Logo = Logo;
