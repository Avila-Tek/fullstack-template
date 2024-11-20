import React from 'react';

import { Disclosure } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';
import { ChevronDownIcon, ChevronUpIcon } from '../../icons';

type TListItem = {
  name: string;
  description: string;
};

type ClassNames = {
  accordionClassName?: string;
  buttonClassName?: string;
  panelClassName?: string;
  iconClassName?: string;
};

interface AccordionProps {
  list: TListItem[];
  classNames?: ClassNames;
  iconButtonOpen?: React.ReactNode;
  iconButtonClose?: React.ReactNode;
}

const accordionDefaultClasses =
  'mx-auto flex flex-col gap-y-2 w-full rounded-2xl bg-white p-2';

const accordionButtonDefaultClasses =
  'flex w-full justify-between rounded-lg  px-4 py-2 text-left text-sm font-medium text-black';

const accordionPanelDefaultClasses = 'px-4 pb-2 pt-4 text-sm text-black';

const accordionIconDefaultClasses = 'h-5 w-5 text-black';

export default function Accordion({
  list,
  classNames = {},
  iconButtonClose,
  iconButtonOpen,
}: AccordionProps) {
  return (
    <div
      className={`${twMerge(
        accordionDefaultClasses,
        classNames?.accordionClassName
      )}`}
      data-testid="Accordion"
    >
      {list.map((item, index) => (
        <Disclosure key={index}>
          {({ open }) => (
            <>
              <Disclosure.Button
                className={`${twMerge(
                  accordionButtonDefaultClasses,
                  classNames?.buttonClassName
                )}`}
              >
                <span>{item.name}</span>
                {open
                  ? iconButtonOpen || (
                      <ChevronUpIcon
                        className={`${twMerge(
                          accordionIconDefaultClasses,
                          classNames?.iconClassName
                        )}`}
                      />
                    )
                  : iconButtonClose || (
                      <ChevronDownIcon
                        className={`${twMerge(
                          accordionIconDefaultClasses,
                          classNames?.iconClassName
                        )}`}
                      />
                    )}
              </Disclosure.Button>
              <Disclosure.Panel
                className={`${twMerge(
                  accordionPanelDefaultClasses,
                  classNames?.panelClassName
                )}`}
              >
                {item.description}
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
