'use client';

import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TSelectClasses {
  buttonClasses?: string;
  listClasses?: string;
  upDownIconClasses?: string;
  hoverOptionClasses?: string;
  textListClasses?: string;
}

export type TList = {
  name: string;
};

interface SelectProps {
  list: TList[];
  showSelectedIcon?: boolean;
  classes?: TSelectClasses;
}
/**
 * Default Lisbox.Button tailwindcss classes
 */
const listboxButtonDefaultClasses =
  'relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm';

const listboxOptionDefaultClasses =
  'relative cursor-default select-none py-2 pl-10 pr-4';

const defaultTextColor = 'text-gray-900';

const defaultHoverClasses = 'bg-gray-200';
/**
 * Default ChevronUpDownIcon tailwindcss classes
 */
const upDownIconDefaultClasses = 'h-5 w-5 text-gray-400';

export default function Select({
  list,
  classes = {
    buttonClasses: '',
    listClasses: '',
    upDownIconClasses: '',
    hoverOptionClasses: '',
    textListClasses: '',
  },
  showSelectedIcon = true,
}: SelectProps) {
  const [value, setValue] = React.useState(list[0]);

  return (
    <Listbox value={value} onChange={setValue}>
      <div className="relative mt-1">
        <Listbox.Button
          className={`${
            classes?.buttonClasses
              ? twMerge(listboxButtonDefaultClasses, classes?.buttonClasses)
              : listboxButtonDefaultClasses
          }`}
        >
          <span className="block truncate">{value?.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className={`${
                classes?.upDownIconClasses
                  ? twMerge(
                      upDownIconDefaultClasses,
                      classes?.upDownIconClasses
                    )
                  : upDownIconDefaultClasses
              }`}
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Listbox.Options className="z-50 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
          {list.map((person, personIdx) => (
            <Listbox.Option
              key={personIdx}
              className={({ active }) =>
                `${
                  classes?.listClasses
                    ? twMerge(listboxOptionDefaultClasses, classes?.listClasses)
                    : listboxOptionDefaultClasses
                } ${
                  active
                    ? twMerge(defaultHoverClasses, classes?.hoverOptionClasses)
                    : twMerge(defaultTextColor, classes?.textListClasses)
                }`
              }
              value={person}
            >
              {({ selected }) => (
                <>
                  <span className="block truncate">{person.name}</span>
                  {selected && showSelectedIcon ? (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}
