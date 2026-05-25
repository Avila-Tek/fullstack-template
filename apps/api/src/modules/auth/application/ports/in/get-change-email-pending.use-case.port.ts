import type { TChangeEmailPendingResponse } from '@zoom/schemas';

export abstract class GetChangeEmailPendingUseCasePort {
	abstract execute(userId: string): Promise<TChangeEmailPendingResponse>;
}
