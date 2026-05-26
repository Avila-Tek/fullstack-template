import type {
	TResolveEditLookupsInput,
	TResolveEditLookupsOutput,
} from '@zoom/schemas';

export abstract class ResolveEditLookupsUseCasePort {
	abstract execute(
		input: TResolveEditLookupsInput,
	): Promise<TResolveEditLookupsOutput>;
}
