import type { TGetReturnDataOutput } from '@zoom/schemas';

export abstract class GetReturnPreferenceUseCasePort {
	abstract execute(userId: string): Promise<TGetReturnDataOutput>;
}
