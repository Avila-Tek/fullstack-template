'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { cn } from '../../utils/cn';

interface LogoContainerProps {
  isOpen: boolean;
  className?: string;
  logoText: React.ReactElement;
  logoIcon: React.ReactElement;
}

export default function LogoContainer({
  isOpen,
  className = '',
  logoText,
  logoIcon,
}: LogoContainerProps) {
  const showAnimation = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: {
        duration: 0.5,
      },
    },
    show: {
      opacity: 1,
      width: 'auto',
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div
      className={cn(
        `flex flex-row items-end justify-start gap-2 transition duration-200 ease-in-out h-6 w-full mb-5`,
        className
      )}
    >
      {logoIcon}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            variants={showAnimation}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            {logoText}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
