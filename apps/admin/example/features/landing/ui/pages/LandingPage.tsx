import * as React from 'react';
import { CtaSection } from '../widgets/CtaSection';
import { FeaturesSection } from '../widgets/FeaturesSection';
import { HeroSection } from '../widgets/HeroSection';
import { LandingFooter } from '../widgets/LandingFooter';

export function LandingPage(): React.ReactElement {
  return (
    <React.Fragment>
      <HeroSection />
      <FeaturesSection />
      <CtaSection />
      <LandingFooter />
    </React.Fragment>
  );
}
