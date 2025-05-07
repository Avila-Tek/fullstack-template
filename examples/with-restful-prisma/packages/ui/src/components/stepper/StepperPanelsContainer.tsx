import { Tab } from '@headlessui/react';
import React from 'react';
import { cn } from '../../utils/cn';

interface StepperPanelsContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function StepperPanelsContainer({
  className,
  children,
}: StepperPanelsContainerProps) {
  return (
    <Tab.Panels>
      <div className={cn('pt-2', className ?? '')}>{children}</div>
    </Tab.Panels>
  );
}
