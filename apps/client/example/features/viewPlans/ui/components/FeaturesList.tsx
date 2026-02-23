import * as React from 'react';
import { FeatureList } from '@/src/shared/ui/components/FeatureList';
import { getAllFeatures } from '../../domain/viewPlans.logic';
import type { Plan } from '../../domain/viewPlans.model';

interface FeaturesListProps {
  plan: Plan;
}

function FeaturesList({ plan }: FeaturesListProps): React.ReactElement {
  const features = getAllFeatures(plan);
  return <FeatureList features={features} />;
}

export default FeaturesList;
