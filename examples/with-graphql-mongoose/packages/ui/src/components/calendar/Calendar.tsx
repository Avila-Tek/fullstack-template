import React from 'react';
import { Dayjs } from 'dayjs';
import CalendarHeader from './CalendarHeader';
import CalendarBody from './CalendarBody';
import CalendarWeek from './CalendarWeek';
import { CalendarType } from './data';

interface CalendarProps {
  index?: number;
  single?: boolean;
  selectedDates: Array<Dayjs>;
  unavailableDates?: Array<Dayjs>;
  month: number;
  year: number;
  selectDate?: (date: Dayjs) => void;
  nextMonth?: () => void;
  prevMonth?: () => void;
  type?: CalendarType;
}

export default function Calendar({
  index = 0,
  single,
  selectedDates,
  unavailableDates,
  month,
  year,
  nextMonth = () => {},
  prevMonth = () => {},
  selectDate = () => 0,
  type = 'default',
}: CalendarProps) {
  return (
    <div className="rounded-md bg-white p-4 pt-2">
      <CalendarHeader
        index={index}
        single={single}
        month={month}
        year={year}
        nextMonth={nextMonth}
        prevMonth={prevMonth}
        type={type}
      />
      <CalendarWeek type={type} />
      <CalendarBody
        selectedDates={selectedDates}
        unavailableDates={unavailableDates}
        month={month}
        year={year}
        selectDate={selectDate}
        type={type}
      />
    </div>
  );
}
