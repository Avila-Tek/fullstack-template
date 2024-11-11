import React from 'react';
import { Tooltip } from '@/src/components';
import { InformationIcon } from '../../icons';

export interface TextAreaClasses {
  labelContainerClasses?: string;
  labelClasses?: string;
  textareaClasses?: string;
}

export interface TextAreaProps
  extends React.DetailedHTMLProps<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  > {
  label?: string;
  personalizedClasses?: TextAreaClasses;
  required?: boolean;
  instructions?: string;
  helpText?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function _TextArea(
    {
      label = '',
      personalizedClasses = {},
      required = false,
      instructions = '',
      helpText = '',
      onChange,
      ...props
    },
    ref
  ) {
    const {
      labelContainerClasses = '',
      labelClasses = '',
      textareaClasses = '',
    } = personalizedClasses;

    return (
      <label className={`flex flex-col ${labelContainerClasses} gap-[6px] `}>
        <div className="flex items-center gap-[2px]">
          {label.length > 0 ? (
            <span className={`${labelClasses} text-sm text-secondary`}>
              {label}
            </span>
          ) : null}
          {required ? (
            <span className="text-sm text-brand-tertiary-600">*</span>
          ) : null}

          {instructions ? (
            <Tooltip tooltip={instructions}>
              <InformationIcon className="size-4 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </Tooltip>
          ) : null}
        </div>
        <textarea
          className={`${textareaClasses} max-w-full rounded-lg border border-primary placeholder:text-placeholder text-primary-900 font-normal bg-transparent focus:ring-0 focus:border-2 focus:border-brand`}
          ref={ref}
          onChange={onChange}
          {...props}
        />
        {helpText ? <p className="text-xs text-gray-500">{helpText}</p> : null}
      </label>
    );
  }
);
