export interface SessionDto {
	id: string;
	userId: string;
	createdAt: Date;
	expiresAt: Date;
	ipAddress: string | null;
	userAgent: string | null;
	activeOrganizationId: string | null;
}

export abstract class SessionRepositoryPort {
	abstract revokeAllForUser(userId: string): Promise<number>;
	abstract deleteById(sessionId: string): Promise<void>;
	abstract findByIdWithUser(sessionId: string): Promise<{
		session: { id: string; createdAt: Date; userId: string };
		sessionInvalidBefore: Date | null;
	} | null>;
	abstract findAllForUser(userId: string): Promise<SessionDto[]>;
}
