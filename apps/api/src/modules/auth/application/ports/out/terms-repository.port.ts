export interface ActiveTermsRecord {
	id: string;
	version: string;
	title: string;
	content: string;
	effectiveAt: Date;
}

export abstract class TermsRepositoryPort {
	/** Find active terms by system ID. Returns null if none found or on cache miss + DB miss. */
	abstract findActiveBySystemId(
		systemId: string,
	): Promise<ActiveTermsRecord | null>;

	/** Find a terms record by its primary key. Returns null if not found. */
	abstract findById(
		systemTermsId: string,
	): Promise<{ id: string; version: string } | null>;
}
