'use client';

import { motion } from 'framer-motion';
/* eslint-disable no-nested-ternary */
import React from 'react';
import { cn } from '../../utils/cn';
import NavigationButton from '../navigation-elements/NavigationButton';

interface BigSidebarProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  subRoutes?: any[];
  setSubRoutes?: React.Dispatch<React.SetStateAction<any[]>>;
  sideType: 'simple' | 'double';
  subRoutesClassName?: string;
  keepOpen?: boolean;
}

export default function BigSidebar({
  children,
  className = '',
  style = {},
  isOpen,
  setIsOpen,
  subRoutes,
  setSubRoutes,
  sideType,
  subRoutesClassName,
  keepOpen = false,
  ...props
}: BigSidebarProps) {
  return (
    <motion.div
      onMouseEnter={() => {
        if (setIsOpen) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (setIsOpen && !keepOpen) {
          setIsOpen(false);
        }
        if (setSubRoutes) {
          setSubRoutes([]);
        }
      }}
      onFocus={() => {
        if (setIsOpen) {
          setIsOpen(true);
        }
      }}
      animate={{
        width: !isOpen ? '80px' : 'auto',
        transition: {
          duration: 0.5,
        },
      }}
      className={cn(
        `absolute left-0 flex flex-row bg-primary h-screen overflow-y-auto overflow-x-hidden z-[90] border-r border-light-utility-gray-200 dark:border-dark-utility-gray-200`,
        className
      )}
      style={{
        ...(style ?? {}),
      }}
      {...props}
    >
      <div className="flex flex-col items-center justify-between border-r border-light-utility-gray-200 dark:border-dark-utility-gray-200 py-8 w-[312px] gap-4">
        {children}
      </div>
      {subRoutes &&
      subRoutes.length &&
      subRoutes?.length > 0 &&
      sideType === 'double' &&
      isOpen ? (
        <div className="flex flex-col items-center justify-between border-r border-light-utility-gray-200 dark:border-dark-utility-gray-200 py-8 w-[312px]">
          <div
            className={cn(
              `flex flex-col space-y-1 py-2 px-4 w-full`,
              subRoutesClassName
            )}
          >
            {subRoutes?.map((subRoute) => (
              <NavigationButton
                key={subRoute?.id}
                route={subRoute}
                variant="full"
              />
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
