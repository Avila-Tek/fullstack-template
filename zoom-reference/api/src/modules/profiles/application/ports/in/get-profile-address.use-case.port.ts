import type { TGetProfileAddressOutput } from '@zoom/schemas';

export abstract class GetProfileAddressUseCasePort {
	abstract execute(userId: string): Promise<TGetProfileAddressOutput>;
}
