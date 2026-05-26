import type {
	TNationalQuoteLimitsQuery,
	TNationalQuoteLimitsResponse,
} from '@zoom/schemas';

/**
 * Internal query — extends the wire query with `bcvRate` parsed from the
 * orchestrator's `x-bcv-rate` header. The use case computes Bs bounds
 * against the insurance rule and projects to USD before returning the
 * wire-shaped response.
 */
export type TGetNationalQuoteLimitsInternalQuery = TNationalQuoteLimitsQuery & {
	bcvRate: number;
};

export abstract class GetNationalQuoteLimitsUseCasePort {
	abstract execute(
		query: TGetNationalQuoteLimitsInternalQuery,
	): Promise<TNationalQuoteLimitsResponse>;
}
