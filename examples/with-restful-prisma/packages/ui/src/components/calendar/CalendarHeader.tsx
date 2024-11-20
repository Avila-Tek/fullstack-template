import dayjs from 'dayjs';
/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { CalendarType, months } from './data';

interface CalendarHeaderProps {
  index: number;
  single?: boolean;
  month: number;
  year: number;
  nextMonth: () => void;
  prevMonth: () => void;
  type: CalendarType;
}

export default function CalendarHeader({
  index,
  single,
  month,
  year,
  nextMonth,
  prevMonth,
  type,
}: CalendarHeaderProps) {
  const disabled = !(
    month > dayjs().get('month') || year > dayjs().get('year')
  );
  return (
    <div className="flex justify-center items-center relative py-4">
      <h3 className="text-[20px] text-neutral-800 font-medium">
        {months[month]} <span className="text-primary-300">{year}</span>
      </h3>

      {index === 0 && type === 'default' ? (
        <button
          className="absolute top-1/2 -translate-y-1/2 left-0"
          type="button"
          onClick={() => prevMonth()}
          disabled={disabled}
        >
          <ChevronLeftIcon
            className={`size-6 ${
              disabled
                ? 'text-light-utility-gray-300'
                : 'hover:text-light-quaternary-hover text-light-fg-quaternary cursor-pointer'
            }`}
          />
        </button>
      ) : null}

      {type === 'default' ? (
        <button
          className={`absolute top-1/2 -translate-y-1/2 right-0 ${
            index !== 1 && !single ? 'md:hidden' : ''
          }`}
          type="button"
          onClick={() => nextMonth()}
        >
          <ChevronRightIcon
            className={`size-6 ${
              disabled
                ? 'text-light-utility-gray-300'
                : 'hover:text-light-quaternary-hover text-light-fg-quaternary cursor-pointer'
            }`}
          />
        </button>
      ) : null}
    </div>
  );
}
