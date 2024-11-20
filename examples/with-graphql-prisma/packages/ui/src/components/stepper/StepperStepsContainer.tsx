import { Tab } from '@headlessui/react';
import React from 'react';

interface StepperStepsContainerProps {
  children: React.ReactNode;
}

export default function StepsContainer({
  children,
}: StepperStepsContainerProps) {
  return (
    <Tab.List>
      <div className="flex w-full flex-row justify-between items-center gap-3 relative">
        <div className="w-full h-fit absolute z-0 px-5 top-4">
          <div className="w-full h-[2px] bg-neutral-300" />
        </div>
        {children}
      </div>
    </Tab.List>
  );
}
