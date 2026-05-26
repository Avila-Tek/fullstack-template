// Outbound port — decouples use cases from system key resolution.
// Implemented by DrizzleSystemKeyAdapter in infrastructure/system-key/.

// Full resolution returned by the adapter (includes status for suspended check).
export interface SystemKeyResolution {
	systemId: string;
	// Better Auth organization ID
	organizationId: string;
	accessModel: 'open' | 'restricted';
	// Used as JWT aud claim
	apiBaseUrl: string;
	// Middleware returns 401 when status === 'suspended'
	status: 'active' | 'suspended';
}

// Safe subset attached to req.systemContext after the suspended check passes.
// Consumers can rely on the system being active.
export interface SystemContext {
	systemId: string;
	organizationId: string;
	accessModel: 'open' | 'restricted';
	apiBaseUrl: string;
}

export abstract class SystemKeyPort {
	abstract resolveSystemId(key: string): Promise<SystemKeyResolution | null>;
}
