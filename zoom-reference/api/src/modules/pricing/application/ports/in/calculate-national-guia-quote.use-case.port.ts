import type {
	TCalculateNationalPricingCommand,
	TNationalPricingResponse,
} from '@zoom/schemas';

/**
 * Internal command type — extends the wire command with `bcvRate` (parsed
 * from the orchestrator's `x-bcv-rate` header by the controller). Defined
 * here in the port layer because `bcvRate` is *not* cross-service information:
 * clients never send it, only the API sees it.
 *
 * The use case is responsible for converting `declaredValueUsd` → Bs
 * internally — controllers don't convert.
 */
export type TCalculateNationalPricingInternalCommand =
	TCalculateNationalPricingCommand & {
		bcvRate: number;
	};

export abstract class CalculateNationalGuiaQuoteUseCasePort {
	abstract execute(
		cmd: TCalculateNationalPricingInternalCommand,
	): Promise<TNationalPricingResponse>;
}
