export abstract class SessionRepositoryPort {
	abstract revokeAllForUser(userId: string): Promise<number>;
}
