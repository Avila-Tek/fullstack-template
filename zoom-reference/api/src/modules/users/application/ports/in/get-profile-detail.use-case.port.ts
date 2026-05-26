import type { TProfileDetailResponse } from '@zoom/schemas';

export abstract class GetProfileDetailUseCasePort {
	abstract execute(userId: string): Promise<TProfileDetailResponse>;
}
