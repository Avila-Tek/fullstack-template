import type { Plan } from '../domain/viewPlans.model';
import type { ViewPlansApi } from './viewPlans.interfaces';
import { toPlansCatalogDomain } from './viewPlans.transform';

export class ViewPlansServiceClass {
  constructor(private api: ViewPlansApi) {}

  async getPlansCatalog(): Promise<Plan[]> {
    const result = await this.api.getPlansCatalog();
    if (!result.success) {
      throw new Error(result.error);
    }
    return toPlansCatalogDomain(result.data.plans);
  }
}
