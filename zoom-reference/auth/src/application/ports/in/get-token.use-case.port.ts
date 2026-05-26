import type { SystemContext } from '../out/system-key-service.port';

export interface GetTokenParams {
	userId: string;
	sessionId: string;
	email: string;
	emailVerified: boolean;
	systemContext: SystemContext;
	sessionCreatedAt: Date;
	correlationId: string;
}

// Inbound port — re-mints a system-scoped ES256 JWT from an authenticated session.
// Implemented by GetTokenUseCase in application/use-cases/.
export abstract class GetTokenUseCasePort {
	abstract execute(params: GetTokenParams): Promise<{ token: string }>;
}
