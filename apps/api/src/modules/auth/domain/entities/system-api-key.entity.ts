// SystemApiKey — represents one API key record for a registered system.
// Immutable: rotation is handled by SystemRepositoryPort.rotateKey (DB transaction).

export interface SystemApiKeyProps {
	id: string;
	systemId: string;
	keyHash: string;
	keyPrefix: string;
	createdAt: Date;
	revokedAt: Date | null;
}

export class SystemApiKey {
	readonly id: string;
	readonly systemId: string;
	/** SHA-256 hex of the raw key — never exposed outside this aggregate. */
	readonly keyHash: string;
	/** First 8 characters of the raw key — safe to display. */
	readonly keyPrefix: string;
	readonly createdAt: Date;
	/** NULL = active. Non-null = revoked (rotation or deactivation). */
	readonly revokedAt: Date | null;

	private constructor(props: SystemApiKeyProps) {
		this.id = props.id;
		this.systemId = props.systemId;
		this.keyHash = props.keyHash;
		this.keyPrefix = props.keyPrefix;
		this.createdAt = props.createdAt;
		this.revokedAt = props.revokedAt;
	}

	get isActive(): boolean {
		return this.revokedAt === null;
	}

	static reconstitute(props: SystemApiKeyProps): SystemApiKey {
		return new SystemApiKey(props);
	}
}
