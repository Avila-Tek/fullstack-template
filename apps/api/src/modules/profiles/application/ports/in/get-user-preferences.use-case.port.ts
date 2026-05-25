import type { TGetPreferencesOutput } from '@zoom/schemas';

export abstract class GetUserPreferencesUseCasePort {
	abstract execute(userId: string): Promise<TGetPreferencesOutput>;
}
