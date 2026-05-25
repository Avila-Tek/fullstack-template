import type { TTermsAcceptanceStatusResponse } from '@zoom/schemas';

export interface GetTermsAcceptanceStatusInput {
	userId: string;
	systemId: string;
}

export abstract class GetTermsAcceptanceStatusUseCasePort {
	abstract execute(
		input: GetTermsAcceptanceStatusInput,
	): Promise<TTermsAcceptanceStatusResponse>;
}
