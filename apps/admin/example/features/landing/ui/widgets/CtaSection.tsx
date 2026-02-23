import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';

export function CtaSection(): React.ReactElement {
  return (
    <section
      className="relative overflow-hidden px-4 py-16 sm:py-20"
      aria-labelledby="cta-heading"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full bg-brand-solid opacity-20 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto max-w-2xl text-center space-y-8">
        <h2
          id="cta-heading"
          className="text-3xl font-bold txt-primary-900 sm:text-4xl"
        >
          ¿Listo para construir rutinas consistentes?
        </h2>
        <Button asChild size="lg" variant="cta">
          <Link href={routeBuilders.signup()}>Empezar gratis</Link>
        </Button>
      </div>
    </section>
  );
}
