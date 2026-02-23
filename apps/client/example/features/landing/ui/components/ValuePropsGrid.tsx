import { LayoutDashboard, Sparkles, Target, Zap } from 'lucide-react';
import * as React from 'react';
import { ValuePropCard } from './ValuePropCard';

const valueProps = [
  {
    text: 'Interfaz simple y minimalista',
    icon: LayoutDashboard,
  },
  {
    text: 'Diseñado para mantener la motivación',
    icon: Zap,
  },
  {
    text: 'Rutinas sostenibles a largo plazo',
    icon: Target,
  },
  {
    text: 'Modelo freemium: empieza sin compromiso',
    icon: Sparkles,
  },
];

export function ValuePropsGrid(): React.ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {valueProps.map((item) => (
        <ValuePropCard key={item.text} text={item.text} icon={item.icon} />
      ))}
    </div>
  );
}
