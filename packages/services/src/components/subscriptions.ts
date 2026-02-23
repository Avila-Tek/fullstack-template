import { subscriptionDTO, type TSubscribeInput } from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type {
  HttpClient,
  HttpRequestOptions,
  InferEnvelopeData,
} from '../http';

// Infer success data types from schemas
type SubscribeSuccessData = InferEnvelopeData<
  typeof subscriptionDTO.subscribeResponse
>;
type CurrentSubscriptionSuccessData = InferEnvelopeData<
  typeof subscriptionDTO.currentSubscriptionResponse
>;

/**
 * SubscriptionsService - Subscription operations
 *
 * Uses HttpClient with optional schema for automatic:
 * - Zod schema validation
 * - API envelope unwrapping ({ success, data, error } -> data)
 * - Consistent error handling
 */
export class SubscriptionsService {
  private readonly basePath = '/v1/subscriptions';

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Subscribe to a plan (free or paid)
   * Requires authentication
   */
  async subscribe(
    input: TSubscribeInput,
    options?: HttpRequestOptions
  ): Promise<Safe<SubscribeSuccessData>> {
    return await this.httpClient.post(
      `${this.basePath}/subscribe`,
      input,
      undefined,
      { ...options, unwrapEnvelope: false },
      subscriptionDTO.subscribeResponse
    );
  }

  /**
   * Get the current user's subscription
   * Requires authentication
   */
  async getCurrentSubscription(
    options?: HttpRequestOptions
  ): Promise<Safe<CurrentSubscriptionSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}/current`,
      undefined,
      options,
      subscriptionDTO.currentSubscriptionResponse
    );
  }
}
