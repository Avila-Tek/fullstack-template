/* eslint-disable no-nested-ternary */
import React from 'react';
import { ChevronDownIcon } from '../../icons';
import { cn } from '../../utils/cn';

interface NavigationButtonProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  variant?: 'simple' | 'full' | 'icon' | 'grow';
  sideType?: 'simple' | 'double';
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  route: any;
  subRoutes?: any[];
  setSubRoutes?: React.Dispatch<React.SetStateAction<any[]>>;
  subRoutesClassName?: string;
  mobile?: boolean;
}

export default function NavigationButton({
  route,
  variant = 'simple',
  sideType = 'simple',
  className = '',
  isOpen,
  setIsOpen,
  subRoutes,
  setSubRoutes,
  subRoutesClassName = '',
  mobile = false,
}: NavigationButtonProps) {
  const getIcon = (icon: JSX.Element) => (
    <div className={`size-6 min-w-6 ${variant !== 'icon' ? 'mr-[10px]' : ''}`}>
      {icon}
    </div>
  );
  const handleClick = () => {
    if (route?.href) {
      window.location.href = route?.href;
      if (setSubRoutes) {
        setSubRoutes([]);
      }
      if (setIsOpen) {
        setIsOpen(false);
      }
    } else if (route?.onClick) {
      if (setSubRoutes) {
        setSubRoutes([]);
      }
      route?.onClick();
      if (setIsOpen) {
        setIsOpen(false);
      }
    } else if (route?.subRoutes && setSubRoutes) {
      if (JSON.stringify(subRoutes) === JSON.stringify(route?.subRoutes)) {
        setSubRoutes([]);
      } else {
        setSubRoutes(route?.subRoutes);
      }
    } else if (setSubRoutes) {
      setSubRoutes([]);
    }
  };

  return (
    <div className="flex flex-col w-auto">
      <button
        onClick={handleClick}
        {...(route?.href ? { role: 'link' } : {})}
        type="button"
        className={cn(
          `h-10 rounded-md flex flex-row items-center bg-primary text-primary-900 px-[10px]  ${
            ['simple', 'icon'].includes(variant) ? 'w-auto max-w-max' : 'w-full'
          } ${
            route?.subRoutes &&
            JSON.stringify(subRoutes) === JSON.stringify(route?.subRoutes)
              ? 'bg-gray-50'
              : ''
          }`,
          className
        )}
      >
        {route?.icon ? (
          getIcon(route?.icon)
        ) : variant === 'grow' && !isOpen && !mobile ? (
          <div className="pl-[6px] font-black">
            {route?.text?.charAt(0).toUpperCase()}
          </div>
        ) : null}
        {['simple', 'full'].includes(variant) || (variant === 'grow' && isOpen)
          ? route?.text
          : null}
        {route?.badge &&
        (['simple', 'full'].includes(variant) ||
          (variant === 'grow' && isOpen)) ? (
          <div className="flex rounded-full ml-2 text-xs px-2 items-center justify-center h-[22px] bg-gray-50 border border-gray-200">
            {route?.badge}
          </div>
        ) : null}
        {variant === 'full' || (variant === 'grow' && isOpen) ? (
          <div className="flex-grow" />
        ) : null}
        {route?.subRoutes && !(!isOpen && variant === 'grow') ? (
          <div
            className={`size-6 ml-3 ${
              sideType !== 'double'
                ? JSON.stringify(subRoutes) === JSON.stringify(route?.subRoutes)
                  ? 'rotate-180'
                  : ''
                : JSON.stringify(subRoutes) === JSON.stringify(route?.subRoutes)
                  ? 'rotate-90'
                  : '-rotate-90'
            }`}
          >
            <ChevronDownIcon />
          </div>
        ) : null}
      </button>
      {subRoutes?.length &&
      subRoutes?.length > 0 &&
      isOpen &&
      JSON.stringify(subRoutes) === JSON.stringify(route?.subRoutes) &&
      (variant === 'full' || (variant === 'grow' && sideType === 'simple')) ? (
        <div className={cn(`flex flex-col space-y-1 py-2`, subRoutesClassName)}>
          {subRoutes?.map((subRoute) => (
            <NavigationButton
              key={subRoute?.id}
              route={subRoute}
              variant="full"
              className={cn(`pl-12`, className)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
