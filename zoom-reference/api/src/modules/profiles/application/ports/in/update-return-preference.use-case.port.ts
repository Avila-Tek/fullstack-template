import type {
	TGetReturnDataOutput,
	TUpdateReturnDataInput,
} from '@zoom/schemas';

export abstract class UpdateReturnPreferenceUseCasePort {
	abstract execute(
		userId: string,
		input: TUpdateReturnDataInput,
	): Promise<TGetReturnDataOutput>;
}
