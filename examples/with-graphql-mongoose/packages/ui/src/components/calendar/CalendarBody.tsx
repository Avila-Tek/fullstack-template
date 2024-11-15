import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import DateButton from './DateButton';
import { CalendarType } from './data';

interface CalendarBodyProps {
  selectedDates: Dayjs[];
  unavailableDates?: Dayjs[];
  month: number;
  year: number;
  selectDate: (date: Dayjs) => void;
  type?: CalendarType;
}

const getMonthDays = (month: number, year: number): (Dayjs | null)[] => {
  let date = dayjs(`${year}-${month + 1}-01`);
  // Fill array
  const days = [];
  for (let i = 0; i < date.get('day'); i += 1) days.push(null);
  while (date.get('month') === month) {
    days.push(date);
    date = date.add(1, 'day');
  }
  return days;
};

export default function CalendarBody({
  selectedDates,
  unavailableDates,
  month,
  year,
  selectDate,
  type,
}: CalendarBodyProps) {
  const dates = getMonthDays(month, year);
  return (
    <section
      className={`grid grid-cols-7 gap-x-0 ${
        type === 'default' ? 'gap-y-1' : ''
      }`}
    >
      {dates.map((date, index) => (
        <DateButton
          key={`date-button-${year}-${month}-${index}`}
          date={date}
          selectedDates={selectedDates}
          unavailableDates={unavailableDates}
          selectDate={selectDate}
          type={type}
        />
      ))}
    </section>
  );
}
