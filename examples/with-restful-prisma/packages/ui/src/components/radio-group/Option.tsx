import React from 'react';
import { CheckIcon } from '../../icons';
import { cn } from '../../utils/cn';
import useRadioGroup from './useRadioGroup';

interface RadioGroupOptionProps {
  option: string;
  description?: string;
  className?: {
    base: {
      button?: string;
      option?: string;
      description?: string;
    };
    isSelected: {
      button?: string;
      option?: string;
      description?: string;
      icon?: string;
    };
  };
}

export default function Option({
  option,
  description,
  className,
}: RadioGroupOptionProps) {
  const { selectedOption, selectOption } = useRadioGroup();
  const isSelected = option === selectedOption;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() =>
        selectOption !== undefined &&
        selectOption(`${isSelected ? '' : option}`)
      }
      className={cn(
        `flex w-full items-center justify-between gap-10 rounded-lg px-5 py-4 shadow bg-white text-black active:scale-95 transition-all duration-300
        hover:bg-slate-200 active:bg-sky-200 focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-sky-300`,
        className?.base.button,
        isSelected &&
          cn('bg-sky-900 hover:bg-sky-900/75', className?.isSelected.button)
      )}
    >
      <div className="flex grow flex-col items-start gap-1 text-start">
        <span
          className={cn(
            'text-sm font-medium',
            className?.base.option,
            isSelected && cn('text-white', className?.isSelected.option)
          )}
        >
          {option}
        </span>
        <p
          className={cn(
            'text-sm text-neutral-500',
            className?.base.description,
            isSelected && cn('text-sky-100', className?.isSelected.description)
          )}
        >
          {description}
        </p>
      </div>
      <div className="shrink-0">
        {isSelected && (
          <CheckIcon
            className={cn('h-6 w-6 text-white', className?.isSelected.icon)}
          />
        )}
      </div>
    </button>
  );
}
