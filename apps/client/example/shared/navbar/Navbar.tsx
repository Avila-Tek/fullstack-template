'use client';

import { LinkButton } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';
import { routeBuilders } from '@/src/shared/routes/routes';
import { ProfileDropdown } from './components/ProfileDropdown';
import { NAVBAR_APP_NAME, navbarNavItems } from './navbar.constants';

export function Navbar() {
  const { isAuthenticated } = useUser();
  const pathname = usePathname();

  const getNavItemHref = (item: (typeof navbarNavItems)[number]) => {
    return typeof item.href === 'function'
      ? item.href(isAuthenticated)
      : item.href;
  };

  const isNavItemActive = (item: (typeof navbarNavItems)[number]) => {
    const href = getNavItemHref(item);
    return pathname === href;
  };

  return (
    <nav
      className="sticky top-0 z-50 flex h-16 items-center justify-between bg-surface px-10"
      aria-label="Navegación principal"
    >
      <Link
        href={isAuthenticated ? routeBuilders.dashboard() : '/'}
        className="flex items-center gap-2"
        aria-label={`${NAVBAR_APP_NAME} - Inicio`}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-base-white"
          aria-hidden
        >
          <span className="text-sm font-semibold">{NAVBAR_APP_NAME[0]}</span>
        </div>
        <span className="text-base font-semibold text-gray-light-mode-900">
          {NAVBAR_APP_NAME}
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 md:flex">
          {navbarNavItems.map((item) => {
            const href = getNavItemHref(item);
            const isActive = isNavItemActive(item);
            return (
              <LinkButton
                key={item.label}
                href={href}
                variant={'ghost'}
                className={cn(
                  'bg-transparent hover:bg-transparent',
                  isActive ? 'txt-brand-icon font-bold' : 'hover:text-brand-700'
                )}
              >
                {item.label}
              </LinkButton>
            );
          })}
        </div>

        {isAuthenticated ? (
          <ProfileDropdown />
        ) : (
          <React.Fragment>
            <LinkButton href={routeBuilders.login()} variant="ghost">
              Iniciar sesión
            </LinkButton>
            <LinkButton href={routeBuilders.signup()} variant="cta">
              Registrarse
            </LinkButton>
          </React.Fragment>
        )}
      </div>
    </nav>
  );
}
