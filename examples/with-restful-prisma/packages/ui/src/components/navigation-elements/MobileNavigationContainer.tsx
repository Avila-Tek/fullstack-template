import React from 'react';
import { CloseIcon, MenuSideIcon } from '../../icons';
import { cn } from '../../utils/cn';
import NavigationButton from './NavigationButton';

interface MobileNavigationContainerProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fullLogo: React.ReactElement;
  headerClassName?: string;
  containerClassName?: string;
  setSubRoutes?: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function MobileNavigationContainer({
  children,
  className = '',
  isOpen,
  setIsOpen,
  fullLogo,
  headerClassName,
  containerClassName,
  setSubRoutes,
  ...props
}: MobileNavigationContainerProps) {
  return (
    <div
      className={cn(
        `w-screen bg-white flex flex-col fixed top-0 left-0 z-20 h-auto`,
        className
      )}
      style={{
        ...(props.style ?? {}),
      }}
      {...props}
    >
      <div
        data-testid="header"
        className={cn(
          `w-full flex flex-row justify-between items-center h-16 z-10 bg-white border-b- border-gray-200 px-4`,
          headerClassName
        )}
      >
        {fullLogo}
        {isOpen ? (
          <NavigationButton
            route={{
              id: 'Close',
              icon: <CloseIcon className="size-6" />,
              onClick: () => {
                if (setIsOpen) {
                  setIsOpen(false);
                }
                if (setSubRoutes) {
                  setSubRoutes([]);
                }
              },
            }}
            variant="icon"
          />
        ) : (
          <NavigationButton
            route={{
              id: 'Menu',
              icon: <MenuSideIcon className="size-6" />,
              onClick: () => {
                if (setIsOpen) {
                  setIsOpen(true);
                }
              },
            }}
            variant="icon"
          />
        )}
      </div>
      <div
        data-testid="container"
        className={cn(
          `absolute  top-[64px] bg-white w-full pb-6 duration-500 flex flex-col justify-between ${
            isOpen ? 'translate-y-0 h-screen' : '-translate-y-[200%]'
          }`,
          containerClassName
        )}
      >
        <div className="relative h-full overflow-auto">{children}</div>
      </div>
    </div>
  );
}
