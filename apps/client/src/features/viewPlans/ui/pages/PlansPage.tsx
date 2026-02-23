import React from 'react';
import { PlanSelector } from '../widgets/PlanSelector';

export default function PlansPage(): React.ReactElement {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <PlanSelector />
    </div>
  );
}
