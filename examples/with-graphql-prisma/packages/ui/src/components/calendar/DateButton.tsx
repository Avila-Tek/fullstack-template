import React from 'react';
import dayjs from 'dayjs';
import { CalendarType } from './data';
import { getMetadata, getStyles } from './utils';

interface DateButtonProps {
  date: dayjs.Dayjs | null;
  selectedDates: Array<dayjs.Dayjs>;
  unavailableDates?: Array<dayjs.Dayjs>;
  selectDate: (date: dayjs.Dayjs) => void;
  type?: CalendarType;
}

export default function DateButton({
  date,
  selectedDates,
  unavailableDates = [],
  selectDate,
  type,
}: DateButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function handleSmallHeight() {
      if (ref.current && ref.current.className.includes('w-full')) {
        ref.current.style.height = `${ref.current.clientWidth}px`;
      }
    }
    window.addEventListener('resize', handleSmallHeight);
    handleSmallHeight();
  }, []);

  if (!date) return <div />;

  const metadata = getMetadata(date, selectedDates, unavailableDates);
  const { buttonStyle, textStyle } = getStyles(date, type, metadata);
  const isPreviousDate = date.isBefore(dayjs(), 'day');

  const targetClass = `date-button-${date?.toISOString()}`;

  return (
    <button
      id={targetClass}
      type="button"
      ref={ref}
      disabled={isPreviousDate || metadata.isUnavailable}
      className={`${buttonStyle} ${targetClass}`}
      onClick={(e) => {
        e.preventDefault();
        selectDate(date);
      }}
    >
      <div className={`${textStyle} ${targetClass}`}>
        <p className={`text-xs md:text-[16px] ${targetClass}`}>
          {date?.get('date') ?? ''}
        </p>
      </div>
    </button>
  );
}
