import type { TProfileMeOutput } from '@zoom/schemas';

export abstract class GetProfileMeUseCasePort {
	abstract execute(userId: string): Promise<TProfileMeOutput>;
}
