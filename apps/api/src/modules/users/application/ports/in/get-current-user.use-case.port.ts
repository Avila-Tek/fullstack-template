import type { TCurrentUserResponse } from '@zoom/schemas';

export abstract class GetCurrentUserUseCasePort {
	abstract execute(userId: string): Promise<TCurrentUserResponse>;
}
