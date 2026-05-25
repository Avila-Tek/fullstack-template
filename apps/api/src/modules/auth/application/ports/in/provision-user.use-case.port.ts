import type { TProvisionUserOutput } from '@zoom/schemas';

export abstract class ProvisionUserUseCasePort {
	abstract execute(email: string): Promise<TProvisionUserOutput>;
}
