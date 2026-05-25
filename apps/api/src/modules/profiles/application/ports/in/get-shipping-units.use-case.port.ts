import type { TGetShippingUnitsOutput } from '@zoom/schemas';

export abstract class GetShippingUnitsUseCasePort {
	abstract execute(): Promise<TGetShippingUnitsOutput>;
}
