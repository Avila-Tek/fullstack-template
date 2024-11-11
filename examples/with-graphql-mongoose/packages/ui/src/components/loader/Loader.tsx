import React from 'react';
import { SpinnerIcon } from '../../icons';
import { cn } from '../../utils/cn';

interface LoadingProps {
  className?: {
    spinner?: string;
    container?: string;
  };
}

function Loader({ className = {} }: LoadingProps) {
  return (
    <div
      className={` w-full flex justify-center  ${
        className?.container ?? 'h-screen'
      }`}
    >
      <div className="flex h-full opacity-70 z-30 pb-44  m-auto">
        <SpinnerIcon
          className={cn(
            `m-auto w-24 h-24 animate-spin text-gray-200 fill-black-300`,
            className?.spinner ?? ''
          )}
        />
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export default Loader;
