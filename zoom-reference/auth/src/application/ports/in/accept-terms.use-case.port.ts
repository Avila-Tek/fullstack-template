import type { TTermsAcceptanceResponse } from '@zoom/schemas';

export interface AcceptTermsInput {
	userId: string;
	systemId: string;
	sessionId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
}

export abstract class AcceptTermsUseCasePort {
	abstract execute(input: AcceptTermsInput): Promise<TTermsAcceptanceResponse>;
}
