import type { TGetReturnTypesOutput } from '@zoom/schemas';

export abstract class GetReturnTypesUseCasePort {
	abstract execute(): Promise<TGetReturnTypesOutput>;
}
