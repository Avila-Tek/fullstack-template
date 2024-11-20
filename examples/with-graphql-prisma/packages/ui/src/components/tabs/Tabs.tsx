'use client';

import { Tab } from '@headlessui/react';
import React from 'react';
import { cn } from '../../utils/cn';

interface TabsProps {
  classNames?: {
    tabList?: string;
    tab?: string;
    tabPanel?: string;
  };
  tabs: Array<{ key?: string; name?: string; content?: React.ReactNode }>;
}

export default function Tabs({
  classNames = {
    tabList: '',
    tab: '',
    tabPanel: '',
  },
  tabs = [
    {
      key: '',
      name: '',
      content: null,
    },
  ],
}: TabsProps) {
  return (
    <Tab.Group>
      <Tab.List
        className={cn(
          'flex md:flex-row flex-col space-x-1 rounded-xl bg-light-bg-secondary-alt dark:bg-dark-bg-secondary-alt p-1 border border-light-border-secondary dark:border-dark-utility-gray-100',
          classNames?.tabList
        )}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab?.key}
            className={({ selected }) =>
              cn(
                'w-full rounded-lg py-2.5 text-sm font-semibold leading-5 focus:outline-none',
                selected
                  ? 'bg-light-bg-primary-alt dark:bg-dark-bg-primary-alt text-light-text-secondary dark:text-dark-text-secondary shadow'
                  : 'text-light-text-quaternary dark:text-dark-text-quaternary hover:text-light-text-quaternary/70 dark:hover:text-dark-text-quaternary/70',
                classNames?.tab
              )
            }
          >
            {tab?.name}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className={cn('mt-8', classNames?.tabPanel)}>
        {tabs.map((tab, idx) => (
          <Tab.Panel
            key={idx}
            className="rounded-xl bg-primary dark:bg-dark-bg-primary-alt p-3 focus:outline-none"
          >
            {tab?.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
