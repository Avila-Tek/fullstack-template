import type { TEditContextResponse } from '@zoom/schemas';

export abstract class GetEditContextUseCasePort {
	abstract execute(userId: string): Promise<TEditContextResponse>;
}
