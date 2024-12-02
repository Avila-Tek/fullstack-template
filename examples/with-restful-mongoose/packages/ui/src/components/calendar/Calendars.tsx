import dayjs, { Dayjs } from 'dayjs';
import React from 'react';
import Calendar from './Calendar';

interface CalendarsProps {
  single?: boolean;
  unavailableDates?: Dayjs[];
  selectedDates: Dayjs[];
  setSelectedDates: React.Dispatch<React.SetStateAction<Dayjs[]>>;
  fetchDateRecords?: (start: Date, end: Date) => Promise<void>;
}

export default function Calendars({
  single = false,
  unavailableDates = [],
  selectedDates,
  setSelectedDates,
  fetchDateRecords,
}: CalendarsProps) {
  const [dates, setDates] = React.useState<{
    startDate: dayjs.Dayjs | null;
    endDate: dayjs.Dayjs | null;
  }>({
    startDate: dayjs(),
    endDate: dayjs(),
  });
  const firstDate = dayjs();
  const secondDate = dayjs().add(1, 'month');

  const [firstMonthFetched, setFirstMonthFetched] = React.useState(false);
  const [firstMonth, setFirstMonth] = React.useState(firstDate.get('month'));
  const [secondMonth, setSecondMonth] = React.useState(secondDate.get('month'));
  const [firstYear, setFirstYear] = React.useState(firstDate.get('year'));
  const [secondYear, setSecondYear] = React.useState(secondDate.get('year'));

  // Functions
  const nextMonth = () => {
    setFirstYear(firstMonth === 11 ? firstYear + 1 : firstYear);
    setSecondYear(secondMonth === 11 ? secondYear + 1 : secondYear);
    setFirstMonth((firstMonth + 1) % 12);
    setSecondMonth((secondMonth + 1) % 12);
  };
  const prevMonth = () => {
    setFirstYear(firstMonth === 0 ? firstYear - 1 : firstYear);
    setSecondYear(secondMonth === 0 ? secondYear - 1 : secondYear);
    setFirstMonth((firstMonth - 1 + 12) % 12);
    setSecondMonth((secondMonth - 1 + 12) % 12);
  };

  const getDayjsDate = (month: number, year: number) =>
    dayjs().set('month', month).set('year', year);

  React.useEffect(() => {
    async function fetchFirstMonth() {
      const start = getDayjsDate(firstMonth, firstYear).startOf('month');
      const end = getDayjsDate(firstMonth, firstYear).endOf('month');
      await fetchDateRecords?.(start.toDate(), end.toDate());
      setFirstMonthFetched(true);
    }
    fetchFirstMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (firstMonthFetched) {
      const start = getDayjsDate(secondMonth, secondYear).startOf('month');
      const end = getDayjsDate(secondMonth, secondYear).endOf('month');
      fetchDateRecords?.(start.toDate(), end.toDate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondMonth, secondYear, firstMonthFetched]);

  // start and end date selection handler
  const handleSelectDate = (date: dayjs.Dayjs) => {
    if (!dates.startDate) {
      let _date = date;
      if (dates.endDate?.isBefore(date)) {
        _date = dates.endDate;
        setDates((prev) => ({ ...prev, endDate: date }));
      }
      return setDates((prev) => ({ ...prev, startDate: _date }));
    }
    if (dates.startDate.isSame(date)) {
      return setDates((prev) => ({ ...prev, startDate: null }));
    }
    if (dates.endDate?.isSame(date)) {
      return setDates((prev) => ({ ...prev, endDate: null }));
    }
    if (dates.startDate.isAfter(date) && !!dates.endDate) {
      return setDates((prev) => ({ ...prev, startDate: date }));
    }
    if (dates.startDate.isAfter(date) && !dates.endDate) {
      setDates((prev) => ({ ...prev, endDate: dates.startDate }));
      return setDates((prev) => ({ ...prev, startDate: date }));
    }
    if (dates.startDate.isBefore(date)) {
      return setDates((prev) => ({ ...prev, endDate: date }));
    }
  };

  React.useEffect(() => {
    if (dates.startDate && !dates.endDate) setSelectedDates([dates.startDate]);
    if (!dates.startDate && dates.endDate) setSelectedDates([dates.endDate]);
    if (dates.startDate && dates.endDate) {
      let date = dates.startDate;
      const _dates = [];
      while (!date.isAfter(dates.endDate)) {
        _dates.push(date);
        date = date.add(1, 'day');
      }
      setSelectedDates(_dates);
    }
  }, [dates]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: single ? 1 : 2 }).map((_, i) => (
        <Calendar
          key={`calendar-${i}`}
          index={i}
          month={i === 0 ? firstMonth : secondMonth}
          year={i === 0 ? firstYear : secondYear}
          nextMonth={nextMonth}
          prevMonth={prevMonth}
          selectedDates={selectedDates}
          unavailableDates={unavailableDates}
          selectDate={handleSelectDate}
        />
      ))}
    </div>
  );
}
