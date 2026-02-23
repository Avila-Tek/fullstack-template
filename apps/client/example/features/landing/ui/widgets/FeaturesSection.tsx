import * as React from 'react';
import { FeatureBlocksGrid } from '../components/FeatureBlocksGrid';
import { ValuePropsGrid } from '../components/ValuePropsGrid';

export function FeaturesSection(): React.ReactElement {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:py-20 bg-surface"
      aria-labelledby="features-heading"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-solid opacity-10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-brand-solid opacity-10 blur-[60px] pointer-events-none" />

      <div className="relative container mx-auto max-w-6xl space-y-20">
        <h2
          id="features-heading"
          className="text-3xl font-bold text-center txt-primary-900 sm:text-4xl"
        >
          Todo lo que necesitas para construir mejores hábitos
        </h2>

        <FeatureBlocksGrid />

        <div>
          <h3 className="text-center text-2xl font-bold txt-primary-900 mb-10">
            Por qué HabitFlow
          </h3>
          <ValuePropsGrid />
        </div>
      </div>
    </section>
  );
}
