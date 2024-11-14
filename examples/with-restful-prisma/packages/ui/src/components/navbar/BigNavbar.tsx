import React from 'react';
import { cn } from '../../utils/cn';
import { NavigationButton } from '../navigation-elements';

interface BigNavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  subRoutes?: any[];
  setSubRoutes?: React.Dispatch<React.SetStateAction<any[]>>;
  subRoutesClassName?: string;
}

export default function BigNavbar({
  children,
  className = '',
  subRoutes,
  setSubRoutes,
  subRoutesClassName,
  ...props
}: BigNavbarProps) {
  return (
    <div
      data-testid="big-navbar"
      onMouseLeave={() => {
        if (setSubRoutes) {
          setSubRoutes([]);
        }
      }}
      className={cn(
        `absolute top-0 flex flex-col bg-white w-full h-auto overflow-y-hidden overflow-x-auto z-[90] border-b border-neutral-200`,
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 h-[72px] px-10 lg:px-14 xl:px-28">
        {children}
      </div>
      {subRoutes && subRoutes.length && subRoutes?.length > 0 ? (
        <div className="flex items-center justify-between border-b border-neutral-200 h-[72px] px-10 lg:px-14 xl:px-28">
          <div className={cn(`flex space-x-1 w-full`, subRoutesClassName)}>
            {subRoutes?.map((subRoute) => (
              <NavigationButton
                key={subRoute?.id}
                route={subRoute}
                variant="simple"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
