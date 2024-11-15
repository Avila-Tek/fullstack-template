import React from 'react';
import { Tab } from '@headlessui/react';

interface StepperPanelProps {
  children: React.ReactNode;
}

export default function StepperPanel({ children }: StepperPanelProps) {
  return <Tab.Panel>{children}</Tab.Panel>;
}
