import { viewPlansRoutes } from '../../domain/viewPlans.constants';
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
    const checkoutUrl = `${viewPlansRoutes.checkout}?planId=${plan.id}`;
    deps.navigate(checkoutUrl);
    return {
      plan,
      requiresPayment: true,
      redirectUrl: checkoutUrl,
    };
  }

  // Free plan - go directly to dashboard
  deps.navigate(viewPlansRoutes.dashboard);
  return {
    plan,
    requiresPayment: false,
    redirectUrl: viewPlansRoutes.dashboard,
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
