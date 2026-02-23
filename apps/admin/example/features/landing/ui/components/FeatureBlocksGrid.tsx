import { LayoutDashboard, Sparkles, TrendingUp } from 'lucide-react';
import * as React from 'react';
import { FeatureBlockCard } from './FeatureBlockCard';

const featureBlocks = [
  {
    title: 'Crea y organiza tus hábitos',
    description:
      'Define tus hábitos diarios y organízalos por momento del día. Sin distracciones.',
    icon: LayoutDashboard,
  },
  {
    title: 'Sigue tu progreso al instante',
    description:
      'Marca lo completado cada día y visualiza tu racha y avance de forma clara.',
    icon: TrendingUp,
  },
  {
    title: 'Empieza gratis, crece cuando quieras',
    description:
      'Plan gratuito con hábitos limitados. Desbloquea ilimitados cuando lo necesites.',
    icon: Sparkles,
  },
];

export function FeatureBlocksGrid(): React.ReactElement {
  return (
    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
      {featureBlocks.map((block) => (
        <FeatureBlockCard
          key={block.title}
          title={block.title}
          description={block.description}
          icon={block.icon}
        />
      ))}
    </div>
  );
}
