'use client';

import React from 'react';
import { CheckFullIcon, CheckEmptyIcon } from '../../icons';

// type

// Context
interface StepperContextProps {
  currentStep?: number; // current step
  maxIndex?: number;
  nextHandler?: () => void;
  prevHandler?: () => void;
  setMaxIndex?: (max: number) => void;
  stepHandler?: (index: number) => void;
  isStepClickable?: (index: number) => boolean;
  onFinish?: { execute?: () => void; panel?: React.ReactElement }; // what can stepper does when it finish
  stepChangePanel?: boolean; // true - click on step change the panel, false = don't
  stepFreeClicking?: boolean; // true = user can click only to steps greater or lesser than 1 from currentStep
  completeIcon?: React.ReactNode;
  pendingIcon?: React.ReactNode;
}

// setting initial values to context
export const StepperContext = React.createContext<StepperContextProps>({
  currentStep: 1,
  maxIndex: 0,
  onFinish: { execute: () => {}, panel: <div /> },
  stepChangePanel: true,
  completeIcon: <CheckFullIcon className="w-10 h-10" />,
  pendingIcon: <CheckEmptyIcon className="w-10 h-10 stroke-black" />,
});

// Context provider
interface StepperProviderProps {
  children: React.ReactNode;
  initialCurrentStep?: number;
  onFinish?: { execute?: () => void; panel?: React.ReactElement };
  stepChangePanel?: boolean;
  stepFreeClicking?: boolean;
  completeIcon?: React.ReactNode;
  pendingIcon?: React.ReactNode;
}

export function StepperContextProvider({
  children,
  initialCurrentStep = 0,
  onFinish = { execute: () => {}, panel: <div /> },
  stepChangePanel = true,
  stepFreeClicking = false,
  completeIcon = (
    <CheckFullIcon className="w-10 h-10 stroke-black fill-transparent" />
  ),
  pendingIcon = (
    <div className="w-10 h-10 flex justify-center items-center">
      <CheckEmptyIcon className="w-4 h-4 fill-slate-300" />
    </div>
  ),
}: StepperProviderProps) {
  // states
  const [currentStep, setCurrentStep] =
    React.useState<number>(initialCurrentStep);
  const [maxIndex, setMaxIndex] = React.useState<number>(0);

  // go to next step
  const nextHandler = () => {
    // If is in the last step and there are onFinish function and panel, execute the function and go to next panel
    if (currentStep === maxIndex - 1 && onFinish?.execute && onFinish?.panel) {
      onFinish.execute();
      setCurrentStep(currentStep + 1);
    }
    // if is in the last step and there is an onfinish function, only execute it
    else if (currentStep === maxIndex - 1 && onFinish?.execute) {
      onFinish.execute();
    }
    // if is in the last step and is a onFinish panel, just show it
    else if (currentStep === maxIndex - 1 && onFinish?.panel) {
      setCurrentStep(currentStep + 1);
    }
    // if is possible, continue
    else if (currentStep < maxIndex - 1) setCurrentStep(currentStep + 1);
  };

  // go to previous step, can't go to 0 or less step
  const prevHandler = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // can user click it
  const isStepClickable = (to: number) =>
    stepChangePanel &&
    !stepFreeClicking &&
    (currentStep === to - 1 || currentStep === to + 1);

  // go to a specific panel
  const stepHandler = (index: number) => {
    // if is free to change, go
    if (stepChangePanel && stepFreeClicking) {
      setCurrentStep(index);
    }
    // if is not free, check if next panelIndex greater or lesser by 1, else, do nothing
    else if (isStepClickable(index)) {
      setCurrentStep(index);
    }
  };

  const value = React.useMemo(
    () => ({
      currentStep,
      maxIndex,
      prevHandler,
      nextHandler,
      setMaxIndex,
      isStepClickable,
      stepHandler,
      stepChangePanel,
      stepFreeClicking,
      onFinish,
      completeIcon,
      pendingIcon,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentStep, maxIndex, stepChangePanel, stepFreeClicking, completeIcon]
  );

  return (
    <StepperContext.Provider value={value}>{children}</StepperContext.Provider>
  );
}
