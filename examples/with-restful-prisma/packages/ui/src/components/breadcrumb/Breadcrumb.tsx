'use client';

import React from 'react';
import { Button } from '../../atoms';
import { InformationIcon, LockIcon, MailIcon, UserIcon } from '../../icons';
import { cn } from '../../utils/cn';
import BreadcrumbItem from './BreadcrumbItem';

// #region Mock del archivo Routes.tsx
interface IRoute {
  text: string;
  href: string;
  as: string;
  privilieges: string[];
  icon: JSX.Element;
  isCollapsible?: boolean;
  subLinks?: Array<Partial<IRoute>>;
}

export const routes: IRoute[] = [
  {
    text: 'Configuraciones',
    href: '/settings',
    as: '/settings',
    privilieges: [],
    icon: <InformationIcon />,
  },
  {
    text: 'Privacy',
    href: '/settings/privacy',
    as: '/settings/privacy',
    privilieges: [],
    icon: <LockIcon />,
  },
  {
    text: 'Account',
    href: '/settings/account',
    as: '/settings/account',
    privilieges: [],
    icon: <UserIcon />,
  },
  {
    text: 'Notifications',
    href: '/settings/notifications',
    as: '/settings/notifications',
    privilieges: [],
    icon: <MailIcon />,
  },
];

// #endregion

interface BreadcrumbProps {
  routesHistory: Partial<IRoute>[]; // Rutas del Route.tsx
  readUrl?: boolean; // Usar la URL en vez de las rutas
  push: (href: string) => void; // Funcion para cambiar de ruta
  btn?: {
    className?: string;
  };
}

// TODO: Move to a Hook folder

const useRoutes = (__routes: IRoute[], routesHistory: Partial<IRoute>[]) => {
  const [fullRoutes, setFullRoutes] = React.useState<Partial<IRoute>[]>([]);

  React.useEffect(() => {
    const firstRoute = __routes.find(
      (route) => route.href === routesHistory[0]?.href
    );

    const currentRoutes = [...routesHistory];
    currentRoutes.shift();
    // setFullRoutes([firstRoute, ...currentRoutes]);
    const newFullRoutes = [firstRoute, ...currentRoutes];
    setFullRoutes(newFullRoutes as Partial<IRoute>[]);
  }, []);

  return {
    fullRoutes, // Rutas completas
  };
};

export default function Breadcrumb({
  routesHistory,
  readUrl = false,
  push,
  btn = {
    className: 'bg-white/50 hover:bg-white',
  },
}: BreadcrumbProps) {
  const { fullRoutes } = useRoutes(routes, routesHistory);

  return (
    <div className="text-black h-full">
      <ul className="flex gap-2">
        {fullRoutes?.map((route, i) => (
          <BreadcrumbItem key={route?.href}>
            {/* Cambiar a un router.push como funcion por parametro */}
            <Button
              key={route?.href}
              onClick={() => push(route?.href ?? '/')}
              className={cn(
                'flex gap-1 justify-center items-center',
                btn?.className
              )}
              variant="link-gray"
            >
              {i === 0 ? (
                <>
                  <div className="size-5 text-slate-600 bg-white">
                    {route?.icon}
                  </div>
                  <span className="text-white"> / </span>
                  <span
                    className={`font-medium my-auto ${
                      i === (routesHistory?.length ?? 0) - 1
                        ? 'text-gray-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {route?.text}
                  </span>
                </>
              ) : (
                <span
                  className={`font-medium my-auto ${
                    i === (routesHistory?.length ?? 0) - 1
                      ? 'text-gray-400'
                      : 'text-slate-600'
                  }`}
                >
                  {route?.text}
                </span>
              )}
            </Button>
            <span
              className={`font-medium mx-1 text-slate-600 ${
                i === (routesHistory?.length ?? 0) - 1 ? 'hidden' : ''
              }`}
            >
              /
            </span>
          </BreadcrumbItem>
        ))}
      </ul>
    </div>
  );
}
