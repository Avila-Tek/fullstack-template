import React from 'react';
import { cn } from '../../utils/cn';
import { RadioGroupProvider } from './RadioGroupContext';
import Label from './Label';
import Option from './Option';

interface RadioGroupProps {
  selectedOption: string;
  selectOption: React.Dispatch<React.SetStateAction<string>>;
  className?: string;
  children: React.ReactNode;
}

export default function RadioGroup({
  selectedOption,
  selectOption,
  children,
  className,
}: RadioGroupProps) {
  return (
    <RadioGroupProvider
      selectedOption={selectedOption}
      selectOption={selectOption}
    >
      <div
        className={cn(
          'flex w-full max-w-lg flex-col gap-5 p-6 px-10 bg-transparent',
          className
        )}
      >
        {children}
      </div>
    </RadioGroupProvider>
  );
}

RadioGroup.Label = Label;
RadioGroup.Option = Option;
