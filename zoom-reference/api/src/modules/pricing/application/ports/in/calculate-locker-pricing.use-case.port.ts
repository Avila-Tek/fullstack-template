import type {
	TCalculateLockerPricingCommand,
	TLockerPricingResponse,
} from '@zoom/schemas';

/**
 * Internal command — extends the wire command with two server-injected
 * fields: `bcvRate` (parsed from the orchestrator's `x-bcv-rate` header)
 * and `originCityId` (resolved from the authenticated user's billing
 * address). Defined here in the port layer because neither is
 * cross-service information.
 *
 * The use case converts `declaredValueUsd` → Bs internally — controllers
 * don't convert.
 */
export type TCalculateLockerPricingInternalCommand =
	TCalculateLockerPricingCommand & {
		bcvRate: number;
		originCityId: string;
	};

export abstract class CalculateLockerPricingUseCasePort {
	abstract execute(
		cmd: TCalculateLockerPricingInternalCommand,
	): Promise<TLockerPricingResponse>;
}
