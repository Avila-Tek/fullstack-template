import { planDTO, type TPlanIdParams } from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type {
  HttpClient,
  HttpRequestOptions,
  InferEnvelopeData,
} from '../http';

// Infer success data types from schemas
type ListPlansCatalogSuccessData = InferEnvelopeData<
  typeof planDTO.listPlansCatalogResponse
>;
type GetPlanByIdSuccessData = InferEnvelopeData<
  typeof planDTO.getPlanByIdResponse
>;

/**
 * PlansService - Plan operations
 *
 * Uses HttpClient with optional schema for automatic:
 * - Zod schema validation
 * - API envelope unwrapping ({ success, data, error } -> data)
 * - Consistent error handling
 */
export class PlansService {
  private readonly basePath = '/v1/plans';

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get the public plans catalog (no authentication required)
   */
  async listCatalog(
    options?: HttpRequestOptions
  ): Promise<Safe<ListPlansCatalogSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}`,
      undefined,
      {
        ...options,
        authorization: false,
        unwrapEnvelope: false, // Plans catalog returns data directly without envelope
      },
      planDTO.listPlansCatalogResponse
    );
  }

  /**
   * Get a plan by ID (no authentication required)
   */
  async getPlanById(
    planId: TPlanIdParams['planId'],
    options?: HttpRequestOptions
  ): Promise<Safe<GetPlanByIdSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}/${planId}`,
      undefined,
      {
        ...options,
        authorization: false,
      },
      planDTO.getPlanByIdResponse
    );
  }
}
