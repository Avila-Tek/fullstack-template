'use client';

import React from 'react';
import { AvilaIcon } from '../../icons';

export function Copyright({
  company,
  socials = [],
}: {
  company?: string;
  socials?: { icon: React.ReactNode; href: string }[];
}) {
  const currentYear = new Date().getFullYear();
  return (
    <div className="flex lg:flex-row flex-col-reverse lg:gap-y-0 gap-y-4 justify-between items-center border-t border-slate-600 pt-8 w-full">
      <p className="flex md:flex-row flex-col md:items-end items-center gap-1 text-center">
        © {currentYear} {company}. Todos los derechos reservados. Desarrollado
        por{' '}
        <a
          className="flex items-end gap-1 hover:text-[#00911d]"
          href="https://www.avilatek.com/"
          target="_blank"
        >
          <AvilaIcon className="h-6" />
          Avila Tek
        </a>
      </p>
      <div className="flex gap-6">
        {socials?.map((social) => (
          <a href={social?.href} key={social?.href} target="_blank">
            {social?.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
