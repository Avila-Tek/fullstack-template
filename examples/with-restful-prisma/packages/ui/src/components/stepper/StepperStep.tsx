import { Tab } from '@headlessui/react';
/* eslint-disable no-nested-ternary */
import React from 'react';
import { CheckEmptyIcon, CheckFullIcon } from '../../icons';
import { cn } from '../../utils/cn';
import { StepperContext } from './Stepper';

interface StepperStepProps {
  children: React.ReactNode;
  index: number;
  disabled?: boolean;
  active?: {
    className?: string;
    icon?: React.ReactNode;
    textClassName?: string;
  };
  pending?: {
    className?: string;
    icon?: React.ReactNode;
    textClassName?: string;
  };
  done?: { className?: string; icon?: React.ReactNode; textClassName?: string };
}

export default function StepperStep({
  children,
  index,
  active,
  pending,
  done,
  disabled = true,
}: StepperStepProps) {
  const { selectedIndex } = React.useContext(StepperContext);
  const isSelected = React.useMemo(
    () => index === selectedIndex,
    [index, selectedIndex]
  );
  const isDone = React.useMemo(
    () => index < selectedIndex,
    [index, selectedIndex]
  );
  const isPending = React.useMemo(
    () => index > selectedIndex,
    [index, selectedIndex]
  );
  return (
    <Tab disabled={disabled}>
      <div
        className={cn(
          'flex flex-col justify-center items-center outline-offset-2 mx-auto text-sm gap-1 relative z-10 w-8 h-8 ease-in-out duration-300 rounded-full outline outline-2',
          isSelected
            ? `outline-[#3ABCB0] border-[#3ABCB0] ${active?.className ?? ''}`
            : '',
          isPending
            ? `outline-neutral-300 border-neutral-300 ${
                active?.className ?? ''
              }`
            : '',
          isDone
            ? `outline-[#3ABCB0] border-[#3ABCB0]  ${active?.className ?? ''}`
            : ''
        )}
      >
        {isSelected && active?.icon ? (
          active.icon
        ) : isSelected ? (
          <CheckEmptyIcon strokeWidth={3} className="fill-[#3ABCB0]" />
        ) : isPending && pending?.icon ? (
          pending.icon
        ) : isPending ? (
          <CheckEmptyIcon strokeWidth={3} className="fill-neutral-200" />
        ) : isDone && done?.icon ? (
          done?.icon
        ) : isDone ? (
          <CheckFullIcon
            strokeWidth={3}
            className="text-green-300 fill-green-200 rounded-full"
          />
        ) : null}
      </div>
      <div
        className={cn(
          'font-medium text-center text-medium',
          isSelected ? `text-green-700 ${active?.textClassName ?? ''}` : '',
          isPending ? `text-neutral-400 ${pending?.textClassName ?? ''}` : '',
          isDone ? `text-green-700 ${done?.textClassName ?? ''}` : ''
        )}
      >
        {children}
      </div>
    </Tab>
  );
}
