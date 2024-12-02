import React from 'react';
import { cn } from '../../utils/cn';
import NavigationButton from './NavigationButton';

interface NavigationRoutesProps extends React.HTMLAttributes<HTMLDivElement> {
  routes?: any[];
  direction?: 'row' | 'column';
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  sideType?: 'simple' | 'double';
  variant?: 'simple' | 'full' | 'icon' | 'grow';
  subRoutes?: any[];
  setSubRoutes?: React.Dispatch<React.SetStateAction<any[]>>;
  buttonsClassName?: string;
  subRoutesClassName?: string;
  mobile?: boolean;
}

export default function NavigationRoutes({
  routes,
  className = '',
  direction = 'column',
  isOpen = false,
  setIsOpen,
  sideType = 'simple',
  variant = 'grow',
  subRoutes,
  setSubRoutes,
  buttonsClassName,
  subRoutesClassName,
  mobile = false,
}: NavigationRoutesProps) {
  return (
    <div
      className={cn(
        `w-full flex ${
          direction === 'column' ? 'flex-col space-y-1' : 'flex-row'
        }`,
        className
      )}
    >
      {routes?.map((route) => (
        <NavigationButton
          data-testid="navigation-button"
          key={route?.id}
          route={route}
          sideType={sideType}
          variant={variant}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          subRoutes={subRoutes}
          setSubRoutes={setSubRoutes}
          className={buttonsClassName}
          subRoutesClassName={subRoutesClassName}
          mobile
        />
      ))}
    </div>
  );
}
