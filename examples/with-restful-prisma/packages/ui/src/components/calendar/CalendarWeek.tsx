import React from 'react';
import { CalendarType, weekDays } from './data';

interface CalendarWeekProps {
  type?: CalendarType;
}

export default function CalendarWeek({ type = 'default' }: CalendarWeekProps) {
  return (
    <div className={`grid grid-cols-7 ${type === 'default' ? '' : 'border-b'}`}>
      {weekDays.map((day, index) => (
        <div
          className={`flex justify-center items-center h-6 md:h-8 ${
            type === 'default' ? '' : 'w-full'
          }`}
          key={index}
        >
          <p className="text-neutral-400 text-[14px]">{day}</p>
        </div>
      ))}
    </div>
  );
}
