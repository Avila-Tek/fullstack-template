import dayjs, { Dayjs } from 'dayjs';

function isContained(date: Dayjs, arr: Array<Dayjs>) {
  const contained = arr.some((d) => date.isSame(d, 'day'));
  return contained;
}

export function getMetadata(
  date: Dayjs,
  selectedDates: Array<Dayjs>,
  unavailableDates: Array<Dayjs>
) {
  const isSelected = isContained(date, selectedDates);
  const isUnavailable = isContained(date, unavailableDates);

  let isFirstSelected = false;
  let isLastSelected = false;
  if (isSelected) {
    isFirstSelected = !isContained(date.add(-1, 'day'), selectedDates);
    isLastSelected = !isContained(date.add(1, 'day'), selectedDates);
  }

  let isFirstUnavailable = false;
  let isLastUnavailable = false;
  if (isUnavailable) {
    isFirstUnavailable = !isContained(date.add(-1, 'day'), unavailableDates);
    isLastUnavailable = !isContained(date.add(1, 'day'), unavailableDates);
  }

  return {
    isSelected,
    isFirstSelected,
    isLastSelected,
    isUnavailable,
    isFirstUnavailable,
    isLastUnavailable,
  };
}

function detectThreshold(metadata: any) {
  return metadata.isFirstSelected || metadata.isLastSelected;
}

export function getStyles(date: Dayjs, type: any, metadata: any) {
  const buttonStyle = getButtonStyle(date, type, metadata);
  const textStyle = getTextStyle(date, type, metadata);
  return { buttonStyle, textStyle };
}

function getButtonStyle(date: Dayjs, type: any, metadata: any) {
  const isThreshold = detectThreshold(metadata);
  const isPreviousDate = date.isBefore(dayjs(), 'day');
  const { isSelected, isFirstSelected, isLastSelected, isUnavailable } =
    metadata;

  let style = 'flex justify-center items-center w-full';

  const weekDay = date.get('day');

  // Type style
  if (type === 'default') style += ' md:w-12 md:h-12';
  if (type === 'grid') {
    style += ' hover:bg-neutral-100 transition-colors duration-300';
    if (!isPreviousDate) {
      style += ' border-[0.5px] border-neutral-300';
    } else {
      style += ' border-[0.5px] border-neutral-200';
    }
  }
  if (!isThreshold && type === 'default') {
    if (weekDay === 0) style += ' rounded-l-lg';
    if (weekDay === 6) style += ' rounded-r-lg';
  }

  // Metadata style
  if (isSelected) style += ' bg-light-bg-brand-primary';
  if (isFirstSelected) {
    if (type === 'default') style += ' rounded-l-full';
    if (type === 'grid') style += ' rounded-l-lg';
  }
  if (isLastSelected) {
    if (type === 'default') style += ' rounded-r-full';
    if (type === 'grid') style += ' rounded-r-lg';
  }
  if (isUnavailable) {
    style += ' bg-neutral-200 hover:bg-neutral-200';
  }

  return style;
}

function getTextStyle(date: Dayjs, type: any, metadata: any) {
  const { isSelected, isUnavailable } = metadata;
  const isThreshold = detectThreshold(metadata);
  const isPreviousDate = date.isBefore(dayjs(), 'day');

  let style = 'flex justify-center items-center h-full w-full';

  if (type === 'grid') style += ' transition-all duration-300';

  if (isSelected && type === 'grid') {
    style += ' bg-light-bg-brand-solid text-white rounded-xl';
  }

  if (isThreshold) {
    style += ' bg-light-bg-brand-solid text-white';
    if (type === 'default') style += ' rounded-full';
    if (type === 'grid') style += ' rounded-xl';
  }

  if (isPreviousDate) style += ' text-neutral-200';
  else if (isUnavailable)
    style += ' text-neutral-400 relative line-through decoration-neutral-500';
  else style += ' text-neutral-700';

  return style;
}
