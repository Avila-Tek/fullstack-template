import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ProgressBarProps {
  customLabel?: string;
  progress: number;
  classNames?: {
    bar?: string;
    container?: string;
    label?: string;
  };
  labelAlignment?: 'left' | 'right' | 'center';
}

function ProgressBar({
  customLabel,
  progress,
  classNames,
  labelAlignment = 'left',
}: ProgressBarProps) {
  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <div
        className={twMerge(
          'relative w-full rounded-full overflow-hidden bg-gray-100 h-10',
          classNames?.container
        )}
      >
        <div
          className={twMerge(
            'flex flex-col basis-1 items-center justify-center rounded-full h-full transition-all duration-300 ease-out bg-blue-500',
            classNames?.bar
          )}
          style={{
            width: `${progress}%`,
          }}
        >
          <p className={twMerge('text-white', classNames?.label)}>
            {customLabel || `${progress}%`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;
