import { routeBuilders } from '@/src/shared/routes/routes';
import type { Plan, SelectPlanResult } from '../../domain/viewPlans.model';

interface SelectPlanDependencies {
  navigate: (url: string) => void;
}

export function selectPlan(
  plan: Plan,
  deps: SelectPlanDependencies
): SelectPlanResult {
  const requiresPayment = !plan.isFree;

  if (requiresPayment) {
    // Pass only planId in URL - plan details will be fetched by ID
    const checkoutUrl = routeBuilders.subscribe({ planId: plan.id });
    deps.navigate(checkoutUrl);
    return {
      plan,
      requiresPayment: true,
      redirectUrl: checkoutUrl,
    };
  }

  // Free plan - go to subscribe page so the API creates the subscription and currentUser is updated
  const subscribeUrl = routeBuilders.subscribe({ planId: plan.id });
  deps.navigate(subscribeUrl);
  return {
    plan,
    requiresPayment: false,
    redirectUrl: subscribeUrl,
  };
}

export function useSelectPlan(navigate: (url: string) => void) {
  return {
    select: (plan: Plan) =>
      selectPlan(plan, {
        navigate,
      }),
  };
}
