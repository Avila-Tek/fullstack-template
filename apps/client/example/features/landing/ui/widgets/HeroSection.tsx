import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';

export function HeroSection(): React.ReactElement {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:py-24"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-1/4 w-125 h-125 rounded-full bg-brand-solid opacity-30 blur-[100px]" />
        <div className="absolute -bottom-32 -left-20 w-100 h-100 rounded-full bg-brand-solid opacity-40 blur-[80px]" />
      </div>

      <div className="relative z-10 container mx-auto max-w-4xl text-center space-y-8">
        <h1
          id="hero-heading"
          className="text-4xl font-bold tracking-tight txt-primary-900 sm:text-5xl lg:text-6xl"
        >
          Mejora tus hábitos, un día a la vez
        </h1>
        <p className="text-lg sm:text-xl txt-secondary-700 max-w-2xl mx-auto">
          Convierte la intención en acción con una herramienta simple y visual
          para crear rutinas y seguir tu progreso.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" variant="cta">
            <Link href={routeBuilders.signup()}>Empezar gratis</Link>
          </Button>
          <Button asChild size="lg" variant="cta_outline">
            <Link href={routeBuilders.plans()}>Ver planes</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
