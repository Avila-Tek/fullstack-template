/* eslint-disable no-nested-ternary */

'use client';

import React from 'react';
import { AlertCircleIcon, HelpCircleIcon } from '../../icons';
import { cn } from '../../utils/cn';

export interface TInputClasses {
  additionalLabelClasses?: string | null;
  className?: string | null;
}

interface Divider {
  leftDivider?: boolean;
  rightDivider?: boolean;
}
interface Select {
  leftSelect?: any;
  rightSelect?: any;
}

export interface InputProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  label?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  divider?: Divider;
  select?: Select;
  suffix?: string;
  classes?: TInputClasses | null | any;
  register?: any;
  error?: string;
  inputSize?: 'sm' | 'md';
  helpIcon?: boolean;
  hintText?: string;
}

function Input({
  label = '',
  rightIcon,
  leftIcon,
  divider,
  select,
  register,
  name,
  classes,
  placeholder,
  error,
  onChange,
  inputSize = 'md',
  helpIcon = false,
  hintText,
  ...props
}: InputProps) {
  const { additionalLabelClasses = '', className = '' } = classes ?? {};

  // Function that prevents numeric values from changing on scroll
  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    if (props?.type === 'number') {
      event.currentTarget.blur();
    }
  };

  // Function that removes the first default value 0 when writing
  const handleClick = (
    event: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    const inputElement = event.currentTarget as HTMLInputElement;
    const currentValue = inputElement.value;
    if (currentValue === '0') {
      inputElement.value = '';
      const _event = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(_event);
    }
  };

  return (
    <label htmlFor={name} className="w-full p-0 m-0">
      {label !== '' ? (
        <span
          className={cn(
            'text-sm font-medium text-text-secondary-700 flex flex-row mb-[6px]',
            additionalLabelClasses
          )}
        >
          {label}
          {props?.required ? (
            <p className="ml-[2px] text-text-brand-600">*</p>
          ) : null}
        </span>
      ) : null}
      <div
        className={cn(
          `flex flex-row w-full border rounded-lg placeholder:text-text-placeholder items-center shadow-sm overflow-hidden text-text-primary-900 ${
            props?.disabled ? 'bg-gray-100 text-gray-500' : ''
          }`,
          inputSize === 'sm' ? 'h-10' : 'h-11',
          error
            ? 'border-error-300 focus-within:ring-2 focus-within:ring-error-600'
            : 'border-primary focus-within:ring-2 focus-within:ring-brand-500'
        )}
      >
        {props.prefix || leftIcon ? (
          <div
            className={`flex items-center pl-3 h-full bg-transparent ${
              divider?.leftDivider ? 'border-r border-gray-200 pr-3' : ''
            }`}
          >
            {props.prefix ? (
              <span className="text-slate-600 font-medium">{props.prefix}</span>
            ) : null}
            {leftIcon ? <div>{leftIcon}</div> : null}
          </div>
        ) : null}
        {select?.leftSelect ? (
          <select
            disabled={props?.disabled}
            name={select?.leftSelect?.name}
            value={select?.rightSelect?.selectedOption}
            onChange={select?.rightSelect?.setSelectedOption}
            className="flex border-0 focus:border-0 active:border-0 focus:ring-0 active:ring-0 m-0 min-w-min max-w-max bg-transparent"
          >
            {select?.leftSelect?.options?.map((option: any) => (
              <option key={option?.value} value={option?.value}>
                {option?.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          onClick={handleClick}
          inputMode={
            props?.type === 'number'
              ? props?.step === 'any'
                ? 'decimal'
                : 'numeric'
              : 'text'
          }
          type={props.type}
          onWheel={handleWheel}
          placeholder={placeholder}
          className={cn(
            `w-full h-full px-3 m-0 border-0 bg-transparent focus:border-0 focus:ring-0`,
            className
          )}
          onChange={onChange}
          name={name}
          {...register}
          {...props}
        />
        {helpIcon && !error ? (
          <HelpCircleIcon className="size-4 min-w-4 text-fg-quinary-400 mr-3" />
        ) : null}
        {error ? (
          <AlertCircleIcon className="size-4 min-w-4 text-error-600 mr-3" />
        ) : null}
        {select?.rightSelect ? (
          <select
            disabled={props?.disabled}
            name={select?.rightSelect?.name}
            value={select?.rightSelect?.selectedOption}
            onChange={select?.rightSelect?.setSelectedOption}
            className="flex border-0 focus:border-0 active:border-0 focus:ring-0 active:ring-0 m-0 min-w-min max-w-max bg-transparent"
          >
            {select?.rightSelect?.options?.map((option: any) => (
              <option key={option?.value} value={option?.value}>
                {option?.name}
              </option>
            ))}
          </select>
        ) : null}
        {props.suffix || rightIcon ? (
          <div
            className={`flex items-center pr-3 h-full bg-transparent ${
              divider?.rightDivider ? 'border-l border-gray-200 pl-3' : ''
            }`}
          >
            {props.suffix ? (
              <span className="text-slate-600 font-medium">{props.suffix}</span>
            ) : null}
            {rightIcon ? <div>{rightIcon}</div> : null}
          </div>
        ) : null}
      </div>
      {error || hintText ? (
        <span
          className={cn(
            `text-sm mt-[6px] ${
              error ? 'text-error-600' : 'text-text-tertiary-600'
            }`,
            className
          )}
        >
          {error ?? hintText}
        </span>
      ) : null}
      <style>{`
      input[type='number']::-webkit-outer-spin-button,
      input[type='number']::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type='number'] {
        -moz-appearance: textfield;
      }
    `}</style>
    </label>
  );
}

export default Input;
